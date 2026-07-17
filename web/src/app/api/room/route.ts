import { NextRequest, NextResponse } from "next/server";
import type { Question, ResponseValue } from "@/lib/slides";
import {
  clearSession,
  generateRoomCode,
  getAllResponses,
  getParticipants,
  getQuestions,
  getRoom,
  isPersistentStoreEnabled,
  normalizeCode,
  saveParticipant,
  saveQuestions,
  saveResponse,
  setRoom,
} from "@/lib/store";

export const dynamic = "force-dynamic";

function cleanCode(value: string | null) {
  return normalizeCode(value ?? "CURSORCR") || "CURSORCR";
}

function assertHost(hostKey?: string) {
  const expectedKey = process.env.HOST_KEY;
  if (expectedKey && hostKey !== expectedKey) {
    return NextResponse.json(
      { error: "Clave de host incorrecta." },
      { status: 401 },
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  const code = cleanCode(request.nextUrl.searchParams.get("code"));
  const [room, participants, responsesBySlide, questions] = await Promise.all([
    getRoom(code),
    getParticipants(code),
    getAllResponses(code),
    getQuestions(code),
  ]);

  return NextResponse.json(
    {
      room,
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
    kind?: "join" | "respond" | "host" | "save-deck" | "create-room";
    code?: string;
    participantId?: string;
    name?: string;
    slideId?: number;
    value?: ResponseValue;
    hostKey?: string;
    title?: string;
    questions?: Question[];
    action?:
      | "start"
      | "stop"
      | "next"
      | "previous"
      | "set"
      | "reset";
    targetIndex?: number;
  };

  if (body.kind === "create-room") {
    const authError = assertHost(body.hostKey);
    if (authError) return authError;

    const code = cleanCode(body.code ?? generateRoomCode());
    const room = await setRoom(
      {
        title: body.title?.trim() || "Mi experiencia en vivo",
        presenting: false,
        carouselIndex: 0,
      },
      code,
    );
    const questions = body.questions?.length
      ? await saveQuestions(body.questions, code)
      : await getQuestions(code);

    return NextResponse.json({ ok: true, room, questions });
  }

  const code = cleanCode(body.code ?? null);

  if (body.kind === "save-deck") {
    const authError = assertHost(body.hostKey);
    if (authError) return authError;
    if (!body.questions?.length) {
      return NextResponse.json(
        { error: "Agrega al menos una pregunta." },
        { status: 400 },
      );
    }

    if (body.title?.trim()) {
      await setRoom({ title: body.title.trim() }, code);
    }

    const questions = await saveQuestions(body.questions, code);
    const room = await getRoom(code);
    return NextResponse.json({ ok: true, room, questions });
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
    const authError = assertHost(body.hostKey);
    if (authError) return authError;

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
        room: await getRoom(code),
        questions: await getQuestions(code),
      });
    }

    const next = await setRoom({ presenting, carouselIndex }, code);
    return NextResponse.json({ ok: true, room: next });
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
