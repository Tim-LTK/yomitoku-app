import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AnalyseResponse } from "@/lib/types/breakdown";
import { safeParseAnalyseResponse } from "@/lib/types/breakdown";
import { elementExplanationSchema, type ElementExplanation } from "@/lib/types/gaps";

/** Alias for persisted analyse payloads (same shape as POST /analyse). */
export type AnalyseResult = AnalyseResponse;

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
