"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "es" | "en";
export type Theme = "light" | "dark";

type Preferences = {
  locale: Locale;
  theme: Theme;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
};

const dictionary = {
  es: {
    "nav.brand": "CURSOR LIVE",
    "nav.experience": "EXPERIENCE",
    "nav.docs": "Documentación",
    "nav.credits": "Creado por cbiux",
    "mode.label": "Modo",
    "hero.eyebrow": "EXPERIENCIA INTERACTIVA",
    "hero.title": "Hostea tu sesión.\nO únete a una.",
    "hero.copy":
      "Crea y edita las preguntas a tu gusto, proyecta el carrusel en vivo y deja que la audiencia responda desde el celular.",
    "card.host.label": "SOY HOST",
    "card.host.title": "Crear y editar preguntas",
    "card.host.copy": "Modifica el deck, el código y lanza tu experiencia.",
    "card.present.label": "PRESENTAR",
    "card.present.title": "Proyectar una sala",
    "card.present.copy":
      "Si no eres quien la creó, escribe el código y la clave para abrirla.",
    "card.present.code": "Código de la sala",
    "card.present.key": "Clave de la sala",
    "card.present.keyPlaceholder": "Clave del host",
    "card.join.label": "SOY PARTICIPANTE",
    "card.join.title": "Unirme a una sala",
    "card.join.code": "Código de la sala",
    "footer.docs": "Documentación",
    "footer.back": "Volver a Cursor Live",
    "docs.title": "Documentación",
    "docs.subtitle":
      "Guía para hostear, editar preguntas y unirte a una experiencia en vivo con Cursor Live.",

    "type.word-cloud": "Nube de palabras",
    "type.choice": "Opción múltiple",
    "type.scale": "Escala 0–10",
    "type.ranking": "Ranking (top 3)",
    "type.open": "Respuesta abierta",

    "host.eyebrow": "PANEL DEL HOST",
    "host.title": "Edita tu experiencia",
    "host.present": "Presentar",
    "host.tryJoin": "Probar unirse",
    "host.eventTitle": "Título del evento",
    "host.lobbyHeadline": "Título del lobby (pantalla grande)",
    "host.lobbyText": "Texto del lobby",
    "host.lobbyHint": "Eso se muestra en Presentar antes de comenzar la sala.",
    "host.audienceJoin": "Texto al unirse (participantes)",
    "host.audienceWaitingTitle": "Título en espera (participantes)",
    "host.audienceWaitingMessage": "Mensaje en espera (participantes)",
    "host.audienceHint":
      "Lo ven en el teléfono al entrar y mientras esperan que inicies. Vacío = default.",
    "host.roomCode": "Código de sala",
    "host.roomNumberAria": "Número de sala",
    "host.fullCode": "Código completo:",
    "host.hostKey": "Clave del host",
    "host.keyOwned":
      "Esta sala ya tiene dueño. Escribe su clave para gestionarla.",
    "host.keyHint": "Con esta clave configuras y presentas esta sala.",
    "host.mdTitle": "Configurar con Markdown",
    "host.mdSubtitle": "Pega el texto o sube un archivo",
    "host.copyPrompt": "Copiar prompt + formato",
    "host.pasteMd": "Pegar Markdown",
    "host.applyMd": "Aplicar Markdown pegado",
    "host.uploadMd": "Subir archivo .md",
    "host.mdSteps":
      "1) Copia el prompt · 2) Pégalo en una IA · 3) Pega el resultado aquí o sube el .md.",
    "host.createRoom": "Crear / reclamar sala",
    "host.save": "Guardar cambios",
    "host.copyJoin": "Copiar link de unirse",
    "host.copied": "Copiado",
    "host.openPresent": "Abrir presentación",
    "host.testTitle": "Respuestas de prueba",
    "host.testSubtitle": "Opcional, para ensayar la proyección",
    "host.targetQuestion": "Pregunta destino",
    "host.quickDemo": "Demo rápida",
    "host.responsesPrompt": "Prompt respuestas",
    "host.uploadResponses": "Subir respuestas",
    "host.pasteResponses": "Pegar respuestas (Markdown)",
    "host.applyResponses": "Aplicar respuestas pegadas",
    "host.responsesSteps":
      "1) Copia el prompt · 2) Pégalo en una IA · 3) Pega el resultado aquí o sube el .md.",
    "host.msgNeedResponsesMd": "Pega el Markdown de respuestas o sube un archivo .md.",
    "host.questionsCount": "preguntas",
    "host.inLobby": "en lobby",
    "host.withKey": "Con clave",
    "host.noKey": "Sin clave aún",
    "host.redis": "Redis",
    "host.localDemo": "Demo local",
    "host.questionType": "Tipo",
    "host.question": "Pregunta",
    "host.help": "Ayuda / instrucción",
    "host.helpPlaceholder": "Texto corto bajo la pregunta",
    "host.options": "Opciones (una por línea)",
    "host.moveUp": "Subir pregunta",
    "host.moveDown": "Bajar pregunta",
    "host.deleteQuestion": "Eliminar pregunta",
    "host.loading": "Cargando estudio…",
    "host.msgNeedNumber": "Escribe un número para formar el código CURSOR…",
    "host.msgNeedKey":
      "Escribe la clave (mín. 4 caracteres) para configurar la sala.",
    "host.msgSaved": "Guardado. Usa la misma clave para presentar y gestionar.",
    "host.msgSaveFail": "No se pudo guardar.",
    "host.msgCreateFail": "No se pudo crear.",
    "host.msgCodeFail": "No se generó el código.",
    "host.msgPromptCopied":
      "Prompt + formato copiados. Pégalos en una IA y pega el Markdown aquí (o súbelo como archivo).",
    "host.msgPromptFail": "No se pudo copiar el prompt.",
    "host.msgNeedMd": "Pega el Markdown o sube un archivo .md.",
    "host.msgMdFail": "No se pudo configurar la sala con el Markdown.",
    "host.msgSeedFail": "No se pudo crear la prueba.",
    "host.msgResponsesPromptCopied": "Prompt + formato de respuestas copiados.",
    "host.msgResponsesPromptFail": "No se pudo copiar el prompt de respuestas.",
    "host.msgImportFail": "No se pudo importar el .md.",
    "host.msgOwned":
      "Esta sala ya tiene dueño. Escribe su clave para gestionarla o cambia el número.",
    "host.msgCreated": "Sala creada:",
    "host.msgLinkCopied": "Link de unirse copiado.",
    "host.msgLinkCopyFail": "No se pudo copiar el link.",
    "host.toastClose": "Cerrar aviso",
    "host.imported": "Importadas",
    "host.responses": "respuestas",
    "host.skipped": "omitidas",

    "present.loading": "Preparando la experiencia…",
    "present.editQuestions": "Editar preguntas",
    "present.inRoom": "EN LA SALA",
    "present.joinPhone": "ÚNETE EN TU TELÉFONO",
    "present.downloadQr": "Descargar QR",
    "present.downloading": "Descargando…",
    "present.waitingNames": "Esperando nombres…",
    "present.keyPlaceholder": "Clave de esta sala",
    "present.start": "Comenzar",
    "present.lobby": "Lobby",
    "present.liveCarousel": "CARRUSEL EN VIVO",
    "present.people": "personas",
    "present.auto": "Auto",
    "present.manual": "Manual",
    "present.fullscreen": "Pantalla completa",
    "present.question": "PREGUNTA",
    "present.waitingAnswers": "Esperando respuestas…",
    "present.needKey": "Escribe la clave de esta sala para gestionarla.",
    "present.updateFail": "No se pudo actualizar.",
    "present.qrFail": "No se pudo descargar el QR.",
    "present.noQuestions": "No hay preguntas. Edítalas en el panel del host.",
    "present.goEdit": "Ir a editar",
    "present.home": "Volver al inicio",
    "present.responseOne": "1 respuesta",
    "present.responseMany": "respuestas",

    "audience.connecting": "Conectando con la sala…",
    "audience.room": "SALA",
    "audience.enterName": "Escribe tu nombre para entrar",
    "audience.namePlaceholder": "Tu nombre o nick (opcional)",
    "audience.enter": "Entrar",
    "audience.entering": "Entrando",
    "audience.ready": "LISTO",
    "audience.hello": "HOLA,",
    "audience.inRoom": "en la sala",
    "audience.thanks": "GRACIAS,",
    "audience.doneTitle": "Tus respuestas ya están en pantalla.",
    "audience.doneCopy":
      "Mira el carrusel del host. Ya puedes bajar el teléfono.",
    "audience.loadingQuestions": "Cargando preguntas…",
    "audience.submit": "Enviar",
    "audience.sending": "Enviando…",
    "audience.next": "Siguiente",
    "audience.finish": "Terminar",
    "audience.anonymous": "Anónimo",
    "audience.retry": "Intenta otra vez.",
    "audience.pickRank": "Elige 3 en orden",
    "audience.selected": "seleccionados",
    "audience.oneWord": "Una palabra",
    "audience.yourAnswer": "Tu respuesta…",
  },
  en: {
    "nav.brand": "CURSOR LIVE",
    "nav.experience": "EXPERIENCE",
    "nav.docs": "Documentation",
    "nav.credits": "Created by cbiux",
    "mode.label": "Mode",
    "hero.eyebrow": "LIVE EXPERIENCE",
    "hero.title": "Host your session.\nOr join one.",
    "hero.copy":
      "Create and edit questions, project the live carousel, and let the audience answer from their phones.",
    "card.host.label": "I'M HOST",
    "card.host.title": "Create and edit questions",
    "card.host.copy": "Edit the deck, room code, and launch your experience.",
    "card.present.label": "PRESENT",
    "card.present.title": "Project a room",
    "card.present.copy":
      "If you didn't create it, enter the room code and key to open projection.",
    "card.present.code": "Room code",
    "card.present.key": "Room key",
    "card.present.keyPlaceholder": "Host key",
    "card.join.label": "I'M A PARTICIPANT",
    "card.join.title": "Join a room",
    "card.join.code": "Room code",
    "footer.docs": "Documentation",
    "footer.back": "Back to Cursor Live",
    "docs.title": "Documentation",
    "docs.subtitle":
      "Guide to host, edit questions, and join a live experience with Cursor Live.",

    "type.word-cloud": "Word cloud",
    "type.choice": "Multiple choice",
    "type.scale": "Scale 0–10",
    "type.ranking": "Ranking (top 3)",
    "type.open": "Open response",

    "host.eyebrow": "HOST PANEL",
    "host.title": "Edit your experience",
    "host.present": "Present",
    "host.tryJoin": "Try joining",
    "host.eventTitle": "Event title",
    "host.lobbyHeadline": "Lobby headline (big screen)",
    "host.lobbyText": "Lobby text",
    "host.lobbyHint": "Shown on Present before the room starts.",
    "host.audienceJoin": "Join text (participants)",
    "host.audienceWaitingTitle": "Waiting title (participants)",
    "host.audienceWaitingMessage": "Waiting message (participants)",
    "host.audienceHint":
      "Shown on phones when joining and while waiting for you to start. Empty = default.",
    "host.roomCode": "Room code",
    "host.roomNumberAria": "Room number",
    "host.fullCode": "Full code:",
    "host.hostKey": "Host key",
    "host.keyOwned": "This room already has an owner. Enter its key to manage it.",
    "host.keyHint": "Use this key to configure and present this room.",
    "host.mdTitle": "Configure with Markdown",
    "host.mdSubtitle": "Paste text or upload a file",
    "host.copyPrompt": "Copy prompt + format",
    "host.pasteMd": "Paste Markdown",
    "host.applyMd": "Apply pasted Markdown",
    "host.uploadMd": "Upload .md file",
    "host.mdSteps":
      "1) Copy the prompt · 2) Paste it into an AI · 3) Paste the result here or upload the .md.",
    "host.createRoom": "Create / claim room",
    "host.save": "Save changes",
    "host.copyJoin": "Copy join link",
    "host.copied": "Copied",
    "host.openPresent": "Open presentation",
    "host.testTitle": "Test responses",
    "host.testSubtitle": "Optional, to rehearse projection",
    "host.targetQuestion": "Target question",
    "host.quickDemo": "Quick demo",
    "host.responsesPrompt": "Responses prompt",
    "host.uploadResponses": "Upload responses",
    "host.pasteResponses": "Paste responses (Markdown)",
    "host.applyResponses": "Apply pasted responses",
    "host.responsesSteps":
      "1) Copy the prompt · 2) Paste it into an AI · 3) Paste the result here or upload the .md.",
    "host.msgNeedResponsesMd": "Paste responses Markdown or upload a .md file.",
    "host.questionsCount": "questions",
    "host.inLobby": "in lobby",
    "host.withKey": "Has key",
    "host.noKey": "No key yet",
    "host.redis": "Redis",
    "host.localDemo": "Local demo",
    "host.questionType": "Type",
    "host.question": "Question",
    "host.help": "Help / instruction",
    "host.helpPlaceholder": "Short text under the question",
    "host.options": "Options (one per line)",
    "host.moveUp": "Move question up",
    "host.moveDown": "Move question down",
    "host.deleteQuestion": "Delete question",
    "host.loading": "Loading studio…",
    "host.msgNeedNumber": "Enter a number to build the CURSOR… code.",
    "host.msgNeedKey":
      "Enter the key (min. 4 characters) to configure the room.",
    "host.msgSaved": "Saved. Use the same key to present and manage.",
    "host.msgSaveFail": "Could not save.",
    "host.msgCreateFail": "Could not create.",
    "host.msgCodeFail": "Room code was not generated.",
    "host.msgPromptCopied":
      "Prompt + format copied. Paste into an AI and paste the Markdown here (or upload as a file).",
    "host.msgPromptFail": "Could not copy the prompt.",
    "host.msgNeedMd": "Paste Markdown or upload a .md file.",
    "host.msgMdFail": "Could not configure the room from Markdown.",
    "host.msgSeedFail": "Could not create the test data.",
    "host.msgResponsesPromptCopied": "Responses prompt + format copied.",
    "host.msgResponsesPromptFail": "Could not copy the responses prompt.",
    "host.msgImportFail": "Could not import the .md.",
    "host.msgOwned":
      "This room already has an owner. Enter its key to manage it or change the number.",
    "host.msgCreated": "Room created:",
    "host.msgLinkCopied": "Join link copied.",
    "host.msgLinkCopyFail": "Could not copy the join link.",
    "host.toastClose": "Dismiss notice",
    "host.imported": "Imported",
    "host.responses": "responses",
    "host.skipped": "skipped",

    "present.loading": "Preparing the experience…",
    "present.editQuestions": "Edit questions",
    "present.inRoom": "IN THE ROOM",
    "present.joinPhone": "JOIN ON YOUR PHONE",
    "present.downloadQr": "Download QR",
    "present.downloading": "Downloading…",
    "present.waitingNames": "Waiting for names…",
    "present.keyPlaceholder": "Key for this room",
    "present.start": "Start",
    "present.lobby": "Lobby",
    "present.liveCarousel": "LIVE CAROUSEL",
    "present.people": "people",
    "present.auto": "Auto",
    "present.manual": "Manual",
    "present.fullscreen": "Fullscreen",
    "present.question": "QUESTION",
    "present.waitingAnswers": "Waiting for answers…",
    "present.needKey": "Enter this room’s key to manage it.",
    "present.updateFail": "Could not update.",
    "present.qrFail": "Could not download the QR.",
    "present.noQuestions": "No questions yet. Edit them in the host panel.",
    "present.goEdit": "Go edit",
    "present.home": "Back to home",
    "present.responseOne": "1 response",
    "present.responseMany": "responses",

    "audience.connecting": "Connecting to the room…",
    "audience.room": "ROOM",
    "audience.enterName": "Enter your name to join",
    "audience.namePlaceholder": "Your name or nickname (optional)",
    "audience.enter": "Join",
    "audience.entering": "Joining",
    "audience.ready": "READY",
    "audience.hello": "HI,",
    "audience.inRoom": "in the room",
    "audience.thanks": "THANKS,",
    "audience.doneTitle": "Your answers are already on screen.",
    "audience.doneCopy": "Watch the host carousel. You can put your phone down.",
    "audience.loadingQuestions": "Loading questions…",
    "audience.submit": "Submit",
    "audience.sending": "Sending…",
    "audience.next": "Next",
    "audience.finish": "Finish",
    "audience.anonymous": "Anonymous",
    "audience.retry": "Try again.",
    "audience.pickRank": "Pick 3 in order",
    "audience.selected": "selected",
    "audience.oneWord": "One word",
    "audience.yourAnswer": "Your answer…",
  },
} as const;

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const savedLocale = window.localStorage.getItem("cursor-live-locale");
    const savedTheme = window.localStorage.getItem("cursor-live-theme");
    const nextLocale = savedLocale === "en" ? "en" : "es";
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    setLocaleState(nextLocale);
    setThemeState(nextTheme);
    document.documentElement.lang = nextLocale;
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("cursor-live-locale", next);
    document.documentElement.lang = next;
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem("cursor-live-theme", next);
    document.documentElement.dataset.theme = next;
  }, []);

  const t = useCallback(
    (key: string) =>
      dictionary[locale][key as keyof (typeof dictionary)["es"]] ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, theme, setLocale, setTheme, t }),
    [locale, theme, setLocale, setTheme, t],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return value;
}
