import AsyncStorage from "@react-native-async-storage/async-storage";

import type { KnowledgeGap } from "@/lib/types/gaps";

export const GAP_SRS_SCHEDULE_STORAGE_KEY = "yomitoku:gap_srs_schedule:v1" as const;

export type GapSrsScheduleEntry = {
  nextReviewAt: string;
  intervalDays: number;
};

async function loadRawMap(): Promise<Record<string, GapSrsScheduleEntry>> {
  const raw = await AsyncStorage.getItem(GAP_SRS_SCHEDULE_STORAGE_KEY);
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, GapSrsScheduleEntry>;
  } catch {
    return {};
  }
}

async function saveRawMap(entries: Record<string, GapSrsScheduleEntry>): Promise<void> {
  await AsyncStorage.setItem(GAP_SRS_SCHEDULE_STORAGE_KEY, JSON.stringify(entries));
}

export async function persistGapSchedule(id: string, entry: GapSrsScheduleEntry): Promise<void> {
  const map = await loadRawMap();
  map[id] = entry;
  await saveRawMap(map);
}

/** Merge schedule overlay so due-date filtering survives API rows that omit Phase-3 SRS fields. */

export async function mergeKnowledgeGapsWithLocalSchedule(
  gaps: KnowledgeGap[],
): Promise<KnowledgeGap[]> {
  const map = await loadRawMap();
  return gaps.map((g) => mergeScheduleIntoGap(g, map[g.id]));
}

export function mergeScheduleIntoGap(
  gap: KnowledgeGap,
  entry: GapSrsScheduleEntry | undefined,
): KnowledgeGap {
  if (!entry) {
    return gap;
  }
  return {
    ...gap,
    nextReviewAt: entry.nextReviewAt,
    intervalDays: entry.intervalDays,
  };
}

export function isKnowledgeGapDue(gap: KnowledgeGap, nowMs: number = Date.now()): boolean {
  const raw = gap.nextReviewAt;
  if (raw === null || raw === undefined || raw.trim().length === 0) {
    return true;
  }
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) {
    return true;
  }
  return t <= nowMs;
}
