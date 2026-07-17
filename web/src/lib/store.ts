import { getCache } from "@vercel/functions";
import { Redis } from "@upstash/redis";
import {
  hashHostKey,
  hostKeysMatch,
  isAdminHostKey,
} from "./host-auth";
import {
  coerceValueForQuestion,
  matchQuestion,
  parseResponsesMarkdown,
} from "./responses-md";
import {
  ROOM_CODE,
  cloneQuestions,
  defaultQuestions,
  type Participant,
  type Question,
  type ResponseRecord,
  type ResponseValue,
  type ResponsesBySlide,
  type RoomState,
} from "./slides";

type RoomBundle = {
  room: RoomState;
  questions: Question[];
  participants: Map<string, Participant>;
  responses: Map<string, ResponseRecord>;
};

type MemoryStore = {
  rooms: Map<string, RoomBundle>;
};

declare global {
  var __cursorMeetupStore: MemoryStore | undefined;
}

const SESSION_TTL_SECONDS = 60 * 60 * 12;

function initialRoom(code: string): RoomState {
  return {
    code,
    title: "Cursor Live",
    presenting: false,
    carouselIndex: 0,
    updatedAt: Date.now(),
  };
}

function createBundle(code: string): RoomBundle {
  return {
    room: initialRoom(code),
    questions: cloneQuestions(defaultQuestions),
    participants: new Map(),
    responses: new Map(),
  };
}

function isValidMemoryStore(
  value: unknown,
): value is MemoryStore {
  if (!value || typeof value !== "object") return false;
  const rooms = (value as MemoryStore).rooms;
  return rooms instanceof Map;
}

function memoryStore(): MemoryStore {
  if (!isValidMemoryStore(globalThis.__cursorMeetupStore)) {
    globalThis.__cursorMeetupStore = {
      rooms: new Map([[ROOM_CODE, createBundle(ROOM_CODE)]]),
    };
  }
  return globalThis.__cursorMeetupStore;
}

function getMemoryBundle(code: string) {
  const store = memoryStore();
  const existing = store.rooms.get(code);
  const valid =
    existing &&
    existing.room &&
    Array.isArray(existing.questions) &&
    existing.participants instanceof Map &&
    existing.responses instanceof Map;

  if (!valid) {
    const bundle = createBundle(code);
    store.rooms.set(code, bundle);
    return bundle;
  }

  return existing;
}

function getRedis() {
  const hasRedis =
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN;
  return hasRedis ? Redis.fromEnv() : null;
}

function runtimeCache() {
  return getCache({ namespace: "cursor-live" });
}

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await runtimeCache().get(key);
    return (value as T | undefined) ?? null;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: unknown, tags: string[]) {
  try {
    await runtimeCache().set(key, value, {
      ttl: SESSION_TTL_SECONDS,
      tags,
      name: key,
    });
  } catch {
    /* Local/dev without Runtime Cache support. */
  }
}

async function cacheDelete(key: string) {
  try {
    await runtimeCache().delete(key);
  } catch {
    /* ignore */
  }
}

function roomKey(code: string) {
  return `cursor-live:room:${code}`;
}

function questionsKey(code: string) {
  return `cursor-live:questions:${code}`;
}

function participantsKey(code: string) {
  return `cursor-live:participants:${code}`;
}

function responsesKey(code: string) {
  return `cursor-live:responses:${code}`;
}

function roomTags(code: string) {
  return [`room:${code}`];
}

export async function getRoom(code = ROOM_CODE): Promise<RoomState> {
  const redis = getRedis();
  if (redis) {
    const room = await redis.get<RoomState>(roomKey(code));
    if (room) return room;
    const next = initialRoom(code);
    await redis.set(roomKey(code), next);
    return next;
  }

  const cached = await cacheGet<RoomState>(roomKey(code));
  if (cached) {
    getMemoryBundle(code).room = cached;
    return cached;
  }

  return getMemoryBundle(code).room;
}

export async function setRoom(
  patch: Partial<RoomState>,
  code = ROOM_CODE,
): Promise<RoomState> {
  const current = await getRoom(code);
  const next = { ...current, ...patch, code, updatedAt: Date.now() };
  const redis = getRedis();

  if (redis) {
    await redis.set(roomKey(code), next);
  } else {
    getMemoryBundle(code).room = next;
    await cacheSet(roomKey(code), next, roomTags(code));
  }

  return next;
}

export async function getQuestions(code = ROOM_CODE): Promise<Question[]> {
  const redis = getRedis();
  if (redis) {
    const questions = await redis.get<Question[]>(questionsKey(code));
    if (questions?.length) return questions;
    const defaults = cloneQuestions(defaultQuestions);
    await redis.set(questionsKey(code), defaults);
    return defaults;
  }

  const cached = await cacheGet<Question[]>(questionsKey(code));
  if (cached?.length) {
    getMemoryBundle(code).questions = cached;
    return cloneQuestions(cached);
  }

  return cloneQuestions(getMemoryBundle(code).questions);
}

export async function saveQuestions(
  questions: Question[],
  code = ROOM_CODE,
): Promise<Question[]> {
  const cleaned = questions.map((question, index) => ({
    ...question,
    id: question.id || index + 1,
    title: question.title.trim() || `Pregunta ${index + 1}`,
    prompt: question.prompt?.trim() || undefined,
    options: question.options
      ?.map((option) => option.trim())
      .filter(Boolean),
  }));

  const redis = getRedis();
  if (redis) {
    await redis.set(questionsKey(code), cleaned);
  } else {
    getMemoryBundle(code).questions = cleaned;
    await cacheSet(questionsKey(code), cleaned, roomTags(code));
  }

  await setRoom({ carouselIndex: 0 }, code);
  return cleaned;
}

export async function saveParticipant(input: {
  code?: string;
  id: string;
  name: string;
}) {
  const code = input.code ?? ROOM_CODE;
  const participant: Participant = {
    id: input.id,
    name: input.name.trim().slice(0, 24),
    joinedAt: Date.now(),
  };
  const redis = getRedis();

  if (redis) {
    await redis.hset(participantsKey(code), { [participant.id]: participant });
  } else {
    const bundle = getMemoryBundle(code);
    bundle.participants.set(participant.id, participant);
    const all = Object.fromEntries(bundle.participants);
    const cached =
      (await cacheGet<Record<string, Participant>>(participantsKey(code))) ??
      {};
    cached[participant.id] = participant;
    // Prefer merged cache + memory so other instances see joins.
    const merged = { ...cached, ...all };
    bundle.participants = new Map(Object.entries(merged));
    await cacheSet(participantsKey(code), merged, roomTags(code));
  }

  return participant;
}

export async function getParticipants(
  code = ROOM_CODE,
): Promise<Participant[]> {
  const redis = getRedis();
  let all: Record<string, Participant>;

  if (redis) {
    all =
      (await redis.hgetall<Record<string, Participant>>(
        participantsKey(code),
      )) ?? {};
  } else {
    const cached =
      (await cacheGet<Record<string, Participant>>(participantsKey(code))) ??
      {};
    const memory = Object.fromEntries(getMemoryBundle(code).participants);
    all = { ...cached, ...memory };
    getMemoryBundle(code).participants = new Map(Object.entries(all));
  }

  return Object.values(all).sort((a, b) => a.joinedAt - b.joinedAt);
}

export async function saveResponse(input: {
  code?: string;
  participantId: string;
  name: string;
  slideId: number;
  value: ResponseValue;
}) {
  const code = input.code ?? ROOM_CODE;
  const record: ResponseRecord = {
    participantId: input.participantId,
    name: input.name.trim().slice(0, 24),
    slideId: input.slideId,
    value: input.value,
    createdAt: Date.now(),
  };
  const field = `${input.slideId}:${input.participantId}`;
  const redis = getRedis();

  if (redis) {
    await redis.hset(responsesKey(code), { [field]: record });
  } else {
    const bundle = getMemoryBundle(code);
    bundle.responses.set(field, record);
    const cached =
      (await cacheGet<Record<string, ResponseRecord>>(responsesKey(code))) ??
      {};
    const memory = Object.fromEntries(bundle.responses);
    const merged = { ...cached, ...memory, [field]: record };
    bundle.responses = new Map(Object.entries(merged));
    await cacheSet(responsesKey(code), merged, roomTags(code));
  }

  return record;
}

export async function getAllResponses(
  code = ROOM_CODE,
): Promise<ResponsesBySlide> {
  const redis = getRedis();
  let all: Record<string, ResponseRecord>;

  if (redis) {
    all =
      (await redis.hgetall<Record<string, ResponseRecord>>(
        responsesKey(code),
      )) ?? {};
  } else {
    const cached =
      (await cacheGet<Record<string, ResponseRecord>>(responsesKey(code))) ??
      {};
    const memory = Object.fromEntries(getMemoryBundle(code).responses);
    all = { ...cached, ...memory };
    getMemoryBundle(code).responses = new Map(Object.entries(all));
  }

  const bySlide: ResponsesBySlide = {};
  for (const record of Object.values(all)) {
    if (!bySlide[record.slideId]) bySlide[record.slideId] = [];
    bySlide[record.slideId].push(record);
  }

  for (const slideId of Object.keys(bySlide)) {
    bySlide[Number(slideId)].sort((a, b) => a.createdAt - b.createdAt);
  }

  return bySlide;
}

export async function clearSession(code = ROOM_CODE) {
  const redis = getRedis();
  const questions = await getQuestions(code);
  const current = await getRoom(code);
  const title = current.title;
  const hostKeyHash = current.hostKeyHash;
  const clearedRoom = { ...initialRoom(code), title, hostKeyHash };

  if (redis) {
    await redis.del(responsesKey(code));
    await redis.del(participantsKey(code));
    await redis.set(roomKey(code), clearedRoom);
    await redis.set(questionsKey(code), questions);
  } else {
    const bundle = getMemoryBundle(code);
    bundle.responses.clear();
    bundle.participants.clear();
    bundle.room = clearedRoom;
    bundle.questions = questions;
    await cacheDelete(responsesKey(code));
    await cacheDelete(participantsKey(code));
    await cacheSet(roomKey(code), clearedRoom, roomTags(code));
    await cacheSet(questionsKey(code), questions, roomTags(code));
  }
}

const DEMO_NAMES = [
  "Ana", "Bruno", "Camila", "Diego", "Elena", "Fabián", "Gina", "Hugo",
  "Irene", "Jorge", "Karla", "Luis", "Maya", "Nico", "Olga", "Pablo",
  "Quinn", "Rosa", "Sofía", "Tomás", "Uma", "Valeria", "Wendy", "Ximena",
  "Yago", "Zoe", "Andrés", "Beatriz", "Carlos", "Daniela", "Esteban",
  "Fernanda", "Gabriel", "Helena", "Iván", "Jimena", "Kevin", "Laura",
  "Mateo", "Nadia", "Oscar", "Patricia", "Rafael", "Sara", "Thiago",
  "Úrsula", "Víctor", "Walter", "Yazmín", "Zacarías",
];

const DEMO_PROJECTS = [
  "Zeek", "Cursor Tips CR", "AI Notes", "Meetup Bot", "Local LLM",
  "Ticket POS", "Green Route", "Study Buddy", "Hack CR", "Prompt Lab",
  "Dev Radar", "Ship Fast", "Cafe Finder", "Code Coach", "Live Poll",
  "Focus Timer", "Repo Digest", "Slide Sync", "Voice Notes", "CR Jobs",
  "Pixel Farm", "Noise Cancel", "Mapa Local", "Open Desk", "Bug Hunt",
  "Skill Tree", "Night Deploy", "Coffee Queue", "Token Vault", "Soft Launch",
  "Pulse Check", "Draft Room", "Edge Kit", "Form Wizard", "Clip Board",
  "Story Engine", "Data Garden", "Portable API", "Inbox Zero", "Lane Switch",
  "Quick Sketch", "Mentor Match", "Cloud Scratch", "Tiny CRM", "Wave Rider",
  "Nova Board", "Signal Tap", "Craft Mode", "Orbit Docs", "Bright Path",
  "Kernel Lab", "Soft Fork", "Paper Trail", "Glow Up", "Deep Dive",
  "Fast Lane", "Quiet Room", "Build Log", "Spark Deck", "Clear Cache",
  "North Star", "Side Quest", "Echo Chamber", "Grid Lock", "Blue Print",
  "Open Source", "Late Night", "First Commit", "Hot Reload", "Cold Start",
  "Soft Skills", "Hard Mode", "User Story", "Dark Theme", "Light Mode",
  "Ship It", "Hold On", "Try Again", "Keep Going", "Start Over",
  "Next Slide", "Live Feed", "Name Wall", "Word Cloud", "Rank Board",
  "Scale Meter", "Open Card", "Join Code", "Host Key", "Demo Seed",
  "Cursor Live", "Meetup CR", "Costa Rica", "San José", "Cartago Hub",
  "Heredia Lab", "Puntarenas", "Guanacaste", "Limón Port", "Alajuela Dev",
];

const DEMO_WORDS = [
  "aprender", "network", "cursor", "comunidad", "ideas", "empleos",
  "proyectos", "mentores", "IA", "inspiración", "amigos", "código",
  "agente", "modelo", "prompt", "deploy", "producto", "diseño",
  "datos", "startup", "freelance", "remoto", "oficina", "meetup",
  "coffee", "demo", "pitch", "feedback", "crecimiento", "carrera",
  "portfolio", "github", "opensource", "typescript", "python", "react",
  "nextjs", "vercel", "redis", "api", "mcp", "herramientas",
  "automatizar", "refactor", "tests", "bugs", "docs", "pairing",
  "focus", "flow", "velocidad", "calidad", "impacto", "usuarios",
  "clientes", "equipo", "liderazgo", "aprendizaje", "curiosidad", "reto",
  "experimentar", "prototipo", "mvp", "lanzar", "iterar", "medir",
  "analítica", "seguridad", "privacidad", "accesibilidad", "ux", "ui",
  "mobile", "web", "cloud", "edge", "latency", "escala",
  "costos", "pricing", "ventas", "marketing", "contenido", "comunidadtech",
  "hackathon", "workshop", "charla", "networking", "oportunidad", "empleo",
  "beca", "curso", "certificación", "ingles", "español", "remotoCR",
  "híbrido", "freelanceCR", "sideproject", "hobby", "pasión", "misión",
];

function uniqueShuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = (seed * 31 + i * 17) % (i + 1);
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function demoValueFor(question: Question, index: number): ResponseValue {
  if (question.type === "word-cloud") {
    const base = DEMO_WORDS[index % DEMO_WORDS.length];
    // Keep values unique even past the word list length.
    return index < DEMO_WORDS.length ? base : `${base}${index}`;
  }
  if (question.type === "choice") {
    const options = question.options ?? ["Opción 1", "Opción 2", "Opción 3"];
    // Spread across options with a prime stride so consecutive seeds differ.
    return options[(index * 7) % options.length];
  }
  if (question.type === "ranking") {
    const options = question.options ?? ["Opción 1", "Opción 2", "Opción 3"];
    return uniqueShuffle(options, index + 1).slice(0, Math.min(3, options.length));
  }
  if (question.type === "scale") {
    // Visit every score before repeating, with offset per seed batch.
    return (index * 3) % 11;
  }
  const project = DEMO_PROJECTS[index % DEMO_PROJECTS.length];
  return index < DEMO_PROJECTS.length
    ? project
    : `${project} v${Math.floor(index / DEMO_PROJECTS.length) + 1}`;
}

export async function seedDemoResponses(input: {
  code?: string;
  count: number;
}) {
  const code = input.code ?? ROOM_CODE;
  const count = Math.max(1, Math.min(100, Math.floor(input.count)));
  const questions = await getQuestions(code);

  for (let index = 0; index < count; index += 1) {
    const name = `${DEMO_NAMES[index % DEMO_NAMES.length]}${index + 1}`;
    const participantId = `demo-${code}-${index}`;
    await saveParticipant({ code, id: participantId, name });

    for (const question of questions) {
      await saveResponse({
        code,
        participantId,
        name,
        slideId: question.id,
        value: demoValueFor(question, index),
      });
    }
  }

  await setRoom({ presenting: true }, code);
  return { count, questions: questions.length };
}

export async function importMarkdownResponses(input: {
  code?: string;
  markdown: string;
  slideId?: number;
}) {
  const code = input.code ?? ROOM_CODE;
  const questions = await getQuestions(code);
  if (!questions.length) {
    return { imported: 0, skipped: 0, total: 0 };
  }

  const fallback =
    questions.find((question) => question.id === input.slideId) ?? questions[0];
  const parsed = parseResponsesMarkdown(input.markdown);
  let imported = 0;
  let skipped = 0;

  for (const [index, item] of parsed.entries()) {
    const question = matchQuestion(questions, item.questionHint, fallback);
    if (!question) {
      skipped += 1;
      continue;
    }
    const value = coerceValueForQuestion(question, item.value);
    if (value === null) {
      skipped += 1;
      continue;
    }

    const participantId = `md-${code}-${index}-${item.name}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 48);
    const id = participantId || `md-${code}-${index}`;
    await saveParticipant({
      code,
      id,
      name: item.name,
    });
    await saveResponse({
      code,
      participantId: id,
      name: item.name,
      slideId: question.id,
      value,
    });
    imported += 1;
  }

  if (imported > 0) {
    await setRoom({ presenting: true }, code);
  }

  return { imported, skipped, total: parsed.length };
}

export async function roomHasHostKey(code = ROOM_CODE) {
  const room = await getRoom(code);
  return Boolean(room.hostKeyHash);
}

export async function claimOrVerifyHostKey(
  code: string,
  hostKey: string,
  options: { allowClaim?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { allowClaim = false } = options;
  const room = await getRoom(code);

  if (isAdminHostKey(hostKey)) {
    return { ok: true };
  }

  if (!room.hostKeyHash) {
    if (!allowClaim) {
      return {
        ok: false,
        error: "Esta sala aún no tiene clave. Créala o guárdala desde Hostear.",
        status: 403,
      };
    }
    await setRoom({ hostKeyHash: hashHostKey(hostKey) }, code);
    return { ok: true };
  }

  if (!hostKeysMatch(room.hostKeyHash, hostKey)) {
    return {
      ok: false,
      error: "Clave de host incorrecta para esta sala.",
      status: 401,
    };
  }

  return { ok: true };
}

export async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateRoomCode();
    const room = await getRoom(code);
    if (room.hostKeyHash) continue;

    const participants = await getParticipants(code);
    if (participants.length) continue;

    const responses = await getAllResponses(code);
    const hasResponses = Object.values(responses).some((list) => list.length);
    if (hasResponses) continue;

    return code;
  }
  return generateRoomCode();
}

export function isPersistentStoreEnabled() {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return true;
  }
  // Runtime Cache is shared across serverless instances on Vercel.
  return Boolean(process.env.VERCEL);
}

export function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
