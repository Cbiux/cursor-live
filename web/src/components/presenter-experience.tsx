"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
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
  DEFAULT_LOBBY_HEADLINE,
  DEFAULT_LOBBY_PROMPT,
} from "@/lib/slides";
import { hostAction, responsesFor, useRoom } from "@/lib/use-room";

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
    const word = response.value
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ");
    if (!word) return;
    words.set(word, (words.get(word) ?? 0) + 1);
  });
  const sorted = [...words.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, count]) => count), 1);
  const density = sorted.length > 50 ? "dense" : sorted.length > 28 ? "compact" : "";
  const baseSize = sorted.length > 50 ? 0.72 : sorted.length > 28 ? 0.9 : 1.25;
  const scale = sorted.length > 50 ? 1.25 : sorted.length > 28 ? 2 : 3.4;
  const tilts = ["tilt-left-2", "tilt-right-1", "tilt-left-1", "tilt-right-2", "tilt-none"];

  return (
    <div className={`word-cloud ${density}`}>
      {sorted.length ? (
        sorted.map(([word, count], index) => (
          <span
            key={word}
            className={[
              index < 3 ? "featured" : "",
              count > 1 ? "repeated" : "",
              tilts[index % tilts.length],
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              fontSize: `${baseSize + (max > 1 ? Math.sqrt(count / max) * scale : 0)}rem`,
            }}
            title={`${count} ${count === 1 ? "respuesta" : "respuestas"}`}
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
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const items = useMemo(() => [...responses].reverse(), [responses]);
  if (!items.length) return <WaitingResults />;

  // Duplicate the track so the leftward loop feels continuous.
  const loop = items.length < 4 ? [...items, ...items, ...items] : [...items, ...items];
  const durationSeconds = Math.max(18, loop.length * 2.4);

  return (
    <div
      className={`open-grid ${paused || selectedCard ? "is-paused" : ""}`}
      aria-label={`${items.length} respuestas abiertas`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setSelectedCard(null);
      }}
    >
      <div
        className="open-track"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {loop.map((item, index) => {
          const key = `${item.participantId}-${item.createdAt}`;
          const selected = selectedCard === key;
          return (
            <button
              type="button"
              className={`open-card ${selected ? "featured selected" : ""}`}
              key={`${key}-${index}`}
              aria-pressed={selected}
              onClick={() =>
                setSelectedCard((current) => (current === key ? null : key))
              }
            >
              <span className="open-name">{item.name}</span>
              <span className="open-value">{String(item.value)}</span>
            </button>
          );
        })}
      </div>
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
  const [localPresenting, setLocalPresenting] = useState(false);
  const [localCarouselIndex, setLocalCarouselIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHostKey(readRoomHostKey(code));
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
      setLocalPresenting(false);
      setLocalCarouselIndex(0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (!data) return;
    if (data.room.presenting) {
      setLocalPresenting(true);
      setLocalCarouselIndex(data.room.carouselIndex);
    }
  }, [data]);

  const questions = data?.questions ?? [];
  const presenting = Boolean(data?.room.presenting || localPresenting);
  const carouselIndex = data?.room.presenting
    ? (data.room.carouselIndex ?? 0)
    : localCarouselIndex;
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
    if (!presenting || !autoPlay || questions.length < 2) return;
    const savedKey = readRoomHostKey(code);
    if (!savedKey) return;
    const timer = window.setInterval(() => {
      void hostAction({
        code,
        hostKey: readRoomHostKey(code),
        action: "next",
      })
        .then(() => {
          setLocalCarouselIndex((current) => (current + 1) % questions.length);
          return refresh();
        })
        .catch(() => {
          /* Ignore transient host/auth errors during autoplay. */
        });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [autoPlay, code, presenting, questions.length, refresh]);

  const act = async (
    action: "start" | "stop" | "next" | "previous" | "set" | "reset",
    targetIndex?: number,
  ) => {
    if (!hostKey.trim()) {
      setNotice("Escribe la clave de esta sala para gestionarla.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await hostAction({ code, hostKey, action, targetIndex });
      writeRoomHostKey(code, hostKey);
      if (action === "start") {
        setLocalPresenting(true);
        setLocalCarouselIndex(0);
      } else if (action === "stop" || action === "reset") {
        setLocalPresenting(false);
        setLocalCarouselIndex(0);
      } else if (action === "next") {
        setLocalCarouselIndex((current) =>
          questions.length ? (current + 1) % questions.length : 0,
        );
      } else if (action === "previous") {
        setLocalCarouselIndex((current) =>
          questions.length
            ? (current - 1 + questions.length) % questions.length
            : 0,
        );
      } else if (action === "set" && typeof targetIndex === "number") {
        setLocalCarouselIndex(targetIndex);
      }
      await refresh();
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : "No se pudo actualizar.",
      );
    } finally {
      setBusy(false);
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

  const lobbyHeadline =
    data.room.lobbyHeadline?.trim() || DEFAULT_LOBBY_HEADLINE;
  const singleWordHeadline = !/\s/.test(lobbyHeadline);
  const headlineCqw = Math.min(
    13,
    Math.max(6, 180 / Math.max(lobbyHeadline.length, 1)),
  );

  if (!presenting) {
    return (
      <main className="presenter-shell lobby-shell">
        <header className="presenter-header">
          <div className="event-brand">
            <Link href="/" className="brand-home" aria-label="Volver al inicio">
              <Image
                src="/logo-source-dark.png"
                alt="Cursor Live"
                width={30}
                height={30}
                className="cursor-logo"
              />
            </Link>
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
          <div className="lobby-copy">
            <p className="eyebrow">LOBBY</p>
            <h1
              className={singleWordHeadline ? "single-word" : undefined}
              style={{
                fontSize: `clamp(1.8rem, ${headlineCqw}cqw, 4.2rem)`,
              }}
            >
              {lobbyHeadline}
            </h1>
            <p className="stage-prompt">
              {data.room.lobbyPrompt?.trim() || DEFAULT_LOBBY_PROMPT}
            </p>
            <div className="join-card">
              <QRCodeSVG
                value={joinUrl}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                imageSettings={{
                  src: "/CUBE_2D_LIGHT.svg",
                  width: 30,
                  height: 34,
                  excavate: true,
                }}
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
          <Link href="/" className="brand-home" aria-label="Volver al inicio">
            <Image
              src="/logo-source-dark.png"
              alt="Cursor Live"
              width={30}
              height={30}
              className="cursor-logo"
            />
          </Link>
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
          {question.type !== "open" && <FeedTicker responses={responses} />}
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
