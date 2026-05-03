/**
 * Whether placement chat shows English under Japanese (初心者〜N4).
 * Pass "hajimete" for 完全初心者 tier; pass "n5" / "n4" etc. for JLPT-ish bands.
 */
export function showTranslation(level: string | null): boolean {
  if (level == null) {
    return false;
  }
  const l = level.toLowerCase();
  return l === "hajimete" || l === "n5" || l === "n4";
}
