import { NextRequest, NextResponse } from "next/server";
import type { Question, ResponseValue } from "@/lib/slides";
import {
  hashHostKey,
  toPublicRoom,
  validateHostKeyInput,
} from "@/lib/host-auth";
import { parseQuestionsMarkdown } from "@/lib/questions-md";
import {
  claimOrVerifyHostKey,
  clearSession,
  createUniqueRoomCode,
  getAllResponses,
  getParticipants,
  getQuestions,
  getRoom,
  isPersistentStoreEnabled,
  normalizeCode,
  saveParticipant,
  saveQuestions,
  saveResponse,
  seedDemoResponses,
  importMarkdownResponses,
  setRoom,
} from "@/lib/store";

export const dynamic = "force-dynamic";

function cleanCode(value: string | null) {
  return normalizeCode(value ?? "") || "";
}

function authErrorResponse(
  result: { ok: false; error: string; status: number },
) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET(request: NextRequest) {
  const code = cleanCode(request.nextUrl.searchParams.get("code")) || "CURSORCR";
  const [room, participants, responsesBySlide, questions] = await Promise.all([
    getRoom(code),
    getParticipants(code),
    getAllResponses(code),
    getQuestions(code),
  ]);

  return NextResponse.json(
    {
      room: toPublicRoom(room),
      participants,
      responsesBySlide,
      questions,
      persistent: isPersistentStoreEnabled(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    kind?:
      | "join"
      | "respond"
      | "host"
      | "save-deck"
      | "create-room"
      | "import-md"
      | "import-questions";
    code?: string;
    participantId?: string;
    name?: string;
    slideId?: number;
    value?: ResponseValue;
    hostKey?: string;
    title?: string;
    questions?: Question[];
    markdown?: string;
    action?:
      | "start"
      | "stop"
      | "next"
      | "previous"
      | "set"
      | "reset"
      | "seed";
    targetIndex?: number;
    seedCount?: number;
  };

  if (body.kind === "create-room") {
    const keyError = validateHostKeyInput(body.hostKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 400 });
    }

    const requested = cleanCode(body.code ?? null);
    let code = requested;

    if (requested) {
      const existing = await getRoom(requested);
      if (existing.hostKeyHash) {
        return NextResponse.json(
          {
            error:
              "Ese código ya tiene dueño. Elige otro o deja vacío para generar uno.",
          },
          { status: 409 },
        );
      }
    } else {
      code = await createUniqueRoomCode();
    }

    const room = await setRoom(
      {
        title: body.title?.trim() || "Mi experiencia en vivo",
        presenting: false,
        carouselIndex: 0,
        hostKeyHash: hashHostKey(body.hostKey!),
      },
      code,
    );
    const questions = body.questions?.length
      ? await saveQuestions(body.questions, code)
      : await getQuestions(code);

    return NextResponse.json({
      ok: true,
      room: toPublicRoom(room),
      questions,
    });
  }

  const code = cleanCode(body.code ?? null);
  if (!code) {
    return NextResponse.json(
      { error: "Código de sala requerido." },
      { status: 400 },
    );
  }

  if (body.kind === "save-deck") {
    const keyError = validateHostKeyInput(body.hostKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 400 });
    }
    if (!body.questions?.length) {
      return NextResponse.json(
        { error: "Agrega al menos una pregunta." },
        { status: 400 },
      );
    }

    const auth = await claimOrVerifyHostKey(code, body.hostKey!, {
      allowClaim: true,
    });
    if (!auth.ok) return authErrorResponse(auth);

    if (body.title?.trim()) {
      await setRoom({ title: body.title.trim() }, code);
    }

    const questions = await saveQuestions(body.questions, code);
    const room = await getRoom(code);
    return NextResponse.json({
      ok: true,
      room: toPublicRoom(room),
      questions,
    });
  }

  if (body.kind === "import-md") {
    const keyError = validateHostKeyInput(body.hostKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 400 });
    }
    if (!body.markdown?.trim()) {
      return NextResponse.json(
        { error: "El archivo Markdown está vacío." },
        { status: 400 },
      );
    }

    const auth = await claimOrVerifyHostKey(code, body.hostKey!, {
      allowClaim: true,
    });
    if (!auth.ok) return authErrorResponse(auth);

    const result = await importMarkdownResponses({
      code,
      markdown: body.markdown,
      slideId: body.slideId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      room: toPublicRoom(await getRoom(code)),
      questions: await getQuestions(code),
    });
  }

  if (body.kind === "import-questions") {
    const keyError = validateHostKeyInput(body.hostKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 400 });
    }
    if (!body.markdown?.trim()) {
      return NextResponse.json(
        { error: "El archivo Markdown está vacío." },
        { status: 400 },
      );
    }

    let parsed;
    try {
      parsed = parseQuestionsMarkdown(body.markdown);
    } catch (cause) {
      return NextResponse.json(
        {
          error:
            cause instanceof Error
              ? cause.message
              : "No se pudo leer el Markdown de preguntas.",
        },
        { status: 400 },
      );
    }

    const existing = await getRoom(code);
    if (existing.hostKeyHash) {
      const auth = await claimOrVerifyHostKey(code, body.hostKey!, {
        allowClaim: false,
      });
      if (!auth.ok) return authErrorResponse(auth);
    } else {
      await setRoom(
        {
          title: parsed.title,
          presenting: false,
          carouselIndex: 0,
          hostKeyHash: hashHostKey(body.hostKey!),
        },
        code,
      );
    }

    if (body.title?.trim() || parsed.title) {
      await setRoom(
        { title: body.title?.trim() || parsed.title },
        code,
      );
    }

    const questions = await saveQuestions(parsed.questions, code);
    const room = await getRoom(code);

    return NextResponse.json({
      ok: true,
      room: toPublicRoom(room),
      questions,
      importedQuestions: questions.length,
    });
  }

  if (body.kind === "join") {
    if (!body.participantId || !body.name?.trim()) {
      return NextResponse.json(
        { error: "Escribe tu nombre para entrar." },
        { status: 400 },
      );
    }

    const participant = await saveParticipant({
      code,
      id: body.participantId,
      name: body.name,
    });
    return NextResponse.json({ ok: true, participant });
  }

  if (body.kind === "respond") {
    if (
      !body.participantId ||
      !body.name?.trim() ||
      !body.slideId ||
      body.value === undefined ||
      body.value === ""
    ) {
      return NextResponse.json(
        { error: "Respuesta incompleta." },
        { status: 400 },
      );
    }

    const room = await getRoom(code);
    if (!room.presenting) {
      return NextResponse.json(
        { error: "La experiencia aún no ha comenzado." },
        { status: 409 },
      );
    }

    const questions = await getQuestions(code);
    const allowed = questions.some((question) => question.id === body.slideId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Pregunta no válida." },
        { status: 400 },
      );
    }

    const record = await saveResponse({
      code,
      participantId: body.participantId,
      name: body.name,
      slideId: body.slideId,
      value: body.value,
    });
    return NextResponse.json({ ok: true, record });
  }

  if (body.kind === "host") {
    const keyError = validateHostKeyInput(body.hostKey);
    if (keyError) {
      return NextResponse.json({ error: keyError }, { status: 400 });
    }

    const auth = await claimOrVerifyHostKey(code, body.hostKey!, {
      allowClaim: body.action === "seed",
    });
    if (!auth.ok) return authErrorResponse(auth);

    const room = await getRoom(code);
    const questions = await getQuestions(code);
    const total = Math.max(questions.length, 1);
    let presenting = room.presenting;
    let carouselIndex = room.carouselIndex;

    if (body.action === "start") {
      presenting = true;
      carouselIndex = 0;
    }
    if (body.action === "stop") presenting = false;
    if (body.action === "next") {
      carouselIndex = (carouselIndex + 1) % total;
      presenting = true;
    }
    if (body.action === "previous") {
      carouselIndex = (carouselIndex - 1 + total) % total;
    }
    if (body.action === "set" && typeof body.targetIndex === "number") {
      carouselIndex = Math.max(0, Math.min(total - 1, body.targetIndex));
    }
    if (body.action === "reset") {
      await clearSession(code);
      return NextResponse.json({
        ok: true,
        room: toPublicRoom(await getRoom(code)),
        questions: await getQuestions(code),
      });
    }
    if (body.action === "seed") {
      const seeded = await seedDemoResponses({
        code,
        count: body.seedCount ?? 20,
      });
      return NextResponse.json({
        ok: true,
        room: toPublicRoom(await getRoom(code)),
        questions: await getQuestions(code),
        seeded,
      });
    }

    const next = await setRoom({ presenting, carouselIndex }, code);
    return NextResponse.json({ ok: true, room: toPublicRoom(next) });
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
