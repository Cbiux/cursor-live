"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCopy,
  Copy,
  FileUp,
  FlaskConical,
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
  DEFAULT_LOBBY_HEADLINE,
  DEFAULT_LOBBY_PROMPT,
  DEFAULT_ROOM_TITLE,
  defaultQuestions,
  needsOptions,
  type Question,
  type QuestionType,
} from "@/lib/slides";
import {
  buildQuestionsMdPrompt,
  buildCursorRoomCode,
} from "@/lib/questions-md";
import {
  buildResponsesMdPrompt,
  RESPONSES_MD_EXAMPLE,
} from "@/lib/responses-md";
import {
  createRoom,
  hostAction,
  importQuestionsMd,
  importResponsesMd,
  saveDeck,
  useRoom,
} from "@/lib/use-room";
import { usePreferences } from "@/lib/preferences";

function newId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function extractCursorNumber(code: string) {
  const match = code.toUpperCase().match(/^CURSOR(\d+)$/);
  return match?.[1] ?? "";
}

export function HostStudio({ initialCode }: { initialCode: string }) {
  const { t } = usePreferences();
  const [roomNumber, setRoomNumber] = useState(
    extractCursorNumber(initialCode) || "1",
  );
  const code = useMemo(() => buildCursorRoomCode(roomNumber), [roomNumber]);
  const { data, error, refresh } = useRoom(code, 2500);
  const [hostKey, setHostKey] = useState("");
  const [title, setTitle] = useState(DEFAULT_ROOM_TITLE);
  const [lobbyHeadline, setLobbyHeadline] = useState(DEFAULT_LOBBY_HEADLINE);
  const [lobbyPrompt, setLobbyPrompt] = useState(DEFAULT_LOBBY_PROMPT);
  const [questions, setQuestions] = useState<Question[]>(
    cloneQuestions(defaultQuestions),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [toolsQuestionId, setToolsQuestionId] = useState(
    defaultQuestions[0]?.id ?? 0,
  );
  const [questionsMdPaste, setQuestionsMdPaste] = useState("");
  const [dirty, setDirty] = useState(false);
  const hydratedCodeRef = useRef("");
  const questionsFileRef = useRef<HTMLInputElement>(null);
  const responsesFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHostKey(readRoomHostKey(code));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (!data || !code) return;
    // Don't clobber in-progress edits when the room poll refreshes.
    if (hydratedCodeRef.current === code && dirty) return;

    const timer = window.setTimeout(() => {
      hydratedCodeRef.current = code;
      setDirty(false);
      setTitle(data.room.title || DEFAULT_ROOM_TITLE);
      setLobbyHeadline(data.room.lobbyHeadline || DEFAULT_LOBBY_HEADLINE);
      setLobbyPrompt(data.room.lobbyPrompt || DEFAULT_LOBBY_PROMPT);
      setQuestions(cloneQuestions(data.questions));
      setToolsQuestionId((current) =>
        data.questions.some((item) => item.id === current)
          ? current
          : (data.questions[0]?.id ?? 0),
      );
      if (data.room.hasHostKey && !readRoomHostKey(code)) {
        setMessage(
          "Esta sala ya tiene dueño. Escribe su clave para gestionarla o cambia el número.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [code, data, dirty]);

  const rememberKey = (nextCode: string, key: string) => {
    writeRoomHostKey(nextCode, key);
  };

  const markDirty = () => setDirty(true);

  const updateQuestion = (id: number, patch: Partial<Question>) => {
    markDirty();
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  };

  const changeType = (id: number, type: QuestionType) => {
    markDirty();
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
    markDirty();
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(type, newId()),
    ]);
  };

  const removeQuestion = (id: number) => {
    markDirty();
    setQuestions((current) =>
      current.length <= 1 ? current : current.filter((item) => item.id !== id),
    );
  };

  const moveQuestion = (id: number, direction: -1 | 1) => {
    markDirty();
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

  const requireAccess = (needsCode = true) => {
    if (needsCode && !code) {
      setMessage("Escribe un número para formar el código CURSOR…");
      return false;
    }
    if (!hostKey.trim()) {
      setMessage("Escribe la clave (mín. 4 caracteres) para configurar la sala.");
      return false;
    }
    return true;
  };

  const persist = async () => {
    if (!requireAccess()) return;
    setSaving(true);
    setMessage("");
    try {
      await saveDeck({
        code,
        hostKey,
        title,
        lobbyHeadline,
        lobbyPrompt,
        questions,
      });
      rememberKey(code, hostKey);
      setDirty(false);
      hydratedCodeRef.current = "";
      await refresh();
      setMessage("Guardado. Usa la misma clave para presentar y gestionar.");
    } catch (cause) {
      const text =
        cause instanceof Error ? cause.message : "No se pudo guardar.";
      setMessage(text);
    } finally {
      setSaving(false);
    }
  };

  const createNew = async () => {
    if (!requireAccess()) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await createRoom({
        code,
        hostKey,
        title: title || DEFAULT_ROOM_TITLE,
        lobbyHeadline,
        lobbyPrompt,
        questions,
      });
      const nextCode = result.room?.code;
      if (!nextCode) throw new Error("No se generó el código.");
      rememberKey(nextCode, hostKey);
      setDirty(false);
      hydratedCodeRef.current = "";
      const number = extractCursorNumber(nextCode);
      if (number) setRoomNumber(number);
      setMessage(
        `Sala creada: ${nextCode}. Guarda tu clave — solo quien la tenga puede gestionarla.`,
      );
      window.history.replaceState({}, "", `/host?code=${nextCode}`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo crear.");
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

  const toolsQuestion =
    questions.find((item) => item.id === toolsQuestionId) ?? questions[0];

  const copyQuestionsPrompt = async () => {
    try {
      await navigator.clipboard.writeText(
        buildQuestionsMdPrompt({ title }),
      );
      setMessage(
        "Prompt + formato copiados. Pégalos en una IA y pega el Markdown aquí (o súbelo como archivo).",
      );
    } catch {
      setMessage("No se pudo copiar el prompt.");
    }
  };

  const configureFromQuestionsMd = async (markdown: string) => {
    if (!requireAccess()) return;
    if (!markdown.trim()) {
      setMessage("Pega el Markdown o sube un archivo .md.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await importQuestionsMd({
        code,
        hostKey,
        markdown,
        title,
      });
      rememberKey(code, hostKey);
      if (result.room?.title) setTitle(result.room.title);
      if (result.questions?.length) {
        setQuestions(cloneQuestions(result.questions));
      }
      setQuestionsMdPaste("");
      setDirty(false);
      hydratedCodeRef.current = code;
      await refresh();
      window.history.replaceState({}, "", `/host?code=${code}`);
      setMessage(
        `Sala ${code} configurada con ${result.importedQuestions ?? result.questions?.length ?? 0} preguntas desde el Markdown.`,
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "No se pudo configurar la sala con el Markdown.",
      );
    } finally {
      setSaving(false);
      if (questionsFileRef.current) questionsFileRef.current.value = "";
    }
  };

  const seedResponses = async (count: number) => {
    if (!requireAccess()) return;
    setSaving(true);
    setMessage("");
    try {
      await hostAction({
        code,
        hostKey,
        action: "seed",
        seedCount: count,
      });
      rememberKey(code, hostKey);
      await refresh();
      setMessage(`Prueba lista: ${count} respuestas demo por pregunta.`);
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "No se pudo crear la prueba.",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyResponsesPrompt = async () => {
    if (!toolsQuestion) return;
    try {
      await navigator.clipboard.writeText(
        `${buildResponsesMdPrompt({
          count: 50,
          question: toolsQuestion,
          questions,
        })}\n\n---\n\nEjemplo de formato:\n\n${RESPONSES_MD_EXAMPLE}`,
      );
      setMessage("Prompt + formato de respuestas copiados.");
    } catch {
      setMessage("No se pudo copiar el prompt de respuestas.");
    }
  };

  const importResponsesFile = async (file: File) => {
    if (!requireAccess()) return;
    setSaving(true);
    setMessage("");
    try {
      const markdown = await file.text();
      const result = await importResponsesMd({
        code,
        hostKey,
        markdown,
        slideId: toolsQuestion?.id,
      });
      rememberKey(code, hostKey);
      await refresh();
      setMessage(
        `Importadas ${result.imported ?? 0} respuestas` +
          (result.skipped ? ` · ${result.skipped} omitidas` : "") +
          ".",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "No se pudo importar el .md.",
      );
    } finally {
      setSaving(false);
      if (responsesFileRef.current) responsesFileRef.current.value = "";
    }
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
              onChange={(event) => {
                markDirty();
                setTitle(event.target.value);
              }}
              placeholder={DEFAULT_ROOM_TITLE}
            />
          </label>

          <label>
            Título del lobby (pantalla grande)
            <input
              value={lobbyHeadline}
              onChange={(event) => {
                markDirty();
                setLobbyHeadline(event.target.value);
              }}
              placeholder={DEFAULT_LOBBY_HEADLINE}
            />
          </label>

          <label>
            Texto del lobby
            <textarea
              rows={3}
              value={lobbyPrompt}
              onChange={(event) => {
                markDirty();
                setLobbyPrompt(event.target.value);
              }}
              placeholder={DEFAULT_LOBBY_PROMPT}
            />
          </label>
          <p className="studio-hint">
            Eso se muestra en Presentar antes de comenzar la sala.
          </p>

          <label>
            Código de sala
            <div className="code-prefix-field">
              <span>CURSOR</span>
              <input
                value={roomNumber}
                onChange={(event) =>
                  setRoomNumber(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="1"
                inputMode="numeric"
                maxLength={6}
                aria-label="Número de sala"
              />
            </div>
          </label>
          <p className="studio-hint">
            Código completo: <strong>{code || "CURSOR…"}</strong>
          </p>

          <label>
            Clave del host
            <HostKeyInput value={hostKey} onChange={setHostKey} />
          </label>
          <p className="studio-hint">
            {hasHostKey && code && !readRoomHostKey(code)
              ? "Esta sala ya tiene dueño. Escribe su clave para gestionarla."
              : "Con esta clave configuras y presentas esta sala."}
          </p>

          <section className="host-tools">
            <div className="host-tools-title">
              <FileUp size={16} />
              <div>
                <strong>Configurar con Markdown</strong>
                <span>Pega el texto o sube un archivo</span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => void copyQuestionsPrompt()}
            >
              <ClipboardCopy size={16} /> Copiar prompt + formato
            </button>

            <label className="md-paste-label">
              Pegar Markdown
              <textarea
                className="md-paste-area"
                rows={8}
                value={questionsMdPaste}
                onChange={(event) => setQuestionsMdPaste(event.target.value)}
                placeholder={`# Título del evento\n\n## 1. word-cloud | ¿Tu pregunta?\nAyuda corta\n\n## 2. choice | Otra pregunta\nElige una\n- Opción A\n- Opción B`}
                spellCheck={false}
              />
            </label>

            <button
              type="button"
              className="secondary-button"
              disabled={saving || !code || !questionsMdPaste.trim()}
              onClick={() => void configureFromQuestionsMd(questionsMdPaste)}
            >
              {saving ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              Aplicar Markdown pegado
            </button>

            <button
              type="button"
              className="ghost-button md-upload-button"
              disabled={saving || !code}
              onClick={() => questionsFileRef.current?.click()}
            >
              <FileUp size={16} /> Subir archivo .md
            </button>
            <input
              ref={questionsFileRef}
              type="file"
              accept=".md,text/markdown,text/plain"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file.text().then((text) => {
                  setQuestionsMdPaste(text);
                  void configureFromQuestionsMd(text);
                });
              }}
            />
            <p className="studio-hint">
              1) Copia el prompt · 2) Pégalo en una IA · 3) Pega el resultado aquí o sube el .md.
            </p>
          </section>

          <div className="sidebar-buttons">
            <button
              className="primary-button"
              disabled={saving || !code}
              onClick={() => void createNew()}
            >
              {saving ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Crear / reclamar sala
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

          <section className="host-tools">
            <div className="host-tools-title">
              <FlaskConical size={16} />
              <div>
                <strong>Respuestas de prueba</strong>
                <span>Opcional, para ensayar la proyección</span>
              </div>
            </div>

            <label>
              Pregunta destino
              <select
                value={toolsQuestion?.id ?? ""}
                onChange={(event) =>
                  setToolsQuestionId(Number(event.target.value))
                }
              >
                {questions.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {index + 1}. {item.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="seed-tools">
              <span>Demo rápida</span>
              <div>
                {[20, 50, 100].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={saving || !code}
                    onClick={() => void seedResponses(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="host-tools-grid">
              <button
                type="button"
                disabled={!toolsQuestion}
                onClick={() => void copyResponsesPrompt()}
              >
                <ClipboardCopy size={15} /> Prompt respuestas
              </button>
              <button
                type="button"
                disabled={saving || !code}
                onClick={() => responsesFileRef.current?.click()}
              >
                <FileUp size={15} /> Subir respuestas
              </button>
            </div>
            <input
              ref={responsesFileRef}
              type="file"
              accept=".md,text/markdown,text/plain"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importResponsesFile(file);
              }}
            />
          </section>

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
