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
