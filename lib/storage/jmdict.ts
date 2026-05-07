// lib/storage/jmdict.ts — Phase 3.1
// AsyncStorage cache for JMdict lookup results.
// TTL: 30 days. Never cache fallback_ai results (may be wrong).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JmdictEntry } from "../types/jmdict";

const CACHE_PREFIX = "jmdict:";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CacheRecord = {
  entry: JmdictEntry;
  cachedAt: number; // Unix ms
};

function cacheKey(term: string): string {
  return `${CACHE_PREFIX}${term}`;
}

/**
 * Read a cached JmdictEntry for the given term.
 * Returns null if not cached or if the cache entry has expired.
 */
export async function getCachedJmdictEntry(
  term: string
): Promise<JmdictEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(term));
    if (!raw) return null;

    const record: CacheRecord = JSON.parse(raw);
    const age = Date.now() - record.cachedAt;
    if (age > TTL_MS) {
      // Expired — delete and return null
      await AsyncStorage.removeItem(cacheKey(term));
      return null;
    }

    return record.entry;
  } catch {
    // Cache read errors are non-fatal
    return null;
  }
}

/**
 * Write a JmdictEntry to the cache.
 * Only call this for source="jmdict" results — never cache fallback_ai.
 */
export async function setCachedJmdictEntry(
  term: string,
  entry: JmdictEntry
): Promise<void> {
  try {
    const record: CacheRecord = {
      entry,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey(term), JSON.stringify(record));
  } catch {
    // Cache write errors are non-fatal — lookup will just re-fetch next time
  }
}
