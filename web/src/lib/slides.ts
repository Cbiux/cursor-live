export type QuestionType =
  | "word-cloud"
  | "choice"
  | "scale"
  | "ranking"
  | "open";

export type Question = {
  id: number;
  title: string;
  prompt?: string;
  type: QuestionType;
  options?: string[];
};

export const ROOM_CODE = "CURSORCR";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  "word-cloud": "Nube de palabras",
  choice: "Opción múltiple",
  scale: "Escala 0–10",
  ranking: "Ranking (top 3)",
  open: "Respuesta abierta",
};

export const defaultQuestions: Question[] = [
  {
    id: 1,
    title: "¿Qué vienes a buscar hoy?",
    prompt: "Responde en una palabra",
    type: "word-cloud",
  },
  {
    id: 2,
    title: "¿Desde dónde construyes?",
    prompt: "Elige la opción que mejor describe tu rol hoy",
    type: "choice",
    options: [
      "Software engineer / developer",
      "Estudiante",
      "Founder / startup builder",
      "Producto, diseño o datos",
      "IA / investigación",
      "Explorando una nueva etapa",
    ],
  },
  {
    id: 3,
    title: "¿Qué tan Cursor eres?",
    prompt: "0 · Hoy lo conozco   —   10 · Power user",
    type: "scale",
  },
  {
    id: 4,
    title: "Solo puedes elegir uno.",
    prompt: "¿Con cuál modelo programarías hoy?",
    type: "choice",
    options: [
      "Claude",
      "GPT",
      "Gemini",
      "Grok",
      "Un modelo open source",
      "El que esté disponible",
    ],
  },
  {
    id: 5,
    title: "¿Qué te roba más tiempo?",
    prompt: "Elige tus 3 principales, en orden",
    type: "ranking",
    options: [
      "Entender código ajeno",
      "Bugs que no tienen sentido",
      "Configuración y tooling",
      "Requisitos que cambian",
      "Tests y debugging",
      "Saber qué pedirle a la IA",
    ],
  },
  {
    id: 6,
    title: "¿Qué quieres aprender hoy?",
    prompt: "Elige tus 3 temas más emocionantes",
    type: "ranking",
    options: [
      "Agentes de punta a punta",
      "Modelos más rápidos y capaces",
      "Desarrollo multimodal",
      "MCP, herramientas e integraciones",
      "Equipos humanos + IA",
      "Productos AI-native",
    ],
  },
  {
    id: 7,
    title: "Pon tu proyecto en el radar.",
    prompt: "¿Qué estás construyendo? · 7 palabras máximo",
    type: "open",
  },
];

export function createEmptyQuestion(
  type: QuestionType = "choice",
  id = Date.now(),
): Question {
  const base: Question = {
    id,
    title: "Nueva pregunta",
    prompt: "",
    type,
  };

  if (type === "choice" || type === "ranking") {
    base.options = ["Opción 1", "Opción 2", "Opción 3"];
  }
  if (type === "scale") {
    base.prompt = "0 — poco   ·   10 — mucho";
  }
  if (type === "word-cloud") {
    base.prompt = "Responde en una palabra";
  }
  if (type === "open") {
    base.prompt = "Respuesta corta";
  }

  return base;
}

export function cloneQuestions(source = defaultQuestions): Question[] {
  return source.map((question) => ({
    ...question,
    options: question.options ? [...question.options] : undefined,
  }));
}

export type ResponseValue = string | number | string[];

export type RoomState = {
  code: string;
  title: string;
  presenting: boolean;
  carouselIndex: number;
  updatedAt: number;
  /** SHA-256 hash; never expose to clients. */
  hostKeyHash?: string;
};

export type PublicRoomState = Omit<RoomState, "hostKeyHash"> & {
  hasHostKey: boolean;
};

export type Participant = {
  id: string;
  name: string;
  joinedAt: number;
};

export type ResponseRecord = {
  participantId: string;
  name: string;
  slideId: number;
  value: ResponseValue;
  createdAt: number;
};

export type ResponsesBySlide = Record<number, ResponseRecord[]>;

export function needsOptions(type: QuestionType) {
  return type === "choice" || type === "ranking";
}
