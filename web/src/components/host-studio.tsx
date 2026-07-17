"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
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
  TriangleAlert,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  HostKeyInput,
  readRoomHostKey,
  writeRoomHostKey,
} from "@/components/host-key-input";
import {
  cloneQuestions,
  createEmptyQuestion,
  DEFAULT_AUDIENCE_JOIN_PROMPT,
  DEFAULT_AUDIENCE_WAITING_HEADLINE,
  DEFAULT_AUDIENCE_WAITING_PROMPT,
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

type ToastTone = "success" | "error" | "info";

type ToastState = {
  id: number;
  text: string;
  tone: ToastTone;
};

export function HostStudio({ initialCode }: { initialCode: string }) {
  const { t } = usePreferences();
  const typeLabel = (type: QuestionType) => t(`type.${type}`);
  const [roomNumber, setRoomNumber] = useState(
    extractCursorNumber(initialCode) || "1",
  );
  const code = useMemo(() => buildCursorRoomCode(roomNumber), [roomNumber]);
  const { data, error, refresh } = useRoom(code, 2500);
  const [hostKey, setHostKey] = useState("");
  const [title, setTitle] = useState(DEFAULT_ROOM_TITLE);
  const [lobbyHeadline, setLobbyHeadline] = useState(DEFAULT_LOBBY_HEADLINE);
  const [lobbyPrompt, setLobbyPrompt] = useState(DEFAULT_LOBBY_PROMPT);
  const [audienceJoinPrompt, setAudienceJoinPrompt] = useState(
    DEFAULT_AUDIENCE_JOIN_PROMPT,
  );
  const [audienceWaitingHeadline, setAudienceWaitingHeadline] = useState(
    DEFAULT_AUDIENCE_WAITING_HEADLINE,
  );
  const [audienceWaitingPrompt, setAudienceWaitingPrompt] = useState(
    DEFAULT_AUDIENCE_WAITING_PROMPT,
  );
  const [questions, setQuestions] = useState<Question[]>(
    cloneQuestions(defaultQuestions),
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copied, setCopied] = useState(false);
  const [toolsQuestionId, setToolsQuestionId] = useState(
    defaultQuestions[0]?.id ?? 0,
  );
  const [questionsMdPaste, setQuestionsMdPaste] = useState("");
  const [dirty, setDirty] = useState(false);
  const hydratedCodeRef = useRef("");
  const ownedToastCodeRef = useRef("");
  const toastTimerRef = useRef<number | null>(null);
  const questionsFileRef = useRef<HTMLInputElement>(null);
  const responsesFileRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, tone: ToastTone = "info") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    const next = { id: Date.now(), text, tone };
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, tone === "error" ? 5200 : 3400);
  };

  const clearToast = () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

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
      setAudienceJoinPrompt(
        data.room.audienceJoinPrompt || DEFAULT_AUDIENCE_JOIN_PROMPT,
      );
      setAudienceWaitingHeadline(
        data.room.audienceWaitingHeadline ||
          DEFAULT_AUDIENCE_WAITING_HEADLINE,
      );
      setAudienceWaitingPrompt(
        data.room.audienceWaitingPrompt || DEFAULT_AUDIENCE_WAITING_PROMPT,
      );
      setQuestions(cloneQuestions(data.questions));
      setToolsQuestionId((current) =>
        data.questions.some((item) => item.id === current)
          ? current
          : (data.questions[0]?.id ?? 0),
      );
      if (
        data.room.hasHostKey &&
        !readRoomHostKey(code) &&
        ownedToastCodeRef.current !== code
      ) {
        ownedToastCodeRef.current = code;
        showToast(t("host.msgOwned"), "info");
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // Intentionally omit showToast to avoid re-toasting on poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, data, dirty, t]);

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
      showToast(t("host.msgNeedNumber"), "error");
      return false;
    }
    if (!hostKey.trim()) {
      showToast(t("host.msgNeedKey"), "error");
      return false;
    }
    return true;
  };

  const persist = async () => {
    if (!requireAccess()) return;
    setSaving(true);
    try {
      await saveDeck({
        code,
        hostKey,
        title,
        lobbyHeadline,
        lobbyPrompt,
        audienceJoinPrompt,
        audienceWaitingHeadline,
        audienceWaitingPrompt,
        questions,
      });
      rememberKey(code, hostKey);
      setDirty(false);
      hydratedCodeRef.current = "";
      await refresh();
      showToast(t("host.msgSaved"), "success");
    } catch (cause) {
      const text =
        cause instanceof Error ? cause.message : t("host.msgSaveFail");
      showToast(text, "error");
    } finally {
      setSaving(false);
    }
  };

  const createNew = async () => {
    if (!requireAccess()) return;
    setSaving(true);
    try {
      const result = await createRoom({
        code,
        hostKey,
        title: title || DEFAULT_ROOM_TITLE,
        lobbyHeadline,
        lobbyPrompt,
        audienceJoinPrompt,
        audienceWaitingHeadline,
        audienceWaitingPrompt,
        questions,
      });
      const nextCode = result.room?.code;
      if (!nextCode) throw new Error(t("host.msgCodeFail"));
      rememberKey(nextCode, hostKey);
      setDirty(false);
      hydratedCodeRef.current = "";
      const number = extractCursorNumber(nextCode);
      if (number) setRoomNumber(number);
      showToast(`${t("host.msgCreated")} ${nextCode}`, "success");
      window.history.replaceState({}, "", `/host?code=${nextCode}`);
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : t("host.msgCreateFail"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyJoin = async () => {
    if (!code) return;
    const url = `${window.location.origin}/join?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast(t("host.msgLinkCopied"), "success");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast(t("host.msgLinkCopyFail"), "error");
    }
  };

  const toolsQuestion =
    questions.find((item) => item.id === toolsQuestionId) ?? questions[0];

  const copyQuestionsPrompt = async () => {
    try {
      await navigator.clipboard.writeText(
        buildQuestionsMdPrompt({ title }),
      );
      showToast(t("host.msgPromptCopied"), "success");
    } catch {
      showToast(t("host.msgPromptFail"), "error");
    }
  };

  const configureFromQuestionsMd = async (markdown: string) => {
    if (!requireAccess()) return;
    if (!markdown.trim()) {
      showToast(t("host.msgNeedMd"), "error");
      return;
    }
    setSaving(true);
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
      showToast(
        `Sala ${code} · ${result.importedQuestions ?? result.questions?.length ?? 0} ${t("host.questionsCount")}`,
        "success",
      );
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : t("host.msgMdFail"),
        "error",
      );
    } finally {
      setSaving(false);
      if (questionsFileRef.current) questionsFileRef.current.value = "";
    }
  };

  const seedResponses = async (count: number) => {
    if (!requireAccess()) return;
    setSaving(true);
    try {
      await hostAction({
        code,
        hostKey,
        action: "seed",
        seedCount: count,
      });
      rememberKey(code, hostKey);
      await refresh();
      showToast(`${count} ${t("host.responses")}`, "success");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : t("host.msgSeedFail"),
        "error",
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
      showToast(t("host.msgResponsesPromptCopied"), "success");
    } catch {
      showToast(t("host.msgResponsesPromptFail"), "error");
    }
  };

  const importResponsesFile = async (file: File) => {
    if (!requireAccess()) return;
    setSaving(true);
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
      showToast(
        `${t("host.imported")} ${result.imported ?? 0} ${t("host.responses")}` +
          (result.skipped ? ` · ${result.skipped} ${t("host.skipped")}` : "") +
          ".",
        "success",
      );
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : t("host.msgImportFail"),
        "error",
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
        <p>{error || t("host.loading")}</p>
      </main>
    );
  }

  const participantCount = data?.participants.length ?? 0;
  const hasHostKey = data?.room.hasHostKey ?? false;
  const persistent = data?.persistent ?? false;

  return (
    <main className="studio-shell">
      <AppHeader />

      {toast && (
        <div
          className={`studio-toast tone-${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
        >
          <div className="studio-toast-icon">
            {toast.tone === "success" ? (
              <Check size={16} strokeWidth={2.4} />
            ) : toast.tone === "error" ? (
              <TriangleAlert size={16} strokeWidth={2.4} />
            ) : (
              <MonitorPlay size={15} strokeWidth={2.2} />
            )}
          </div>
          <p>{toast.text}</p>
          <button
            type="button"
            className="studio-toast-close"
            onClick={clearToast}
            aria-label={t("host.toastClose")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      <header className="studio-header">
        <div>
          <p className="eyebrow">{t("host.eyebrow")}</p>
          <h1>{t("host.title")}</h1>
        </div>
        <div className="studio-actions">
          <Link
            className="ghost-button"
            href={code ? `/present?code=${code}` : "/present"}
          >
            <MonitorPlay size={16} /> {t("host.present")}
          </Link>
          <Link
            className="ghost-button"
            href={code ? `/join?code=${code}` : "/join"}
          >
            {t("host.tryJoin")}
          </Link>
        </div>
      </header>

      <section className="studio-grid">
        <aside className="studio-sidebar">
          <label>
            {t("host.eventTitle")}
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
            {t("host.lobbyHeadline")}
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
            {t("host.lobbyText")}
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
          <p className="studio-hint">{t("host.lobbyHint")}</p>

          <label>
            {t("host.audienceJoin")}
            <textarea
              rows={2}
              value={audienceJoinPrompt}
              onChange={(event) => {
                markDirty();
                setAudienceJoinPrompt(event.target.value);
              }}
              placeholder={DEFAULT_AUDIENCE_JOIN_PROMPT}
            />
          </label>

          <label>
            {t("host.audienceWaitingTitle")}
            <input
              value={audienceWaitingHeadline}
              onChange={(event) => {
                markDirty();
                setAudienceWaitingHeadline(event.target.value);
              }}
              placeholder={DEFAULT_AUDIENCE_WAITING_HEADLINE}
            />
          </label>

          <label>
            {t("host.audienceWaitingMessage")}
            <textarea
              rows={2}
              value={audienceWaitingPrompt}
              onChange={(event) => {
                markDirty();
                setAudienceWaitingPrompt(event.target.value);
              }}
              placeholder={DEFAULT_AUDIENCE_WAITING_PROMPT}
            />
          </label>
          <p className="studio-hint">{t("host.audienceHint")}</p>

          <label>
            {t("host.roomCode")}
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
                aria-label={t("host.roomNumberAria")}
              />
            </div>
          </label>
          <p className="studio-hint">
            {t("host.fullCode")} <strong>{code || "CURSOR…"}</strong>
          </p>

          <label>
            {t("host.hostKey")}
            <HostKeyInput value={hostKey} onChange={setHostKey} />
          </label>
          <p className="studio-hint">
            {hasHostKey && code && !readRoomHostKey(code)
              ? t("host.keyOwned")
              : t("host.keyHint")}
          </p>

          <section className="host-tools">
            <div className="host-tools-title">
              <FileUp size={16} />
              <div>
                <strong>{t("host.mdTitle")}</strong>
                <span>{t("host.mdSubtitle")}</span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => void copyQuestionsPrompt()}
            >
              <ClipboardCopy size={16} /> {t("host.copyPrompt")}
            </button>

            <label className="md-paste-label">
              {t("host.pasteMd")}
              <textarea
                className="md-paste-area"
                rows={8}
                value={questionsMdPaste}
                onChange={(event) => setQuestionsMdPaste(event.target.value)}
                placeholder={`# Event title\n\n## 1. word-cloud | Your question?\nShort help\n\n## 2. choice | Another question\nPick one\n- Option A\n- Option B`}
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
              {t("host.applyMd")}
            </button>

            <button
              type="button"
              className="ghost-button md-upload-button"
              disabled={saving || !code}
              onClick={() => questionsFileRef.current?.click()}
            >
              <FileUp size={16} /> {t("host.uploadMd")}
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
            <p className="studio-hint">{t("host.mdSteps")}</p>
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
              {t("host.createRoom")}
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
              {t("host.save")}
            </button>
            <button
              className="secondary-button"
              disabled={!code}
              onClick={() => void copyJoin()}
            >
              <Copy size={16} />{" "}
              {copied ? t("host.copied") : t("host.copyJoin")}
            </button>
            <Link
              className="primary-button present-link"
              href={code ? `/present?code=${code}` : "#"}
              aria-disabled={!code}
              onClick={(event) => {
                if (!code) event.preventDefault();
              }}
            >
              {t("host.openPresent")} <ArrowRight size={16} />
            </Link>
          </div>

          <section className="host-tools">
            <div className="host-tools-title">
              <FlaskConical size={16} />
              <div>
                <strong>{t("host.testTitle")}</strong>
                <span>{t("host.testSubtitle")}</span>
              </div>
            </div>

            <label>
              {t("host.targetQuestion")}
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
              <span>{t("host.quickDemo")}</span>
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
                <ClipboardCopy size={15} /> {t("host.responsesPrompt")}
              </button>
              <button
                type="button"
                disabled={saving || !code}
                onClick={() => responsesFileRef.current?.click()}
              >
                <FileUp size={15} /> {t("host.uploadResponses")}
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

          <div className="studio-meta">
            <span>
              {questions.length} {t("host.questionsCount")}
            </span>
            <span>
              {participantCount} {t("host.inLobby")}
            </span>
            <span>{hasHostKey ? t("host.withKey") : t("host.noKey")}</span>
            <span>{persistent ? t("host.redis") : t("host.localDemo")}</span>
          </div>
        </aside>

        <div className="question-editor-list">
          {questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              <div className="question-card-top">
                <strong>
                  {index + 1}. {typeLabel(question.type)}
                </strong>
                <div className="question-card-tools">
                  <button
                    type="button"
                    onClick={() => moveQuestion(question.id, -1)}
                    disabled={index === 0}
                    aria-label={`${t("host.moveUp")} ${index + 1}`}
                    title={t("host.moveUp")}
                  >
                    <ArrowUp size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(question.id, 1)}
                    disabled={index === questions.length - 1}
                    aria-label={`${t("host.moveDown")} ${index + 1}`}
                    title={t("host.moveDown")}
                  >
                    <ArrowDown size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length <= 1}
                    aria-label={`${t("host.deleteQuestion")} ${index + 1}`}
                    title={t("host.deleteQuestion")}
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <label>
                {t("host.questionType")}
                <select
                  value={question.type}
                  onChange={(event) =>
                    changeType(question.id, event.target.value as QuestionType)
                  }
                >
                  {(
                    [
                      "word-cloud",
                      "choice",
                      "scale",
                      "ranking",
                      "open",
                    ] as QuestionType[]
                  ).map((type) => (
                    <option key={type} value={type}>
                      {typeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("host.question")}
                <input
                  value={question.title}
                  onChange={(event) =>
                    updateQuestion(question.id, { title: event.target.value })
                  }
                />
              </label>

              <label>
                {t("host.help")}
                <input
                  value={question.prompt ?? ""}
                  onChange={(event) =>
                    updateQuestion(question.id, { prompt: event.target.value })
                  }
                  placeholder={t("host.helpPlaceholder")}
                />
              </label>

              {needsOptions(question.type) && (
                <label>
                  {t("host.options")}
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
            {(
              [
                "word-cloud",
                "choice",
                "scale",
                "ranking",
                "open",
              ] as QuestionType[]
            ).map((type) => (
              <button key={type} type="button" onClick={() => addQuestion(type)}>
                <Plus size={14} /> {typeLabel(type)}
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
