import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AnalyseResponse } from "@/lib/types/breakdown";
import { safeParseAnalyseResponse } from "@/lib/types/breakdown";

/** Alias for persisted analyse payloads (same shape as POST /analyse). */
export type AnalyseResult = AnalyseResponse;

const keyForId = (id: string): string => `yomitoku:breakdown:v1:${id}`;

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
