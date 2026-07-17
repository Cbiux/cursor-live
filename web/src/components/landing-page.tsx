"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  MonitorUp,
  Settings2,
  Smartphone,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { writeRoomHostKey } from "@/components/host-key-input";
import { buildCursorRoomCode } from "@/lib/questions-md";
import { usePreferences } from "@/lib/preferences";
import { verifyPresentAccess } from "@/lib/use-room";

export function LandingPage() {
  const { t } = usePreferences();
  const router = useRouter();
  const [titleLine1, titleLine2 = ""] = t("hero.title").split("\n");
  const emphasize = titleLine2.match(/(únete|join)/i);
  const [presentNumber, setPresentNumber] = useState("1");
  const [presentKey, setPresentKey] = useState("");
  const [presentBusy, setPresentBusy] = useState(false);
  const [presentError, setPresentError] = useState("");

  const presentCode = buildCursorRoomCode(presentNumber);

  const openPresent = async (event: FormEvent) => {
    event.preventDefault();
    if (!presentCode) {
      setPresentError("Escribe el número de la sala (ej. 1 → CURSOR1).");
      return;
    }
    if (presentKey.trim().length < 4) {
      setPresentError("La clave debe tener al menos 4 caracteres.");
      return;
    }

    setPresentBusy(true);
    setPresentError("");
    try {
      await verifyPresentAccess({
        code: presentCode,
        hostKey: presentKey,
      });
      writeRoomHostKey(presentCode, presentKey);
      router.push(`/present?code=${presentCode}`);
    } catch (cause) {
      setPresentError(
        cause instanceof Error
          ? cause.message
          : "No se pudo abrir la presentación.",
      );
    } finally {
      setPresentBusy(false);
    }
  };

  return (
    <main className="landing-shell">
      <AppHeader />

      <section className="landing-hero">
        <p className="eyebrow">{t("hero.eyebrow")}</p>
        <h1>
          {titleLine1}
          <br />
          {emphasize ? (
            <>
              {titleLine2.slice(0, emphasize.index)}
              <em>{emphasize[0]}</em>
              {titleLine2.slice((emphasize.index ?? 0) + emphasize[0].length)}
            </>
          ) : (
            titleLine2
          )}
        </h1>
        <p className="hero-copy">{t("hero.copy")}</p>

        <div className="mode-shell">
          <p className="mode-label">{t("mode.label")}</p>
          <div className="entry-grid three">
            <Link href="/host" className="entry-card host-card featured">
              <div className="entry-icon">
                <Settings2 size={22} />
              </div>
              <div>
                <span>{t("card.host.label")}</span>
                <h2>{t("card.host.title")}</h2>
                <p>{t("card.host.copy")}</p>
              </div>
              <ArrowRight className="card-arrow" />
            </Link>

            <form
              className="entry-card host-card present-card"
              onSubmit={(event) => void openPresent(event)}
            >
              <div className="entry-icon">
                <MonitorUp size={22} />
              </div>
              <div>
                <span>{t("card.present.label")}</span>
                <h2>{t("card.present.title")}</h2>
                <p>{t("card.present.copy")}</p>
              </div>

              <label htmlFor="present-code">{t("card.present.code")}</label>
              <div className="code-prefix-field landing-code-field">
                <span>CURSOR</span>
                <input
                  id="present-code"
                  value={presentNumber}
                  onChange={(event) =>
                    setPresentNumber(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="1"
                  inputMode="numeric"
                  maxLength={6}
                  aria-label="Número de sala"
                />
              </div>

              <label htmlFor="present-key">{t("card.present.key")}</label>
              <input
                id="present-key"
                className="landing-key-input"
                type="password"
                value={presentKey}
                onChange={(event) => setPresentKey(event.target.value)}
                placeholder={t("card.present.keyPlaceholder")}
                autoComplete="current-password"
                minLength={4}
              />

              <div className="code-entry present-submit-row">
                <p className="landing-code-hint">
                  {presentCode || "CURSOR…"}
                </p>
                <button
                  type="submit"
                  disabled={presentBusy}
                  aria-label="Abrir presentación"
                >
                  {presentBusy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <ArrowRight />
                  )}
                </button>
              </div>
              {presentError && (
                <p className="landing-form-error">{presentError}</p>
              )}
            </form>

            <form action="/join" className="entry-card audience-card">
              <div className="entry-icon">
                <Smartphone size={22} />
              </div>
              <div>
                <span>{t("card.join.label")}</span>
                <h2>{t("card.join.title")}</h2>
              </div>
              <label htmlFor="code">{t("card.join.code")}</label>
              <div className="code-entry">
                <input
                  id="code"
                  name="code"
                  defaultValue="CURSOR1"
                  maxLength={12}
                />
                <button type="submit" aria-label="Entrar a la sala">
                  <ArrowRight />
                </button>
              </div>
            </form>
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
