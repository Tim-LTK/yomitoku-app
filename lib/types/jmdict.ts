// lib/types/jmdict.ts — Phase 3.1
// Types for GET /jmdict/lookup response.
// Keep in sync with services/jmdict.py JmdictEntry and JmdictLookupResult.

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type JmdictEntry = {
  id: string;
  text: string;
  reading: string;
  jlptLevel: JlptLevel | null;
  pitchAccent: string | null;
  meanings: string[];
  partsOfSpeech: string[];
};

export type JmdictLookupSource = "jmdict" | "fallback_ai";

export type JmdictLookupResult = {
  entry: JmdictEntry | null;
  source: JmdictLookupSource;
};
