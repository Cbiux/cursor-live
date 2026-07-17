import type { Question, ResponseValue } from "./slides";

export type ParsedMdResponse = {
  name: string;
  value: string;
  questionHint?: string;
};

export const RESPONSES_MD_EXAMPLE = `# Respuestas Cursor Live

Usa un bloque por persona. El título ### es el nombre; el texto debajo es la respuesta.

### Ana García
Zeek

### Bruno López
Cursor Tips CR

### Camila Rojas
Meetup Bot

---

También acepta formato corto (una línea):

- Diego Mora: AI Notes
- Elena Vargas: Local LLM
- Fabián Solís | Green Route
`;

export function buildResponsesMdPrompt(input: {
  count?: number;
  question?: Question;
  questions?: Question[];
}) {
  const count = input.count ?? 40;
  const question = input.question;
  const all = input.questions ?? (question ? [question] : []);

  const questionBlock = question
    ? [
        `Pregunta actual:`,
        `- Título: ${question.title}`,
        question.prompt ? `- Ayuda: ${question.prompt}` : null,
        `- Tipo: ${question.type}`,
        question.options?.length
          ? `- Opciones válidas: ${question.options.join(" | ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Genera respuestas para la pregunta abierta del meetup.";

  const multi =
    all.length > 1
      ? `\nSi generas varias preguntas, separa cada una con un heading ## y el título exacto de la pregunta.\n`
      : "";

  return `Genera un archivo Markdown con exactamente ${count} respuestas realistas en español para una experiencia en vivo tipo Mentimeter (Cursor Live).

${questionBlock}
${multi}
Formato OBLIGATORIO (respeta exactamente esta estructura):

# Respuestas Cursor Live

### Nombre Completo
respuesta corta aquí

### Otro Nombre
otra respuesta

Reglas:
- Una persona por bloque ### Nombre
- La respuesta va en la línea siguiente (1 frase corta o máximo 7 palabras si la pregunta lo pide)
- Nombres costarricenses / latinos variados, sin repetir
- Sin tablas, sin JSON, sin explicaciones fuera del markdown
- Si el tipo es choice/ranking, la respuesta debe ser exactamente una de las opciones
- Si el tipo es scale, la respuesta debe ser un número entero de 0 a 10
- Si el tipo es word-cloud, una sola palabra
- Si el tipo es open, un nombre de proyecto o frase corta

Devuelve SOLO el markdown listo para guardar como responses.md`;
}

function cleanName(value: string) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\*\*/g, "")
    .trim()
    .slice(0, 24);
}

function cleanValue(value: string) {
  return value.replace(/\*\*/g, "").trim();
}

function parseLineItem(line: string): ParsedMdResponse | null {
  const bullet = line.match(/^[-*]\s*(.+?)\s*[:|—–-]\s*(.+)$/);
  if (bullet) {
    return {
      name: cleanName(bullet[1]),
      value: cleanValue(bullet[2]),
    };
  }

  const pipe = line.match(/^([^|#]+)\|([^|#]+)$/);
  if (pipe) {
    return {
      name: cleanName(pipe[1]),
      value: cleanValue(pipe[2]),
    };
  }

  return null;
}

export function parseResponsesMarkdown(markdown: string): ParsedMdResponse[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const items: ParsedMdResponse[] = [];
  let currentQuestion: string | undefined;
  let currentName: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentName) return;
    const value = cleanValue(buffer.join(" ").trim());
    if (value) {
      items.push({
        name: currentName,
        value,
        questionHint: currentQuestion,
      });
    }
    currentName = null;
    buffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^---+$/.test(line)) {
      flush();
      continue;
    }
    if (/^#\s+/.test(line) && !/^###\s+/.test(line)) {
      flush();
      if (/^##\s+/.test(line)) {
        currentQuestion = cleanName(line.replace(/^##\s+/, "").replace(/^Q\d+:\s*/i, ""));
      }
      continue;
    }
    if (/^###\s+/.test(line)) {
      flush();
      currentName = cleanName(line);
      continue;
    }

    const inline = parseLineItem(line);
    if (inline) {
      flush();
      items.push({
        ...inline,
        questionHint: currentQuestion,
      });
      continue;
    }

    if (currentName) {
      buffer.push(line);
    }
  }

  flush();
  return items.filter((item) => item.name && item.value);
}

export function coerceValueForQuestion(
  question: Question,
  raw: string,
): ResponseValue | null {
  const value = raw.trim();
  if (!value) return null;

  if (question.type === "scale") {
    const number = Number(value.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(10, Math.round(number)));
  }

  if (question.type === "choice") {
    const options = question.options ?? [];
    const exact = options.find(
      (option) => option.toLocaleLowerCase("es") === value.toLocaleLowerCase("es"),
    );
    if (exact) return exact;
    const partial = options.find((option) =>
      option.toLocaleLowerCase("es").includes(value.toLocaleLowerCase("es")),
    );
    return partial ?? value;
  }

  if (question.type === "ranking") {
    const options = question.options ?? [];
    const parts = value
      .split(/[>,|]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const exact = options.find(
          (option) =>
            option.toLocaleLowerCase("es") === part.toLocaleLowerCase("es"),
        );
        return (
          exact ??
          options.find((option) =>
            option.toLocaleLowerCase("es").includes(part.toLocaleLowerCase("es")),
          ) ??
          part
        );
      });
    const unique = [...new Set(parts)].slice(0, 3);
    return unique.length ? unique : null;
  }

  if (question.type === "word-cloud") {
    return value.split(/\s+/)[0]?.slice(0, 24) ?? null;
  }

  return value.slice(0, 120);
}

export function matchQuestion(
  questions: Question[],
  hint?: string,
  fallback?: Question,
) {
  if (!hint) return fallback ?? questions[0];
  const needle = hint.toLocaleLowerCase("es");
  return (
    questions.find((question) =>
      question.title.toLocaleLowerCase("es").includes(needle),
    ) ??
    questions.find((question) =>
      needle.includes(question.title.toLocaleLowerCase("es").slice(0, 18)),
    ) ??
    fallback ??
    questions[0]
  );
}
