"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Copy,
  KeyRound,
  LoaderCircle,
  MonitorPlay,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
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
      setHostKey(window.localStorage.getItem("cursor-live-host-key") ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      setTitle(data.room.title || "Mi experiencia en vivo");
      setQuestions(cloneQuestions(data.questions));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data]);

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
    setSaving(true);
    setMessage("");
    try {
      window.localStorage.setItem("cursor-live-host-key", hostKey);
      await saveDeck({ code, hostKey, title, questions });
      await refresh();
      setMessage("Guardado. Ya puedes abrir la presentación.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const createNew = async () => {
    setSaving(true);
    setMessage("");
    try {
      window.localStorage.setItem("cursor-live-host-key", hostKey);
      const result = await createRoom({
        hostKey,
        title: title || "Mi experiencia en vivo",
        questions,
      });
      const nextCode = result.room?.code;
      if (!nextCode) throw new Error("No se generó el código.");
      setCode(nextCode);
      setMessage(`Sala creada: ${nextCode}`);
      window.history.replaceState({}, "", `/host?code=${nextCode}`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo crear.");
    } finally {
      setSaving(false);
    }
  };

  const copyJoin = async () => {
    const url = `${window.location.origin}/join?code=${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!data) {
    return (
      <main className="studio-shell center-screen">
        <LoaderCircle className="spin" />
        <p>{error || "Cargando estudio…"}</p>
      </main>
    );
  }

  return (
    <main className="studio-shell">
      <AppHeader />

      <header className="studio-header">
        <div>
          <p className="eyebrow">PANEL DEL HOST</p>
          <h1>Edita tu experiencia</h1>
        </div>
        <div className="studio-actions">
          <Link className="ghost-button" href={`/present?code=${code}`}>
            <MonitorPlay size={16} /> Presentar
          </Link>
          <Link className="ghost-button" href={`/join?code=${code}`}>
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
              maxLength={12}
            />
          </label>

          <label>
            Clave del host
            <div className="inline-field">
              <KeyRound size={15} />
              <input
                value={hostKey}
                onChange={(event) => setHostKey(event.target.value)}
                placeholder="Opcional en local"
                type="password"
              />
            </div>
          </label>

          <div className="sidebar-buttons">
            <button className="primary-button" disabled={saving} onClick={() => void persist()}>
              {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              Guardar cambios
            </button>
            <button className="secondary-button" disabled={saving} onClick={() => void createNew()}>
              <Plus size={16} /> Nueva sala
            </button>
            <button className="secondary-button" onClick={() => void copyJoin()}>
              <Copy size={16} /> {copied ? "Copiado" : "Copiar link de unirse"}
            </button>
            <Link className="primary-button present-link" href={`/present?code=${code}`}>
              Abrir presentación <ArrowRight size={16} />
            </Link>
          </div>

          {message && <p className="studio-message">{message}</p>}

          <div className="studio-meta">
            <span>{questions.length} preguntas</span>
            <span>{data.participants.length} en lobby</span>
            <span>{data.persistent ? "Redis" : "Demo local"}</span>
          </div>
        </aside>

        <div className="question-editor-list">
          {questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-card-top">
                <span>#{index + 1}</span>
                <div className="question-card-tools">
                  <button type="button" onClick={() => moveQuestion(question.id, -1)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveQuestion(question.id, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length <= 1}
                  >
                    <Trash2 size={15} />
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
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
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
