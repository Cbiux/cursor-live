"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Participant,
  Question,
  ResponseRecord,
  ResponsesBySlide,
  RoomState,
} from "./slides";

export type RoomPayload = {
  room: RoomState;
  participants: Participant[];
  responsesBySlide: ResponsesBySlide;
  questions: Question[];
  persistent: boolean;
};

export function useRoom(code = "CURSORCR", interval = 1200) {
  const [data, setData] = useState<RoomPayload | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/room?code=${code}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No se pudo conectar con la sala.");
      setData((await response.json()) as RoomPayload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión.");
    }
  }, [code]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), interval);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [interval, refresh]);

  return { data, error, refresh };
}

export async function joinRoom(input: {
  code: string;
  participantId: string;
  name: string;
}) {
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "join", ...input }),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "No se pudo entrar.");
}

export async function sendResponse(input: {
  code: string;
  participantId: string;
  name: string;
  slideId: number;
  value: string | number | string[];
}) {
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "respond", ...input }),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "No se pudo responder.");
}

export async function hostAction(input: {
  code: string;
  hostKey: string;
  action: "start" | "stop" | "next" | "previous" | "set" | "reset";
  targetIndex?: number;
}) {
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "host", ...input }),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar.");
}

export async function saveDeck(input: {
  code: string;
  hostKey: string;
  title: string;
  questions: Question[];
}) {
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "save-deck", ...input }),
  });
  const result = (await response.json()) as {
    error?: string;
    room?: RoomState;
    questions?: Question[];
  };
  if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
  return result;
}

export async function createRoom(input: {
  code?: string;
  hostKey: string;
  title: string;
  questions?: Question[];
}) {
  const response = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "create-room", ...input }),
  });
  const result = (await response.json()) as {
    error?: string;
    room?: RoomState;
    questions?: Question[];
  };
  if (!response.ok) throw new Error(result.error ?? "No se pudo crear la sala.");
  return result;
}

export function responsesFor(
  bySlide: ResponsesBySlide | undefined,
  slideId: number,
): ResponseRecord[] {
  return bySlide?.[slideId] ?? [];
}
