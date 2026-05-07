import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ScanResult } from "@/lib/types/scan";

const RECENT_SCANS_KEY = "yomitoku:recentScans:v1";
const RECENT_SCANS_MAX = 20;

const PASSAGE_PREVIEW_MAX = 120;

export type RecentScan = {
  id: string;
  passage: string;
  overallDifficulty: ScanResult["overallDifficulty"];
  flaggedCount: number;
  scannedAt: string;
};

function passagePreviewFromScan(scanResult: ScanResult): string {
  const trimmed = scanResult.passage.trim();
  if (trimmed.length <= PASSAGE_PREVIEW_MAX) {
    return trimmed;
  }
  return trimmed.slice(0, PASSAGE_PREVIEW_MAX);
}

function isRecentScan(x: unknown): x is RecentScan {
  if (typeof x !== "object" || x === null) {
    return false;
  }
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.passage === "string" &&
    typeof r.overallDifficulty === "string" &&
    typeof r.flaggedCount === "number" &&
    typeof r.scannedAt === "string"
  );
}

export async function upsertScanToRecentList(scanResult: ScanResult): Promise<void> {
  const passageDisplay = passagePreviewFromScan(scanResult);
  const scannedAt = new Date().toISOString();

  const raw = await AsyncStorage.getItem(RECENT_SCANS_KEY);
  let list: RecentScan[] = [];
  if (raw?.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(isRecentScan);
      }
    } catch {
      list = [];
    }
  }

  list = list.filter((e) => e.passage !== passageDisplay);

  list.unshift({
    id: Date.now().toString(),
    passage: passageDisplay,
    overallDifficulty: scanResult.overallDifficulty,
    flaggedCount: scanResult.flaggedItems.length,
    scannedAt,
  });

  list = list.slice(0, RECENT_SCANS_MAX);
  await AsyncStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(list));
}
