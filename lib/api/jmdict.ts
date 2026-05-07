// lib/api/jmdict.ts — Phase 3.1
// Typed fetch wrapper for GET /jmdict/lookup.
// All API calls go through lib/api/client.ts — never inline fetch in components.

import { apiClient } from "./client";
import type { JmdictLookupResult } from "../types/jmdict";

/**
 * Look up a Japanese term in JMdict.
 * Returns null if the request fails — callers should handle gracefully.
 * Never throws — enrichment is non-critical and must not break the scan flow.
 */
export async function lookupJmdict(
  term: string
): Promise<JmdictLookupResult | null> {
  try {
    const result = await apiClient<JmdictLookupResult>(
      `/jmdict/lookup?term=${encodeURIComponent(term)}`
    );
    return result;
  } catch (error) {
    console.warn(`[jmdict] lookup failed for "${term}":`, error);
    return null;
  }
}
