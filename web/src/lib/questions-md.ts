import {
  createEmptyQuestion,
  type Question,
  type QuestionType,
} from "./slides";

const TYPES: QuestionType[] = [
  "word-cloud",
  "choice",
  "scale",
  "ranking",
  "open",
];

export const QUESTIONS_MD_EXAMPLE = `# Cursor Live

## 1. word-cloud | ¿Qué vienes a buscar hoy?
Responde en una palabra

## 2. choice | ¿Desde dónde construyes?
Elige la opción que mejor describe tu rol hoy
- Software engineer / developer
- Estudiante
- Founder / startup builder
- Producto, diseño o datos
- IA / investigación
- Explorando una nueva etapa

## 3. scale | ¿Qué tan Cursor eres?
0 · Hoy lo conozco — 10 · Power user

## 4. choice | Solo puedes elegir uno.
¿Con cuál modelo programarías hoy?
- Claude
- GPT
- Gemini
- Grok
- Un modelo open source
- El que esté disponible

## 5. ranking | ¿Qué te roba más tiempo?
Elige tus 3 principales, en orden
- Entender código ajeno
- Bugs que no tienen sentido
- Configuración y tooling
- Requisitos que cambian
- Tests y debugging
- Saber qué pedirle a la IA

## 6. ranking | ¿Qué quieres aprender hoy?
Elige tus 3 temas más emocionantes
- Agentes de punta a punta
- Modelos más rápidos y capaces
- Desarrollo multimodal
- MCP, herramientas e integraciones
- Equipos humanos + IA
- Productos AI-native

## 7. open | Pon tu proyecto en el radar.
¿Qué estás construyendo? · 7 palabras máximo
`;

export function buildQuestionsMdPrompt(input?: { title?: string }) {
  const title = input?.title?.trim() || "Cursor Live";

  return `Genera un archivo Markdown para configurar una sala de Cursor Live (experiencia tipo Mentimeter).

Quiero que inventes / adaptes las preguntas para este evento: "${title}".

Formato OBLIGATORIO (respeta exactamente esta estructura):

# Título del evento

## 1. word-cloud | Título de la pregunta
Texto de ayuda / instrucción corta

## 2. choice | Título de la pregunta
Texto de ayuda
- Opción A
- Opción B
- Opción C

## 3. scale | Título de la pregunta
0 — poco · 10 — mucho

## 4. ranking | Título de la pregunta
Elige tus 3 principales, en orden
- Opción A
- Opción B
- Opción C
- Opción D

## 5. open | Título de la pregunta
Respuesta corta

Tipos válidos:
- word-cloud (sin opciones; una palabra)
- choice (con opciones en bullets - )
- scale (sin opciones; escala 0-10)
- ranking (con opciones en bullets - ; top 3)
- open (sin opciones; texto corto)

Reglas:
- Entre 5 y 8 preguntas
- Español claro, tono meetup/tech
- El heading ## debe empezar con número, luego el tipo, luego | y el título
- Para choice/ranking incluye 4 a 6 opciones con "- "
- Sin tablas, sin JSON, sin explicación fuera del markdown
- Devuelve SOLO el markdown listo para guardar como questions.md

Ejemplo de referencia:

${QUESTIONS_MD_EXAMPLE}`;
}

function parseType(raw: string): QuestionType | null {
  const value = raw.trim().toLowerCase() as QuestionType;
  return TYPES.includes(value) ? value : null;
}

export function parseQuestionsMarkdown(markdown: string): {
  title: string;
  questions: Question[];
} {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "Cursor Live";
  const questions: Question[] = [];

  let current:
    | {
        type: QuestionType;
        title: string;
        prompt: string;
        options: string[];
      }
    | null = null;

  const flush = () => {
    if (!current) return;
    const question = createEmptyQuestion(current.type, questions.length + 1);
    question.title = current.title.trim() || `Pregunta ${questions.length + 1}`;
    question.prompt = current.prompt.trim() || undefined;
    if (current.type === "choice" || current.type === "ranking") {
      question.options = current.options.length
        ? current.options
        : ["Opción 1", "Opción 2", "Opción 3"];
    } else {
      question.options = undefined;
    }
    questions.push(question);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^#\s+/.test(line) && !/^##\s+/.test(line)) {
      flush();
      title = line.replace(/^#\s+/, "").trim() || title;
      continue;
    }

    const heading = line.match(
      /^##\s+(?:\d+\.\s*)?([a-z-]+)\s*\|\s*(.+)$/i,
    );
    if (heading) {
      flush();
      const type = parseType(heading[1]);
      if (!type) continue;
      current = {
        type,
        title: heading[2].trim(),
        prompt: "",
        options: [],
      };
      continue;
    }

    // Fallback: ## Título (type inferred later as open)
    const plainHeading = line.match(/^##\s+(?:\d+\.\s*)?(.+)$/);
    if (plainHeading && !heading) {
      flush();
      current = {
        type: "open",
        title: plainHeading[1].trim(),
        prompt: "",
        options: [],
      };
      continue;
    }

    if (!current) continue;

    if (/^[-*]\s+/.test(line)) {
      current.options.push(line.replace(/^[-*]\s+/, "").trim());
      continue;
    }

    if (!current.prompt) {
      current.prompt = line;
    } else {
      current.prompt = `${current.prompt} ${line}`.trim();
    }
  }

  flush();

  if (!questions.length) {
    throw new Error(
      "No se encontraron preguntas en el .md. Usa el formato ## 1. tipo | Título",
    );
  }

  return { title, questions };
}

export function buildCursorRoomCode(numberPart: string) {
  const digits = numberPart.replace(/\D/g, "").slice(0, 6);
  if (!digits) return "";
  return `CURSOR${digits}`;
}
