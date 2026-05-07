import { loadKnowledgeGaps } from "@/lib/storage/gaps";
import { isKnowledgeGapDue, mergeKnowledgeGapsWithLocalSchedule } from "@/lib/storage/gapSrsSchedule";
import { cloudLoadGaps } from "@/lib/storage/supabaseGaps";
import type { KnowledgeGap } from "@/lib/types/gaps";

export function reviewSortPriority(gap: KnowledgeGap): number {
  const raw = gap.nextReviewAt;
  if (!raw?.trim()) {
    return Number.NEGATIVE_INFINITY;
  }
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

export function sortGapsForSession(gaps: KnowledgeGap[]): KnowledgeGap[] {
  return [...gaps].sort((a, b) => reviewSortPriority(a) - reviewSortPriority(b));
}

export async function resolveGapsForDrill(idsCsv: string): Promise<KnowledgeGap[]> {
  const idSet = new Set(
    idsCsv
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
  if (idSet.size === 0) {
    return [];
  }
  const remote = await cloudLoadGaps();
  const merged = await mergeKnowledgeGapsWithLocalSchedule(remote);
  return sortGapsForSession(merged.filter((g) => idSet.has(g.id)));
}

export async function resolveDueGapsFromLocalStorage(): Promise<KnowledgeGap[]> {
  const local = await loadKnowledgeGaps();
  const merged = await mergeKnowledgeGapsWithLocalSchedule(local);
  const due = merged.filter((g) => isKnowledgeGapDue(g, Date.now()));
  return sortGapsForSession(due);
}
