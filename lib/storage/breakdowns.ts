import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AnalyseResponse } from "@/lib/types/breakdown";
import { safeParseAnalyseResponse } from "@/lib/types/breakdown";
import { elementExplanationSchema, type ElementExplanation } from "@/lib/types/gaps";

/** Alias for persisted analyse payloads (same shape as POST /analyse). */
export type AnalyseResult = AnalyseResponse;

const RECENT_KEY = "yomitoku:recent:v1";
const RECENT_MAX = 5;

export type RecentBreakdownEntry = {
  id: string;
  preview: string;
  analysedAt: string;
};

function previewFromPayload(payload: AnalyseResult): string {
  const original = payload.breakdowns[0]?.original ?? "";
  if (original.length <= 30) {
    return original;
  }
  return original.slice(0, 30);
}

function isRecentEntry(x: unknown): x is RecentBreakdownEntry {
  if (typeof x !== "object" || x === null) {
    return false;
  }
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" && typeof r.preview === "string" && typeof r.analysedAt === "string"
  );
}

async function upsertRecentBreakdownEntry(id: string, payload: AnalyseResult): Promise<void> {
  const preview = previewFromPayload(payload);
  const analysedAt = new Date().toISOString();
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  let list: RecentBreakdownEntry[] = [];
  if (raw?.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(isRecentEntry);
      }
    } catch {
      list = [];
    }
  }
  list = list.filter((e) => e.id !== id);
  list.unshift({ id, preview, analysedAt });
  list = list.slice(0, RECENT_MAX);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export async function upsertRecentScanEntry(id: string, preview: string): Promise<void> {
  const analysedAt = new Date().toISOString();
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  let list: RecentBreakdownEntry[] = [];
  if (raw?.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(isRecentEntry);
      }
    } catch {
      list = [];
    }
  }
  list = list.filter((e) => e.id !== id);
  list.unshift({ id, preview: preview.slice(0, 30), analysedAt });
  list = list.slice(0, RECENT_MAX);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export async function listRecentBreakdowns(): Promise<RecentBreakdownEntry[]> {
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRecentEntry).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

const keyForId = (id: string): string => `yomitoku:breakdown:v1:${id}`;

/** Full key shape: `yomitoku:explain:v1:${breakdownId}:${key}`. */
function explainStorageKey(breakdownId: string, key: string): string {
  return `yomitoku:explain:v1:${breakdownId}:${key}`;
}

function explainPrefixForBreakdown(breakdownId: string): string {
  return `yomitoku:explain:v1:${breakdownId}:`;
}

export async function saveBreakdown(id: string, payload: AnalyseResult): Promise<void> {
  await AsyncStorage.setItem(keyForId(id), JSON.stringify(payload));
  await upsertRecentBreakdownEntry(id, payload);
}

export async function loadBreakdown(id: string): Promise<AnalyseResult | null> {
  const raw = await AsyncStorage.getItem(keyForId(id));
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const res = safeParseAnalyseResponse(parsed);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

export async function saveExplainResult(
  breakdownId: string,
  key: string,
  explanation: ElementExplanation,
): Promise<void> {
  await AsyncStorage.setItem(explainStorageKey(breakdownId, key), JSON.stringify(explanation));
}

export async function loadExplainResult(
  breakdownId: string,
  key: string,
): Promise<ElementExplanation | null> {
  const raw = await AsyncStorage.getItem(explainStorageKey(breakdownId, key));
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const res = elementExplanationSchema.safeParse(parsed);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

/** All persisted `{sentenceIdx}-{elemIdx}` explanations for one breakdown route id. */
export async function loadAllExplainResultsForBreakdown(
  breakdownId: string,
): Promise<Map<string, ElementExplanation>> {
  const out = new Map<string, ElementExplanation>();
  const prefix = explainPrefixForBreakdown(breakdownId);
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter((k) => k.startsWith(prefix));
  if (keys.length === 0) {
    return out;
  }
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [storageKey, raw] of pairs) {
    if (!raw?.trim()) {
      continue;
    }
    const cacheKey = storageKey.slice(prefix.length);
    try {
      const parsed: unknown = JSON.parse(raw);
      const res = elementExplanationSchema.safeParse(parsed);
      if (res.success) {
        out.set(cacheKey, res.data);
      }
    } catch {
      continue;
    }
  }
  return out;
}
