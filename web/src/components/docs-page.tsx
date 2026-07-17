"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { usePreferences } from "@/lib/preferences";

export function DocsPage() {
  const { locale, t } = usePreferences();
  const es = locale === "es";

  return (
    <main className="docs-shell">
      <AppHeader />

      <div className="docs-top">
        <Link href="/" className="docs-back">
          <ArrowLeft size={16} />
          {t("footer.back")}
        </Link>
        <span className="docs-current">{t("nav.docs")}</span>
      </div>

      <article className="docs-content">
        <p className="eyebrow">{es ? "GUÍA" : "GUIDE"}</p>
        <h1>{t("docs.title")}</h1>
        <p className="docs-lead">{t("docs.subtitle")}</p>

        <section>
          <h2>{es ? "Qué es Cursor Live" : "What is Cursor Live"}</h2>
          <p>
            {es
              ? "Cursor Live es una experiencia interactiva tipo Mentimeter para meetups. El host edita las preguntas, proyecta un carrusel en vivo y la audiencia responde desde el celular tras escribir su nombre."
              : "Cursor Live is a Mentimeter-style interactive experience for meetups. The host edits questions, projects a live carousel, and the audience answers from their phones after entering a name."}
          </p>
        </section>

        <section>
          <h2>{es ? "Modos de la app" : "App modes"}</h2>
          <p>
            {es
              ? "Cursor Live tiene tres modos. Cada uno está pensado para un rol distinto en el evento."
              : "Cursor Live has three modes. Each one is meant for a different role at the event."}
          </p>
          <ul>
            <li>
              <strong>{es ? "Hostear" : "Host"}:</strong>{" "}
              {es
                ? "crea o edita el título, el código y todas las preguntas. Guarda el deck antes de proyectar."
                : "create or edit the title, room code, and every question. Save the deck before presenting."}
            </li>
            <li>
              <strong>{es ? "Presentar" : "Present"}:</strong>{" "}
              {es
                ? "lobby con QR, nombres entrando y carrusel de resultados en vivo."
                : "lobby with QR, joining names, and a live results carousel."}
            </li>
            <li>
              <strong>{es ? "Unirse" : "Join"}:</strong>{" "}
              {es
                ? "escribe tu nombre y responde todas las preguntas de una sola vez."
                : "enter your name and answer all questions in one flow."}
            </li>
          </ul>
        </section>

        <section>
          <h2>{es ? "Cómo hostear una sesión" : "How to host a session"}</h2>
          <ol>
            <li>
              {es
                ? "Abre Hostear, define una clave (mín. 4 caracteres) y pulsa Crear mi sala."
                : "Open Host, set a key (min. 4 characters), and click Create my room."}
            </li>
            <li>
              {es
                ? "Guarda la clave: solo quien la tenga puede editar o presentar esa sala."
                : "Save the key: only someone with it can edit or present that room."}
            </li>
            <li>
              {es
                ? "Edita las preguntas: tipo, texto, ayuda y opciones."
                : "Edit questions: type, text, helper copy, and options."}
            </li>
            <li>
              {es ? "Pulsa Guardar cambios." : "Click Save changes."}
            </li>
            <li>
              {es
                ? "Abre Presentar, escribe la misma clave y comparte el QR o el código."
                : "Open Present, enter the same key, and share the QR or room code."}
            </li>
            <li>
              {es
                ? "Cuando la sala esté lista, pulsa Comenzar."
                : "When the room is ready, press Start."}
            </li>
            <li>
              {es
                ? "Deja el carrusel en pantalla completa mientras llegan respuestas."
                : "Leave the carousel fullscreen while answers arrive."}
            </li>
          </ol>
        </section>

        <section>
          <h2>{es ? "Tipos de pregunta" : "Question types"}</h2>
          <p>
            {es
              ? "Personaliza el deck y usa solo los tipos que necesitas. La vista del host se actualiza al guardar."
              : "Customize the deck and use only the types you need. The host view updates when you save."}
          </p>
          <ul>
            <li>
              <strong>{es ? "Nube de palabras" : "Word cloud"}:</strong>{" "}
              {es ? "una palabra por persona." : "one word per person."}
            </li>
            <li>
              <strong>{es ? "Opción múltiple" : "Multiple choice"}:</strong>{" "}
              {es ? "elige una opción." : "pick one option."}
            </li>
            <li>
              <strong>{es ? "Escala 0–10" : "Scale 0–10"}:</strong>{" "}
              {es ? "mide intensidad o experiencia." : "measure intensity or experience."}
            </li>
            <li>
              <strong>Ranking:</strong>{" "}
              {es ? "elige y ordena el top 3." : "choose and order a top 3."}
            </li>
            <li>
              <strong>{es ? "Respuesta abierta" : "Open answer"}:</strong>{" "}
              {es ? "texto corto (ideal para proyectos)." : "short text (great for projects)."}
            </li>
          </ul>
        </section>

        <section>
          <h2>{es ? "Cómo unirse" : "How to join"}</h2>
          <ol>
            <li>
              {es
                ? "Escanea el QR o entra a /join con el código."
                : "Scan the QR or open /join with the code."}
            </li>
            <li>
              {es
                ? "Escribe tu nombre (como en Kahoot)."
                : "Enter your name (Kahoot-style)."}
            </li>
            <li>
              {es
                ? "Espera a que el host comience."
                : "Wait for the host to start."}
            </li>
            <li>
              {es
                ? "Responde todas las preguntas seguidas."
                : "Answer all questions in sequence."}
            </li>
            <li>
              {es
                ? "Mira el carrusel del host mientras llegan respuestas."
                : "Watch the host carousel as answers arrive."}
            </li>
          </ol>
        </section>

        <section>
          <h2>{es ? "Presentación en vivo" : "Live presentation"}</h2>
          <ul>
            <li>
              {es
                ? "El lobby muestra el código, el QR y quién está entrando."
                : "The lobby shows the code, QR, and who is joining."}
            </li>
            <li>
              {es
                ? "Tras Comenzar, el carrusel rota resultados con nombres en el feed."
                : "After Start, the carousel rotates results with names in the feed."}
            </li>
            <li>
              {es
                ? "Puedes avanzar manualmente o dejar el avance automático."
                : "You can advance manually or leave auto-advance on."}
            </li>
          </ul>
        </section>

        <section>
          <h2>{es ? "Funciones de la app" : "App features"}</h2>
          <ul>
            <li>
              {es
                ? "Tres modos: hostear, presentar y unirse."
                : "Three modes: host, present, and join."}
            </li>
            <li>
              {es
                ? "Editor de preguntas con tipos word-cloud, choice, scale, ranking y open."
                : "Question editor with word-cloud, choice, scale, ranking, and open types."}
            </li>
            <li>
              {es
                ? "Resultados en vivo con polling y feed de respuestas."
                : "Live results with polling and an answer feed."}
            </li>
            <li>
              {es
                ? "Interfaz en español e inglés y tema claro/oscuro."
                : "Spanish and English UI plus light/dark theme."}
            </li>
            <li>
              {es
                ? "Demo local en memoria; en producción usa Upstash Redis. Cada sala tiene su propia clave de host."
                : "Local in-memory demo; production uses Upstash Redis. Each room has its own host key."}
            </li>
          </ul>
        </section>

        <section>
          <h2>{es ? "Importar respuestas desde Markdown" : "Import responses from Markdown"}</h2>
          <p>
            {es
              ? "En el presentador puedes copiar un prompt para que una IA genere un .md y luego importarlo."
              : "In the presenter you can copy a prompt so an AI generates a .md file, then import it."}
          </p>
          <ol>
            <li>{es ? "Pulsa Prompt y pégalo en una IA." : "Click Prompt and paste it into an AI."}</li>
            <li>{es ? "Guarda la salida como archivo .md." : "Save the output as a .md file."}</li>
            <li>{es ? "Pulsa .md e importa con la clave de la sala." : "Click .md and import with the room key."}</li>
          </ol>
          <p>
            {es ? "Ejemplo en" : "Example at"}{" "}
            <code>examples/responses-example.md</code>
          </p>
        </section>

        <section>
          <h2>{es ? "Consejos para el evento" : "Event tips"}</h2>
          <ul>
            <li>
              {es
                ? "Prueba el QR desde la última fila antes de abrir puertas."
                : "Test the QR from the back row before doors open."}
            </li>
            <li>
              {es
                ? "Usa pantalla completa en el modo Presentar."
                : "Use fullscreen in Present mode."}
            </li>
            <li>
              {es
                ? "En producción, configura Upstash Redis. Cada host crea su sala con su propia clave."
                : "In production, configure Upstash Redis. Each host creates a room with their own key."}
            </li>
            <li>
              {es
                ? "Sin Redis funciona en demo local en un solo proceso."
                : "Without Redis it works as a local demo in one process."}
            </li>
          </ul>
        </section>

        <section>
          <h2>{es ? "Requisitos" : "Requirements"}</h2>
          <ul>
            <li>
              {es
                ? "Navegador moderno en desktop para proyectar."
                : "Modern desktop browser for projection."}
            </li>
            <li>
              {es
                ? "Celulares conectados a la misma experiencia."
                : "Phones connected to the same experience."}
            </li>
            <li>
              {es
                ? "HTTPS o localhost para uso en evento."
                : "HTTPS or localhost for event use."}
            </li>
          </ul>
        </section>

        <section>
          <h2>{es ? "Código fuente" : "Source code"}</h2>
          <p>
            {es
              ? "El proyecto es open source. Reporta bugs, deja feedback o contribuye en GitHub."
              : "The project is open source. Report bugs, leave feedback, or contribute on GitHub."}
          </p>
          <p>
            <a href="https://github.com/Cbiux/cursor-live" target="_blank" rel="noreferrer">
              github.com/Cbiux/cursor-live
            </a>
          </p>
        </section>
      </article>

      <footer className="landing-footer">
        <Link href="/" className="docs-footer-button">
          <ArrowLeft size={16} />
          {t("footer.back")}
        </Link>
      </footer>
    </main>
  );
}
