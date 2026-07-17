"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Expand,
  FileUp,
  LoaderCircle,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  HostKeyInput,
  readRoomHostKey,
  writeRoomHostKey,
} from "@/components/host-key-input";
import type { Question, ResponseRecord } from "@/lib/slides";
import {
  buildResponsesMdPrompt,
  RESPONSES_MD_EXAMPLE,
} from "@/lib/responses-md";
import {
  hostAction,
  importResponsesMd,
  responsesFor,
  useRoom,
} from "@/lib/use-room";

type Count = { label: string; count: number; score?: number };

function choiceCounts(question: Question, responses: ResponseRecord[]): Count[] {
  return (question.options ?? [])
    .map((label) => ({
      label,
      count: responses.filter((item) => item.value === label).length,
    }))
    .sort((a, b) => b.count - a.count);
}

function rankingCounts(
  question: Question,
  responses: ResponseRecord[],
): Count[] {
  return (question.options ?? [])
    .map((label) => {
      let score = 0;
      let count = 0;
      responses.forEach((response) => {
        if (!Array.isArray(response.value)) return;
        const position = response.value.indexOf(label);
        if (position >= 0) {
          score += 3 - position;
          count += 1;
        }
      });
      return { label, count, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function ResultBars({ values }: { values: Count[] }) {
  const max = Math.max(...values.map((item) => item.score ?? item.count), 1);
  return (
    <div className="result-bars">
      {values.map((item, index) => {
        const amount = item.score ?? item.count;
        return (
          <div className="bar-row" key={item.label}>
            <span className="bar-rank">{index + 1}</span>
            <div className="bar-copy">
              <div className="bar-label">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max((amount / max) * 100, amount ? 6 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WordCloud({ responses }: { responses: ResponseRecord[] }) {
  const words = new Map<string, number>();
  responses.forEach((response) => {
    if (typeof response.value !== "string") return;
    const word = response.value.trim();
    if (!word) return;
    const key = word.toLocaleLowerCase("es");
    words.set(key, (words.get(key) ?? 0) + 1);
  });
  const sorted = [...words.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, count]) => count), 1);

  return (
    <div className="word-cloud">
      {sorted.length ? (
        sorted.slice(0, 48).map(([word, count], index) => (
          <span
            key={word}
            className={index < 3 ? "featured" : ""}
            style={{ fontSize: `${1.25 + (count / max) * 3.4}rem` }}
          >
            {word}
          </span>
        ))
      ) : (
        <WaitingResults />
      )}
    </div>
  );
}

function ScaleResults({ responses }: { responses: ResponseRecord[] }) {
  const numbers = responses
    .map((item) => Number(item.value))
    .filter((value) => Number.isFinite(value));
  const average = numbers.length
    ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
    : 0;

  return (
    <div className="scale-results">
      <div className="average-number">
        {numbers.length ? average.toFixed(1) : "—"}
      </div>
      <div className="average-label">PROMEDIO DE LA SALA</div>
      <div className="scale-histogram">
        {Array.from({ length: 11 }, (_, index) => {
          const count = numbers.filter((value) => value === index).length;
          const max = Math.max(
            ...Array.from(
              { length: 11 },
              (_, bucket) =>
                numbers.filter((value) => value === bucket).length,
            ),
            1,
          );
          return (
            <div className="histogram-column" key={index}>
              <div
                className="histogram-bar"
                style={{
                  height: `${Math.max((count / max) * 100, count ? 8 : 2)}%`,
                }}
              />
              <span>{index}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpenResults({ responses }: { responses: ResponseRecord[] }) {
  const items = [...responses].reverse();
  if (!items.length) return <WaitingResults />;
  return (
    <div className="open-grid" aria-label={`${items.length} respuestas abiertas`}>
      {items.map((item, index) => (
        <div
          className={index < 2 ? "open-card featured" : "open-card"}
          key={`${item.participantId}-${item.createdAt}-${index}`}
        >
          <span className="open-name">{item.name}</span>
          <span className="open-value">{String(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function WaitingResults() {
  return (
    <div className="waiting-results">
      <span className="pulse-dot" />
      Esperando respuestas…
    </div>
  );
}

function FeedTicker({ responses }: { responses: ResponseRecord[] }) {
  const latest = [...responses].reverse().slice(0, 24);
  if (!latest.length) return null;
  return (
    <div className="feed-ticker">
      {latest.map((item, index) => (
        <span
          key={`${item.participantId}-${item.createdAt}-${index}`}
          className="feed-chip"
        >
          <b>{item.name}</b>
          <em>
            {Array.isArray(item.value) ? item.value[0] : String(item.value)}
          </em>
        </span>
      ))}
    </div>
  );
}

function responseLabel(count: number) {
  return count === 1 ? "1 respuesta" : `${count} respuestas`;
}

export function PresenterExperience({ code }: { code: string }) {
  const { data, error, refresh } = useRoom(code, 900);
  const [hostKey, setHostKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [joinUrl, setJoinUrl] = useState(`/join?code=${code}`);
  const [autoPlay, setAutoPlay] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHostKey(readRoomHostKey(code));
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  const questions = data?.questions ?? [];
  const carouselIndex = data?.room.carouselIndex ?? 0;
  const question = questions[carouselIndex] ?? questions[0];
  const responses = useMemo(
    () => (question ? responsesFor(data?.responsesBySlide, question.id) : []),
    [data?.responsesBySlide, question],
  );
  const values = useMemo(() => {
    if (!question) return [];
    return question.type === "ranking"
      ? rankingCounts(question, responses)
      : choiceCounts(question, responses);
  }, [question, responses]);
  const totalAnswers = Object.values(data?.responsesBySlide ?? {}).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  useEffect(() => {
    if (!data?.room.presenting || !autoPlay || questions.length < 2) return;
    const savedKey = readRoomHostKey(code);
    if (!savedKey) return;
    const timer = window.setInterval(() => {
      void hostAction({
        code,
        hostKey: readRoomHostKey(code),
        action: "next",
      }).then(() => refresh());
    }, 8000);
    return () => window.clearInterval(timer);
  }, [autoPlay, code, data?.room.presenting, questions.length, refresh]);

  const act = async (
    action: "start" | "stop" | "next" | "previous" | "set" | "reset" | "seed",
    targetIndex?: number,
    seedCount?: number,
  ) => {
    if (!hostKey.trim()) {
      setNotice("Escribe la clave de esta sala para gestionarla.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await hostAction({ code, hostKey, action, targetIndex, seedCount });
      writeRoomHostKey(code, hostKey);
      await refresh();
      if (action === "seed") {
        setNotice(`Prueba lista: ${seedCount ?? 20} respuestas demo.`);
      }
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? `${cause.message} Si no es tu sala, créala en Hostear.`
          : "No se pudo actualizar.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyAiPrompt = async () => {
    if (!question) return;
    const prompt = buildResponsesMdPrompt({
      count: 40,
      question,
      questions,
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setNotice("Prompt copiado. Pégalo en una IA y guarda la salida como .md");
    } catch {
      setNotice("No se pudo copiar el prompt.");
    }
  };

  const copyExampleMd = async () => {
    try {
      await navigator.clipboard.writeText(RESPONSES_MD_EXAMPLE);
      setNotice("Ejemplo .md copiado al portapapeles.");
    } catch {
      setNotice("No se pudo copiar el ejemplo.");
    }
  };

  const importMdFile = async (file: File) => {
    if (!hostKey.trim()) {
      setNotice("Escribe la clave de esta sala para importar.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const markdown = await file.text();
      const result = await importResponsesMd({
        code,
        hostKey,
        markdown,
        slideId: question?.id,
      });
      writeRoomHostKey(code, hostKey);
      await refresh();
      setNotice(
        `Importadas ${result.imported ?? 0}` +
          (result.skipped
            ? ` · ${result.skipped} omitidas`
            : "") +
          ".",
      );
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : "No se pudo importar el .md",
      );
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!data) {
    return (
      <main className="presenter-shell center-screen">
        <LoaderCircle className="spin" />
        <p>{error || "Preparando la experiencia…"}</p>
      </main>
    );
  }

  if (!data.room.presenting) {
    return (
      <main className="presenter-shell lobby-shell">
        <header className="presenter-header">
          <div className="event-brand">
            <Image
              src="/logo-source-dark.png"
              alt="Cursor"
              width={30}
              height={30}
              className="cursor-logo"
            />
            <span>{data.room.title}</span>
          </div>
          <div className="room-meta">
            <Link className="live-indicator" href={`/host?code=${code}`}>
              <Settings2 size={14} /> Editar preguntas
            </Link>
            <span className="live-indicator">
              <Users size={14} /> {data.participants.length} EN LA SALA
            </span>
          </div>
        </header>

        <section className="lobby-stage">
          <div>
            <p className="eyebrow">LOBBY</p>
            <h1>Escribe tu nombre y entra.</h1>
            <p className="stage-prompt">
              {questions.length} preguntas listas. Todos responden de una sola
              vez; aquí verás el carrusel de resultados.
            </p>
            <div className="join-card">
              <QRCodeSVG
                value={joinUrl}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
              <div>
                <span>ÚNETE EN TU TELÉFONO</span>
                <strong>{code}</strong>
                <small>{joinUrl.replace(/^https?:\/\//, "")}</small>
              </div>
            </div>
          </div>

          <div className="name-wall">
            {data.participants.length ? (
              data.participants.map((person) => (
                <span className="name-pill" key={person.id}>
                  {person.name}
                </span>
              ))
            ) : (
              <div className="waiting-results">
                <span className="pulse-dot" />
                Esperando nombres…
              </div>
            )}
          </div>
        </section>

        <footer className="presenter-controls">
          <div className="host-key">
            <HostKeyInput
              value={hostKey}
              onChange={setHostKey}
              placeholder="Clave de esta sala"
              className="host-key-field"
            />
          </div>
          <button
            className="play-control"
            onClick={() => void act("start")}
            disabled={busy || !questions.length}
          >
            <Play size={19} /> Comenzar
          </button>
          <Link href={`/host?code=${code}`} className="control-link">
            <Settings2 size={17} />
          </Link>
          <button onClick={() => void act("reset")} disabled={busy}>
            <RotateCcw size={17} />
          </button>
          {notice && <span className="control-notice">{notice}</span>}
        </footer>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="presenter-shell center-screen">
        <p>No hay preguntas. Edítalas en el panel del host.</p>
        <Link href={`/host?code=${code}`}>Ir a editar</Link>
      </main>
    );
  }

  return (
    <main className="presenter-shell">
      <header className="presenter-header">
        <div className="event-brand">
          <Image
            src="/logo-source-dark.png"
            alt="Cursor"
            width={30}
            height={30}
            className="cursor-logo"
          />
          <span>{data.room.title}</span>
        </div>
        <div className="room-meta">
          <span className="live-indicator active">
            <Radio size={14} /> CARRUSEL EN VIVO
          </span>
          <span>
            <Users size={15} /> {data.participants.length} personas
          </span>
          <span>{responseLabel(totalAnswers)}</span>
          <span>
            {carouselIndex + 1} / {questions.length}
          </span>
        </div>
      </header>

      <div className="carousel-dots">
        {questions.map((item, index) => (
          <button
            key={item.id}
            className={index === carouselIndex ? "dot active" : "dot"}
            onClick={() => void act("set", index)}
            aria-label={`Ir a pregunta ${index + 1}`}
          />
        ))}
      </div>

      <section className="stage carousel-stage" key={question.id}>
        <div className="question-column">
          <p className="eyebrow">PREGUNTA {carouselIndex + 1}</p>
          <h1>{question.title}</h1>
          {question.prompt && <p className="stage-prompt">{question.prompt}</p>}
          <p className="response-count">{responseLabel(responses.length)}</p>
          <FeedTicker responses={responses} />
        </div>

        <div className={`results-column type-${question.type}`}>
          {question.type === "word-cloud" && (
            <WordCloud responses={responses} />
          )}
          {question.type === "choice" && <ResultBars values={values} />}
          {question.type === "ranking" && <ResultBars values={values} />}
          {question.type === "scale" && <ScaleResults responses={responses} />}
          {question.type === "open" && <OpenResults responses={responses} />}
        </div>
      </section>

      <footer className="presenter-controls">
        <div className="host-key">
          <HostKeyInput
            value={hostKey}
            onChange={setHostKey}
            placeholder="Clave de esta sala"
            className="host-key-field"
          />
        </div>
        <div className="demo-seed" title="Llenar con respuestas de prueba">
          {[20, 50, 100].map((count) => (
            <button
              key={count}
              type="button"
              disabled={busy}
              onClick={() => void act("seed", undefined, count)}
            >
              {count}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy || !question}
          onClick={() => void copyAiPrompt()}
          title="Copiar prompt para que una IA genere el .md"
        >
          <ClipboardCopy size={16} /> Prompt
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void copyExampleMd()}
          title="Copiar ejemplo de formato .md"
        >
          Formato
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          title="Importar respuestas desde .md"
        >
          <FileUp size={16} /> .md
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importMdFile(file);
          }}
        />
        <button onClick={() => void act("previous")} disabled={busy}>
          <ChevronLeft size={20} />
        </button>
        <button
          className="play-control"
          onClick={() => setAutoPlay((value) => !value)}
        >
          {autoPlay ? <Pause size={19} /> : <Play size={19} />}
          {autoPlay ? "Auto" : "Manual"}
        </button>
        <button onClick={() => void act("next")} disabled={busy}>
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => document.documentElement.requestFullscreen?.()}
          title="Pantalla completa"
        >
          <Expand size={18} />
        </button>
        <button onClick={() => void act("stop")} disabled={busy}>
          Lobby
        </button>
        <Link href={`/host?code=${code}`} className="control-link">
          <Settings2 size={17} />
        </Link>
        <button onClick={() => void act("reset")} disabled={busy}>
          <RotateCcw size={17} />
        </button>
        {notice && <span className="control-notice">{notice}</span>}
      </footer>
    </main>
  );
}
