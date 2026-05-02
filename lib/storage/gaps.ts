import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BreakdownElement } from "@/lib/types/breakdown";
import {
  knowledgeGapSchema,
  knowledgeGapsArraySchema,
  type ElementExplanation,
  type KnowledgeGap,
} from "@/lib/types/gaps";

const STORAGE_KEY = "yomitoku:knowledge_gaps:v1";

function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export function buildKnowledgeGap(params: {
  breakdownRouteId: string;
  sentenceIndex: number;
  sourceSentence: string;
  element: BreakdownElement;
  explanationSnapshot: ElementExplanation;
}): KnowledgeGap {
  const draft = {
    id: newId(),
    createdAtIso: new Date().toISOString(),
    ...params,
  };
  return knowledgeGapSchema.parse(draft);
}

export async function loadKnowledgeGaps(): Promise<KnowledgeGap[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const res = knowledgeGapsArraySchema.safeParse(parsed);
    return res.success ? res.data : [];
  } catch {
    return [];
  }
}

export async function saveKnowledgeGaps(gaps: KnowledgeGap[]): Promise<void> {
  const parsed = knowledgeGapsArraySchema.parse(gaps);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
}

export async function appendKnowledgeGap(gap: KnowledgeGap): Promise<void> {
  const valid = knowledgeGapSchema.parse(gap);
  const current = await loadKnowledgeGaps();
  await saveKnowledgeGaps([...current, valid]);
}

export async function deleteKnowledgeGap(id: string): Promise<void> {
  const current = await loadKnowledgeGaps();
  await saveKnowledgeGaps(current.filter((g) => g.id !== id));
}

export async function updateKnowledgeGap(
  id: string,
  patch: Partial<Omit<KnowledgeGap, "id">>,
): Promise<boolean> {
  const current = await loadKnowledgeGaps();
  const i = current.findIndex((g) => g.id === id);
  if (i === -1) {
    return false;
  }
  const merged = { ...current[i], ...patch };
  const validated = knowledgeGapSchema.safeParse(merged);
  if (!validated.success) {
    return false;
  }
  const copy = [...current];
  copy[i] = validated.data;
  await saveKnowledgeGaps(copy);
  return true;
}

export async function clearKnowledgeGaps(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
