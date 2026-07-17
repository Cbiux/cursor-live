"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  Radio,
  Sparkles,
} from "lucide-react";
import type { Question, ResponseValue } from "@/lib/slides";
import {
  DEFAULT_AUDIENCE_JOIN_PROMPT,
  DEFAULT_AUDIENCE_WAITING_HEADLINE,
  DEFAULT_AUDIENCE_WAITING_PROMPT,
} from "@/lib/slides";
import { joinRoom, sendResponse, useRoom } from "@/lib/use-room";
import { usePreferences } from "@/lib/preferences";

function getParticipantId() {
  const saved = window.localStorage.getItem("cursor-live-participant");
  if (saved) return saved;
  const id = crypto.randomUUID();
  window.localStorage.setItem("cursor-live-participant", id);
  return id;
}

function emptyValue(question: Question): ResponseValue {
  return question.type === "ranking" ? [] : "";
}

export function AudienceExperience({ code }: { code: string }) {
  const { t } = usePreferences();
  const { data, error } = useRoom(code, 1500);
  const [participantId] = useState(() =>
    typeof window === "undefined" ? "" : getParticipantId(),
  );
  const [name, setName] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem("cursor-live-name") ?? ""),
  );
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<ResponseValue>("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  const questions = data?.questions ?? [];
  const question = questions[step];
  const rank = Array.isArray(value) ? value : [];

  const enter = async () => {
    if (!participantId) return;
    const clean = name.trim() || t("audience.anonymous");
    setJoining(true);
    setMessage("");
    try {
      await joinRoom({ code, participantId, name: clean });
      setName(clean);
      window.localStorage.setItem("cursor-live-name", clean);
      setJoined(true);
      setStep(0);
      setDone(false);
      if (questions[0]) setValue(emptyValue(questions[0]));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : t("audience.retry"));
    } finally {
      setJoining(false);
    }
  };

  const chooseRank = (option: string) => {
    if (rank.includes(option)) {
      setValue(rank.filter((item) => item !== option));
    } else if (rank.length < 3) {
      setValue([...rank, option]);
    }
  };

  const displayName = name.trim() || t("audience.anonymous");

  const canSubmit =
    question?.type === "ranking"
      ? rank.length === 3
      : value !== "";

  const submit = async () => {
    if (!question || !canSubmit || sending) return;
    setSending(true);
    setMessage("");
    try {
      await sendResponse({
        code,
        participantId,
        name: displayName,
        slideId: question.id,
        value,
      });
      if (step >= questions.length - 1) {
        setDone(true);
      } else {
        const next = step + 1;
        setStep(next);
        setValue(emptyValue(questions[next]));
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : t("audience.retry"));
    } finally {
      setSending(false);
    }
  };

  if (!data) {
    return (
      <main className="mobile-shell center-screen">
        <LoaderCircle className="spin" />
        <p>{error || t("audience.connecting")}</p>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="mobile-shell name-screen">
        <div className="brand-mark">
          <Sparkles size={16} />
          {data.room.title}
        </div>
        <p className="eyebrow">
          {t("audience.room")} {code}
        </p>
        <h1>{t("audience.enterName")}</h1>
        <p className="mobile-prompt">
          {data.room.audienceJoinPrompt?.trim() ||
            DEFAULT_AUDIENCE_JOIN_PROMPT}
        </p>
        <input
          className="text-input name-input"
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 24))}
          placeholder={t("audience.namePlaceholder")}
          autoFocus
          maxLength={24}
          onKeyDown={(event) => {
            if (event.key === "Enter") void enter();
          }}
        />
        <button
          className="submit-button"
          disabled={joining}
          onClick={() => void enter()}
        >
          {joining ? (
            <>
              <LoaderCircle className="spin" size={18} /> {t("audience.entering")}
            </>
          ) : (
            <>
              {t("audience.enter")} <ArrowRight size={18} />
            </>
          )}
        </button>
        {message && <p className="response-message error">{message}</p>}
      </main>
    );
  }

  if (!data.room.presenting) {
    return (
      <main className="mobile-shell waiting-screen">
        <div className="brand-mark">
          <Radio size={16} />
          {t("audience.ready")}
        </div>
        <p className="eyebrow">
          {t("audience.hello")} {displayName.toUpperCase()}
        </p>
        <h1>
          {data.room.audienceWaitingHeadline?.trim() ||
            DEFAULT_AUDIENCE_WAITING_HEADLINE}
        </h1>
        <p className="muted">
          {data.room.audienceWaitingPrompt?.trim() ||
            DEFAULT_AUDIENCE_WAITING_PROMPT}
        </p>
        <div className="lobby-count">
          <strong>{data.participants.length}</strong>
          <span>{t("audience.inRoom")}</span>
        </div>
      </main>
    );
  }

  if (done || !questions.length) {
    return (
      <main className="mobile-shell waiting-screen">
        <div className="brand-mark">
          <Check size={16} />
          {t("audience.ready")}
        </div>
        <p className="eyebrow">
          {t("audience.thanks")} {displayName.toUpperCase()}
        </p>
        <h1>{t("audience.doneTitle")}</h1>
        <p className="muted">{t("audience.doneCopy")}</p>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="mobile-shell center-screen">
        <LoaderCircle className="spin" />
        <p>{t("audience.loadingQuestions")}</p>
      </main>
    );
  }

  return (
    <main className="mobile-shell response-screen">
      <div className="mobile-topbar">
        <span className="live-pill">
          <Radio size={13} /> {displayName}
        </span>
        <span>
          {step + 1} / {questions.length}
        </span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${((step + 1) / questions.length) * 100}%` }}
        />
      </div>

      <p className="eyebrow">{data.room.title}</p>
      <h1>{question.title}</h1>
      <p className="mobile-prompt">{question.prompt}</p>

      {question.type === "word-cloud" && (
        <input
          className="text-input"
          value={String(value)}
          onChange={(event) => setValue(event.target.value.slice(0, 20))}
          placeholder={t("audience.oneWord")}
          autoFocus
        />
      )}

      {question.type === "open" && (
        <textarea
          className="text-input textarea"
          value={String(value)}
          onChange={(event) => {
            const words = event.target.value.trim().split(/\s+/).slice(0, 7);
            setValue(words.join(" "));
          }}
          placeholder={t("audience.yourAnswer")}
          rows={4}
          autoFocus
        />
      )}

      {question.type === "choice" && (
        <div className="option-list">
          {question.options?.map((option) => (
            <button
              className={`option-button ${value === option ? "selected" : ""}`}
              key={option}
              onClick={() => setValue(option)}
            >
              <span>{option}</span>
              {value === option && <Check size={18} />}
            </button>
          ))}
        </div>
      )}

      {question.type === "scale" && (
        <div className="scale-grid">
          {Array.from({ length: 11 }, (_, index) => (
            <button
              className={value === index ? "selected" : ""}
              key={index}
              onClick={() => setValue(index)}
            >
              {index}
            </button>
          ))}
        </div>
      )}

      {question.type === "ranking" && (
        <>
          <div className="rank-progress">
            {rank.length}/3 {t("audience.selected")}
          </div>
          <div className="option-list">
            {question.options?.map((option) => {
              const position = rank.indexOf(option);
              return (
                <button
                  className={`option-button ${position >= 0 ? "selected" : ""}`}
                  key={option}
                  onClick={() => chooseRank(option)}
                >
                  <span>{option}</span>
                  {position >= 0 && <b>{position + 1}</b>}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        className="submit-button"
        disabled={!canSubmit || sending}
        onClick={() => void submit()}
      >
        {sending ? (
          <>
            <LoaderCircle className="spin" size={18} /> {t("audience.sending")}
          </>
        ) : step >= questions.length - 1 ? (
          <>
            <Check size={18} /> {t("audience.finish")}
          </>
        ) : (
          <>
            {t("audience.next")} <ArrowRight size={18} />
          </>
        )}
      </button>
      {message && <p className="response-message error">{message}</p>}
    </main>
  );
}
