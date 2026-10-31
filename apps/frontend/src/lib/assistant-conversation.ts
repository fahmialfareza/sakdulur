"use client";

import { useSyncExternalStore } from "react";
import type { ActionState } from "@/components/assistant/action-cards";
import type { AssistantAnswer, AssistantTurn } from "@/lib/api/types";

export type Message = AssistantTurn &
  Partial<Pick<AssistantAnswer, "people" | "model">> & { error?: boolean; interrupted?: boolean; actions?: ActionState[] };

type Conversation = { messages: Message[]; pending: boolean; applying: boolean };

// The Ask conversations live here, not in the screen, so an answer that arrives after the user switched tabs still
// lands. Kept per tree for this browser tab (sessionStorage); the server keeps nothing.
const conversations = new Map<string, Conversation>();
const listeners = new Set<() => void>();
const storageKey = (treeId: string) => `ft-assistant:${treeId}`;
const empty: Conversation = { messages: [], pending: false, applying: false };

function loadMessages(treeId: string): Message[] {
  try {
    const raw = sessionStorage.getItem(storageKey(treeId));
    const saved = raw ? (JSON.parse(raw) as Message[]) : [];
    // A reload in the middle of applying leaves no request running: offer the button again.
    const messages: Message[] = saved.map((m) => ({ ...m, actions: m.actions?.map((x) => (x.state === "applying" ? { ...x, state: "pending" as const } : x)) }));
    // A reload while waiting for an answer lost the request: offer a retry.
    if (messages.at(-1)?.role === "user") messages.push({ role: "assistant", content: "", error: true, interrupted: true });
    return messages;
  } catch {
    return [];
  }
}

function get(treeId: string): Conversation {
  let c = conversations.get(treeId);
  if (!c) {
    c = typeof window === "undefined" ? empty : { ...empty, messages: loadMessages(treeId) };
    conversations.set(treeId, c);
  }
  return c;
}

function update(treeId: string, patch: Partial<Conversation>) {
  conversations.set(treeId, { ...get(treeId), ...patch });
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConversation(treeId: string): Conversation {
  return useSyncExternalStore(
    subscribe,
    () => get(treeId),
    () => empty,
  );
}

export function getMessages(treeId: string): Message[] {
  return get(treeId).messages;
}

export function setMessages(treeId: string, next: Message[] | ((prev: Message[]) => Message[])) {
  const messages = typeof next === "function" ? next(get(treeId).messages) : next;
  update(treeId, { messages });
  try {
    sessionStorage.setItem(storageKey(treeId), JSON.stringify(messages.slice(-40)));
  } catch {
    // storage full or disabled: the conversation just won't survive a reload
  }
}

export const setPending = (treeId: string, pending: boolean) => update(treeId, { pending });
export const setApplying = (treeId: string, applying: boolean) => update(treeId, { applying });
