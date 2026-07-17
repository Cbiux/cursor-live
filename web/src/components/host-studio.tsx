"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Copy,
  LoaderCircle,
  MonitorPlay,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  HostKeyInput,
  readRoomHostKey,
  writeRoomHostKey,
} from "@/components/host-key-input";
import {
  QUESTION_TYPE_LABELS,
  cloneQuestions,
  createEmptyQuestion,
  defaultQuestions,
  needsOptions,
  type Question,
  type QuestionType,
} from "@/lib/slides";
import { createRoom, saveDeck, useRoom } from "@/lib/use-room";
import { usePreferences } from "@/lib/preferences";

function newId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function HostStudio({ initialCode }: { initialCode: string }) {
  const { t } = usePreferences();
  const [code, setCode] = useState(initialCode);
  const { data, error, refresh } = useRoom(code, 2500);
  const [hostKey, setHostKey] = useState("");
  const [title, setTitle] = useState("Cursor Live");
  const [questions, setQuestions] = useState<Question[]>(
    cloneQuestions(defaultQuestions),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Solo carga la clave guardada de ESTA sala (no una global de otra).
      setHostKey(readRoomHostKey(code));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (!data || !code) return;
    const timer = window.setTimeout(() => {
      setTitle(data.room.title || "Mi experiencia en vivo");
      setQuestions(cloneQuestions(data.questions));
      if (data.room.hasHostKey && !readRoomHostKey(code)) {
        setMessage(
          "Esta sala ya tiene dueño. Escribe su clave para gestionarla, o deja el código vacío y pulsa Crear mi sala.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code, data]);

  const rememberKey = (nextCode: string, key: string) => {
    writeRoomHostKey(nextCode, key);
  };

  const updateQuestion = (id: number, patch: Partial<Question>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  };

  const changeType = (id: number, type: QuestionType) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== id) return question;
        const next = { ...question, type };
        if (needsOptions(type) && !next.options?.length) {
          next.options = ["Opción 1", "Opción 2", "Opción 3"];
        }
        if (!needsOptions(type)) {
          next.options = undefined;
        }
        return next;
      }),
    );
  };

  const addQuestion = (type: QuestionType = "choice") => {
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(type, newId()),
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions((current) =>
      current.length <= 1 ? current : current.filter((item) => item.id !== id),
    );
  };

  const moveQuestion = (id: number, direction: -1 | 1) => {
    setQuestions((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const persist = async () => {
    if (!code) {
      setMessage("Crea una sala nueva o escribe el código de una existente.");
      return;
    }
    if (!hostKey.trim()) {
      setMessage("Escribe una clave para esta sala (mín. 4 caracteres).");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await saveDeck({ code, hostKey, title, questions });
      rememberKey(code, hostKey);
      await refresh();
      setMessage("Guardado. Usa la misma clave para presentar y gestionar.");
    } catch (cause) {
      const text =
        cause instanceof Error ? cause.message : "No se pudo guardar.";
      if (/incorrecta|dueño|clave/i.test(text)) {
        setMessage(
          `${text} Si no es tu sala, deja el código vacío y pulsa Crear mi sala.`,
        );
      } else {
        setMessage(text);
      }
    } finally {
      setSaving(false);
    }
  };

  const createNew = async () => {
    if (!hostKey.trim()) {
      setMessage("Elige una clave nueva (mín. 4 caracteres) antes de crear.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      // Crear siempre una sala propia: no reutilices un código ya protegido.
      const requestedCode =
        code && !(data?.room.hasHostKey)
          ? code
          : undefined;
      const result = await createRoom({
        code: requestedCode,
        hostKey,
        title: title || "Mi experiencia en vivo",
        questions,
      });
      const nextCode = result.room?.code;
      if (!nextCode) throw new Error("No se generó el código.");
      rememberKey(nextCode, hostKey);
      setCode(nextCode);
      setMessage(
        `Sala creada: ${nextCode}. Guarda tu clave — solo quien la tenga puede gestionarla.`,
      );
      window.history.replaceState({}, "", `/host?code=${nextCode}`);
    } catch (cause) {
      const text =
        cause instanceof Error ? cause.message : "No se pudo crear.";
      if (/dueño|ya tiene/i.test(text)) {
        setCode("");
        setMessage(
          `${text} Dejamos el código vacío: pulsa Crear mi sala de nuevo para generar uno tuyo.`,
        );
      } else {
        setMessage(text);
      }
    } finally {
      setSaving(false);
    }
  };

  const copyJoin = async () => {
    if (!code) return;
    const url = `${window.location.origin}/join?code=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (code && !data) {
    return (
      <main className="studio-shell center-screen">
        <LoaderCircle className="spin" />
        <p>{error || "Cargando estudio…"}</p>
      </main>
    );
  }

  const participantCount = data?.participants.length ?? 0;
  const hasHostKey = data?.room.hasHostKey ?? false;
  const persistent = data?.persistent ?? false;

  return (
    <main className="studio-shell">
      <AppHeader />

      <header className="studio-header">
        <div>
          <p className="eyebrow">PANEL DEL HOST</p>
          <h1>Edita tu experiencia</h1>
        </div>
        <div className="studio-actions">
          <Link
            className="ghost-button"
            href={code ? `/present?code=${code}` : "/present"}
          >
            <MonitorPlay size={16} /> Presentar
          </Link>
          <Link
            className="ghost-button"
            href={code ? `/join?code=${code}` : "/join"}
          >
            Probar unirse
          </Link>
        </div>
      </header>

      <section className="studio-grid">
        <aside className="studio-sidebar">
          <label>
            Título del evento
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nombre de tu meetup"
            />
          </label>

          <label>
            Código de sala
            <input
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 12),
                )
              }
              placeholder="Vacío = se genera al crear"
              maxLength={12}
            />
          </label>

          <label>
            Clave del host
            <HostKeyInput value={hostKey} onChange={setHostKey} />
          </label>
          <p className="studio-hint">
            {hasHostKey && code && !readRoomHostKey(code)
              ? "Esta sala ya tiene dueño. Escribe la clave correcta o crea una sala nueva."
              : hasHostKey && code
                ? "Sala protegida. Usa el ojo para ver tu clave guardada."
                : "Elige tu clave al crear. Cada host tiene la suya; no uses una sala ajena."}
          </p>

          <div className="sidebar-buttons">
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => void createNew()}
            >
              {saving ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Crear mi sala
            </button>
            <button
              className="secondary-button"
              disabled={saving || !code}
              onClick={() => void persist()}
            >
              {saving ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              Guardar cambios
            </button>
            <button
              className="secondary-button"
              disabled={!code}
              onClick={() => void copyJoin()}
            >
              <Copy size={16} /> {copied ? "Copiado" : "Copiar link de unirse"}
            </button>
            <Link
              className="primary-button present-link"
              href={code ? `/present?code=${code}` : "#"}
              aria-disabled={!code}
              onClick={(event) => {
                if (!code) event.preventDefault();
              }}
            >
              Abrir presentación <ArrowRight size={16} />
            </Link>
          </div>

          {message && <p className="studio-message">{message}</p>}

          <div className="studio-meta">
            <span>{questions.length} preguntas</span>
            <span>{participantCount} en lobby</span>
            <span>{hasHostKey ? "Con clave" : "Sin clave aún"}</span>
            <span>{persistent ? "Redis" : "Demo local"}</span>
          </div>
        </aside>

        <div className="question-editor-list">
          {questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-card-top">
                <strong>
                  {index + 1}. {QUESTION_TYPE_LABELS[question.type]}
                </strong>
                <div className="question-card-actions">
                  <button
                    type="button"
                    onClick={() => moveQuestion(question.id, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(question.id, 1)}
                    disabled={index === questions.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <label>
                Tipo
                <select
                  value={question.type}
                  onChange={(event) =>
                    changeType(question.id, event.target.value as QuestionType)
                  }
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
                    (type) => (
                      <option key={type} value={type}>
                        {QUESTION_TYPE_LABELS[type]}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Pregunta
                <input
                  value={question.title}
                  onChange={(event) =>
                    updateQuestion(question.id, { title: event.target.value })
                  }
                />
              </label>

              <label>
                Ayuda / instrucción
                <input
                  value={question.prompt ?? ""}
                  onChange={(event) =>
                    updateQuestion(question.id, { prompt: event.target.value })
                  }
                  placeholder="Texto corto bajo la pregunta"
                />
              </label>

              {needsOptions(question.type) && (
                <label>
                  Opciones (una por línea)
                  <textarea
                    rows={Math.max(question.options?.length ?? 3, 3)}
                    value={(question.options ?? []).join("\n")}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        options: event.target.value.split("\n"),
                      })
                    }
                  />
                </label>
              )}
            </article>
          ))}

          <div className="add-row">
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
              <button key={type} type="button" onClick={() => addQuestion(type)}>
                <Plus size={14} /> {QUESTION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link href="/docs" className="docs-footer-button">
          <BookOpen size={16} />
          {t("footer.docs")}
          <ArrowRight size={16} />
        </Link>
      </footer>
    </main>
  );
}
