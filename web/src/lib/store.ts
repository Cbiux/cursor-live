import { Redis } from "@upstash/redis";
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

export async function getRoom(code = ROOM_CODE): Promise<RoomState> {
  const redis = getRedis();
  if (!redis) return getMemoryBundle(code).room;

  const room = await redis.get<RoomState>(roomKey(code));
  if (room) return room;

  const next = initialRoom(code);
  await redis.set(roomKey(code), next);
  return next;
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
  }

  return next;
}

export async function getQuestions(code = ROOM_CODE): Promise<Question[]> {
  const redis = getRedis();
  if (!redis) return cloneQuestions(getMemoryBundle(code).questions);

  const questions = await redis.get<Question[]>(questionsKey(code));
  if (questions?.length) return questions;

  const defaults = cloneQuestions(defaultQuestions);
  await redis.set(questionsKey(code), defaults);
  return defaults;
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
    getMemoryBundle(code).participants.set(participant.id, participant);
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
    all = Object.fromEntries(getMemoryBundle(code).participants);
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
    getMemoryBundle(code).responses.set(field, record);
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
    all = Object.fromEntries(getMemoryBundle(code).responses);
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
  const title = (await getRoom(code)).title;

  if (redis) {
    await redis.del(responsesKey(code));
    await redis.del(participantsKey(code));
    await redis.set(roomKey(code), {
      ...initialRoom(code),
      title,
    });
    await redis.set(questionsKey(code), questions);
  } else {
    const bundle = getMemoryBundle(code);
    bundle.responses.clear();
    bundle.participants.clear();
    bundle.room = { ...initialRoom(code), title };
    bundle.questions = questions;
  }
}

export function isPersistentStoreEnabled() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
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
