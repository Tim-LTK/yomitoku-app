import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { cloudUpdateGap } from "@/lib/storage/supabaseGaps";
import { persistGapSchedule } from "@/lib/storage/gapSrsSchedule";
import { grammarLabelFromRole } from "@/components/PracticeCard";
import type { KnowledgeGap } from "@/lib/types/gaps";
import type { GapInterval, PracticeItem, SessionResult } from "@/lib/types/practice";

type SummaryPayload = {
  sessionResult: SessionResult;
  practiceItems: PracticeItem[];
  gaps: KnowledgeGap[];
};

function formatErrorTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

function scoreBadgeClasses(score: number): { wrap: string; text: string } {
  if (score <= 2) {
    return { wrap: "bg-red-100 border-red-200", text: "text-red-900" };
  }
  if (score === 3) {
    return { wrap: "bg-amber-100 border-amber-200", text: "text-amber-950" };
  }
  return { wrap: "bg-emerald-100 border-emerald-200", text: "text-emerald-950" };
}

function parsePayload(raw: string | undefined): SummaryPayload | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(raw);
    const data: unknown = JSON.parse(decoded);
    if (!data || typeof data !== "object") {
      return null;
    }
    const rec = data as Record<string, unknown>;
    const sessionResult = rec.sessionResult as SessionResult | undefined;
    const practiceItems = rec.practiceItems as PracticeItem[] | undefined;
    const gaps = rec.gaps as KnowledgeGap[] | undefined;
    if (!sessionResult || !Array.isArray(practiceItems) || !Array.isArray(gaps)) {
      return null;
    }
    return { sessionResult, practiceItems, gaps };
  } catch {
    return null;
  }
}

export default function PracticeSummaryScreen() {
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const bundle = useMemo(() => parsePayload(payload), [payload]);

  const gapById = useMemo(() => {
    if (!bundle) {
      return new Map<string, KnowledgeGap>();
    }
    return new Map(bundle.gaps.map((g) => [g.id, g]));
  }, [bundle]);

  const intervalByGapId = useMemo(() => {
    if (!bundle) {
      return new Map<string, GapInterval>();
    }
    return new Map(bundle.sessionResult.intervals.map((i) => [i.gapId, i] as const));
  }, [bundle]);

  const rows = useMemo(() => {
    if (!bundle) {
      return [];
    }
    const { sessionResult, practiceItems } = bundle;
    if (practiceItems.length !== sessionResult.results.length) {
      return [];
    }
    return practiceItems.map((practiceItem, i) => ({
      practiceItem,
      result: sessionResult.results[i]!,
      interval: intervalByGapId.get(practiceItem.gapId),
    }));
  }, [bundle, intervalByGapId]);

  useEffect(() => {
    if (!bundle) {
      return;
    }
    void (async () => {
      for (const row of bundle.sessionResult.intervals) {
        const entry = { nextReviewAt: row.nextReviewAt, intervalDays: row.intervalDays };
        await persistGapSchedule(row.gapId, entry);
        try {
          await cloudUpdateGap(row.gapId, entry);
        } catch {
          /* offline */
        }
      }
    })();
  }, [bundle]);

  if (!bundle) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-neutral-700">まとめデータがありません。</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-6 rounded-xl bg-neutral-900 px-6 py-3 active:opacity-90"
          onPress={() => router.replace("/(tabs)/nigateList")}
        >
          <Text className="text-base font-semibold text-white">苦手リストへ戻る</Text>
        </Pressable>
      </View>
    );
  }

  const { sessionResult } = bundle;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-4 py-6 pb-12"
    >
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">練習完了</Text>
      <Text className="mt-2 text-2xl font-semibold text-neutral-900">まとめ</Text>

      <View className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">今日のメモ</Text>
        <Text className="mt-3 text-base leading-relaxed text-neutral-700">{sessionResult.tutorNotes}</Text>
      </View>

      <Text className="mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-400">各問の結果</Text>
      <View className="mt-3 gap-4">
        {rows.map(({ practiceItem, result, interval }) => {
          const gap = gapById.get(practiceItem.gapId);
          const element = gap?.element;
          const title = element
            ? `${element.text}（${element.reading}） · ${grammarLabelFromRole(element.role)}`
            : practiceItem.gapId;
          const visibleTags = result.errorTags.filter((t): boolean => String(t) !== "correct");
          const sc = scoreBadgeClasses(result.qualityScore);
          return (
            <View key={practiceItem.itemId} className="rounded-2xl border border-neutral-200 bg-white px-4 py-4">
              <Text className="text-sm font-semibold leading-snug text-neutral-900">{title}</Text>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <View className={`rounded-full border px-3 py-1 ${sc.wrap}`}>
                  <Text className={`text-xs font-semibold ${sc.text}`}>{result.qualityScore} / 5</Text>
                </View>
                {interval ? (
                  <View className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1">
                    <Text className="text-xs font-semibold text-indigo-900">
                      次回: {interval.intervalDays}日後
                    </Text>
                  </View>
                ) : (
                  <View className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                    <Text className="text-xs font-medium text-neutral-600">次回間隔: —</Text>
                  </View>
                )}
              </View>
              {visibleTags.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {visibleTags.map((tag) => (
                    <View key={`${practiceItem.itemId}-${tag}`} className="rounded-full bg-neutral-100 px-2 py-1">
                      <Text className="text-[11px] text-neutral-700">{formatErrorTag(tag)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        className="mt-10 w-full items-center rounded-xl bg-neutral-900 py-4 active:opacity-90"
        onPress={() => router.replace("/(tabs)/nigateList")}
      >
        <Text className="text-base font-semibold text-white">苦手リストへ戻る</Text>
      </Pressable>
    </ScrollView>
  );
}
