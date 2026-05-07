// lib/scan/enrichment.ts — Phase 3.1
// Enriches FlaggedItem[] with reliable JLPT levels from JMdict after a scan.
//
// Rules (from HARNESS_phase3_1_addendum.md):
// - Never set jlptLevel from AI model output once JMdict is live
// - DB result (source="jmdict") → overwrite jlptLevel unconditionally
// - AI fallback (source="fallback_ai") → leave existing AI value unchanged
// - Never cache fallback_ai results
// - Fire non-blocking — callers must not await before showing scan results
// - pitchAccent: display-only; set only from jmdict-backed entry data (never from fallback_ai)

import { lookupJmdict } from "../api/jmdict";
import { getCachedJmdictEntry, setCachedJmdictEntry } from "../storage/jmdict";
import type { FlaggedItem } from "../types/scan";

type EnrichmentDatum = {
  jlptLevel: string | null;
  /** Present only when from JMdict-backed row (cached jmdict or live jmdict). */
  pitchAccent?: string | null;
} | null;

/**
 * Enrich a list of FlaggedItems with JMdict JLPT levels.
 * Deduplicates lookups — each unique term is fetched at most once.
 * Cache-first: AsyncStorage → API → write back to cache (jmdict only).
 *
 * Returns a new array with jlptLevel fields updated where DB data is available.
 * Items whose term is not in JMdict keep their original jlptLevel.
 */
export async function enrichFlaggedItems(
  items: FlaggedItem[]
): Promise<FlaggedItem[]> {
  if (items.length === 0) return items;

  // Deduplicate terms — many items may share the same word
  const uniqueTerms = [...new Set(items.map((item) => item.text))];

  // Build a lookup map: term → enrichment row
  const entryMap = new Map<string, EnrichmentDatum>();

  await Promise.all(
    uniqueTerms.map(async (term) => {
      // 1. Check cache first
      const cached = await getCachedJmdictEntry(term);
      if (cached) {
        entryMap.set(term, {
          jlptLevel: cached.jlptLevel,
          pitchAccent: cached.pitchAccent ?? null,
        });
        return;
      }

      // 2. Fetch from API
      const result = await lookupJmdict(term);
      if (!result) {
        entryMap.set(term, null);
        return;
      }

      if (result.source === "jmdict" && result.entry) {
        // Write to cache only for confirmed DB results
        await setCachedJmdictEntry(term, result.entry);
        entryMap.set(term, {
          jlptLevel: result.entry.jlptLevel,
          pitchAccent: result.entry.pitchAccent ?? null,
        });
      } else {
        // fallback_ai — use the level if provided but don't cache; never attach pitchAccent
        entryMap.set(
          term,
          result.entry ? { jlptLevel: result.entry.jlptLevel } : null,
        );
      }
    }),
  );

  // Apply enriched levels to items
  return items.map((item) => {
    const dbData = entryMap.get(item.text);
    if (dbData === undefined) return item;
    if (!dbData) return item;

    const nextJlpt = (dbData.jlptLevel as FlaggedItem["jlptLevel"]) ?? item.jlptLevel;
    let out: FlaggedItem = {
      ...item,
      jlptLevel: nextJlpt,
    };

    if ("pitchAccent" in dbData && dbData.pitchAccent != null && dbData.pitchAccent !== "") {
      out = { ...out, pitchAccent: dbData.pitchAccent };
    }

    return out;
  });
}
