/**
 * Whether placement chat shows English under Japanese (beginner through N4 band).
 * N4〜N3 is the tipping point — Japanese-only from there upward.
 */
export function showTranslation(level: string | null): boolean {
  if (level == null) {
    return false;
  }
  const l = level.toLowerCase();
  return l === "hajimete" || l === "n5" || l === "n5_n4" || l === "n4";
}
