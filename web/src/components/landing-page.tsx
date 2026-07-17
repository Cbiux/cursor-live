"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, MonitorUp, Settings2, Smartphone } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { usePreferences } from "@/lib/preferences";

export function LandingPage() {
  const { t } = usePreferences();
  const [titleLine1, titleLine2 = ""] = t("hero.title").split("\n");
  const emphasize = titleLine2.match(/(únete|join)/i);

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

            <Link href="/present?code=CURSORCR" className="entry-card host-card">
              <div className="entry-icon">
                <MonitorUp size={22} />
              </div>
              <div>
                <span>{t("card.present.label")}</span>
                <h2>{t("card.present.title")}</h2>
                <p>{t("card.present.copy")}</p>
              </div>
              <ArrowRight className="card-arrow" />
            </Link>

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
                  defaultValue="CURSORCR"
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
