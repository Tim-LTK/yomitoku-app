import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { postPracticeEvaluate, postPracticeGenerate, postSrsCompute } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import {
  mergeKnowledgeGapsWithLocalSchedule,
  persistGapSchedule,
} from "@/lib/storage/gapSrsSchedule";
import { cloudLoadGaps, cloudUpdateGap } from "@/lib/storage/supabaseGaps";
import type { SentenceBreakdown } from "@/lib/types/breakdown";
import type { KnowledgeGap } from "@/lib/types/gaps";
import type { PracticeItem, PracticeResult } from "@/lib/types/practice";
import type { SrsComputeResponse } from "@/lib/types/srs";

type SessionSlot = {
  gap: KnowledgeGap;
  breakdown: SentenceBreakdown;
  item: PracticeItem;
};

function formatErrorTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

function formatNextReviewSummaryDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return iso;
  }
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function sentenceBreakdownFromFlaggedGap(gap: KnowledgeGap): SentenceBreakdown {
  return {
    original: gap.sourceSentence,
    elements: [gap.element],
    grammarNotes: [],
    nuanceNote: "",
    difficulty: "N5",
  };
}

export default function NigatePracticeScreen() {
  const rawIds = useLocalSearchParams<{ ids?: string | string[] }>().ids;
  const idsCsv = Array.isArray(rawIds) ? rawIds[0] ?? "" : rawIds ?? "";
  const gapIds = useMemo(
    () =>
      idsCsv
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [idsCsv],
  );

  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [slots, setSlots] = useState<SessionSlot[]>([]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluateLoading, setEvaluateLoading] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<PracticeResult | null>(null);

  const [srsLoading, setSrsLoading] = useState(false);
  const [srsPreview, setSrsPreview] = useState<SrsComputeResponse | null>(null);
  const [srsError, setSrsError] = useState<string | null>(null);

  const gapResultsRef = useRef<Map<string, PracticeResult[]>>(new Map());
  const [finalSrsByGapId, setFinalSrsByGapId] = useState<
    Record<string, SrsComputeResponse>
  >({});

  const [phase, setPhase] = useState<"drills" | "summary">("drills");

  useEffect(() => {
    let cancelled = false;

    if (!idsCsv.trim()) {
      setPrepareLoading(false);
      setPrepareError(null);
      setSlots([]);
      gapResultsRef.current = new Map();
      return () => {
        cancelled = true;
      };
    }

    async function bootstrap() {
      if (gapIds.length === 0) {
        setPrepareError("苦手項目の指定がありません。");
        setPrepareLoading(false);
        return;
      }
      setPrepareLoading(true);
      setPrepareError(null);
      try {
        const remote = await cloudLoadGaps();
        const merged = await mergeKnowledgeGapsWithLocalSchedule(remote);
        const byId = new Map(merged.map((g) => [g.id, g] as const));
        const picked: KnowledgeGap[] = [];
        for (const id of gapIds) {
          if (picked.length >= 3) {
            break;
          }
          const g = byId.get(id);
          if (g) {
            picked.push(g);
          }
        }
        if (picked.length === 0) {
          setPrepareError("指定された苦手項目が見つかりません。");
          setSlots([]);
          return;
        }

        const nextSlots: SessionSlot[] = [];
        for (const gap of picked) {
          const breakdown = sentenceBreakdownFromFlaggedGap(gap);
          const items = await postPracticeGenerate({ sentenceBreakdown: breakdown });
          const limited = items.slice(0, 2);
          for (const item of limited) {
            nextSlots.push({ gap, breakdown, item });
          }
        }
        if (cancelled) {
          return;
        }
        if (nextSlots.length === 0) {
          setPrepareError("問題を生成できませんでした。");
        }
        gapResultsRef.current = new Map(picked.map((g) => [g.id, []]));
        setSlots(nextSlots);
        setQuestionIndex(0);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof AnalyseClientError ? err.message : err instanceof Error ? err.message : "準備に失敗しました。";
        setPrepareError(message);
        setSlots([]);
      } finally {
        if (!cancelled) {
          setPrepareLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [gapIds, idsCsv]);

  const currentSlot = slots[questionIndex];

  const runSrsForCurrent = useCallback(
    async (gap: KnowledgeGap, results: PracticeResult[]) => {
      setSrsLoading(true);
      setSrsPreview(null);
      setSrsError(null);
      try {
        const out = await postSrsCompute({ gap, practiceResults: results });
        setSrsPreview(out);
      } catch (err) {
        const message =
          err instanceof AnalyseClientError ? err.message : "復習間隔を取得できませんでした。";
        setSrsError(message);
      } finally {
        setSrsLoading(false);
      }
    },
    [],
  );

  const handleSubmitAnswer = useCallback(async () => {
    const text = answer.trim();
    const slot = currentSlot;
    if (!slot || feedbackResult !== null || evaluateLoading || text.length === 0 || srsLoading || srsPreview !== null) {
      return;
    }
    setEvaluateLoading(true);
    setEvaluateError(null);
    try {
      const result = await postPracticeEvaluate({
        sentenceBreakdown: slot.breakdown,
        practiceItem: slot.item,
        userAnswer: text,
      });
      setFeedbackResult(result);

      const prior = gapResultsRef.current.get(slot.gap.id) ?? [];
      const cumulative = [...prior, result];
      gapResultsRef.current.set(slot.gap.id, cumulative);
      await runSrsForCurrent(slot.gap, cumulative);
    } catch (err) {
      if (err instanceof AnalyseClientError) {
        setEvaluateError(err.message);
      } else if (err instanceof Error) {
        setEvaluateError(err.message);
      } else {
        setEvaluateError("採点に失敗しました。");
      }
    } finally {
      setEvaluateLoading(false);
    }
  }, [answer, currentSlot, evaluateLoading, feedbackResult, runSrsForCurrent, srsLoading, srsPreview]);

  const advanceAfterSrsHandled = useCallback(() => {
    setFeedbackResult(null);
    setAnswer("");
    setEvaluateError(null);
    setSrsPreview(null);
    setSrsError(null);
    setSrsLoading(false);

    if (questionIndex >= slots.length - 1) {
      setPhase("summary");
    } else {
      setQuestionIndex((i) => i + 1);
    }
  }, [questionIndex, slots.length]);

  const handleConfirmSrs = useCallback(async () => {
    if (!currentSlot?.gap || !srsPreview) {
      return;
    }
    const gapId = currentSlot.gap.id;
    const payload = {
      nextReviewAt: srsPreview.nextReviewAt,
      intervalDays: srsPreview.suggestedIntervalDays,
    };
    await persistGapSchedule(gapId, payload);
    try {
      await cloudUpdateGap(gapId, payload);
    } catch {
      /* Offline / HTTP — local overlay from persistGapSchedule still applies. */
    }
    setFinalSrsByGapId((prev) => ({ ...prev, [gapId]: srsPreview }));
    advanceAfterSrsHandled();
  }, [advanceAfterSrsHandled, currentSlot?.gap, srsPreview]);

  const handleSkipSrs = useCallback(() => {
    advanceAfterSrsHandled();
  }, [advanceAfterSrsHandled]);

  const summaryRows = useMemo(() => {
    const seen = new Set<string>();
    const rows: { gap: KnowledgeGap; rec: SrsComputeResponse | undefined }[] = [];
    for (const s of slots) {
      if (seen.has(s.gap.id)) {
        continue;
      }
      seen.add(s.gap.id);
      rows.push({ gap: s.gap, rec: finalSrsByGapId[s.gap.id] });
    }
    return rows;
  }, [slots, finalSrsByGapId]);

  if (!idsCsv.trim()) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-neutral-800">問題セットがありません。</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-6 rounded-xl bg-neutral-100 px-6 py-3 active:opacity-80"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-indigo-900">戻る</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="grow px-4 py-4 pb-10"
      >
        {prepareLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator accessibilityLabel="問題を準備中" />
            <Text className="mt-4 text-sm text-neutral-500">苦手リストから問題を準備しています…</Text>
          </View>
        ) : null}

        {prepareError && !prepareLoading ? (
          <View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3" accessibilityRole="alert">
            <Text className="text-sm leading-snug text-red-900">{prepareError}</Text>
            <Pressable
              accessibilityRole="button"
              className="mt-4 items-center rounded-lg bg-neutral-900 py-3 active:opacity-90"
              onPress={() => router.back()}
            >
              <Text className="text-sm font-semibold text-white">戻る</Text>
            </Pressable>
          </View>
        ) : null}

        {!prepareLoading && !prepareError && slots.length > 0 && phase === "drills" ? (
          <View className="grow">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">苦手リスト — 練習</Text>
            <Text className="mt-1 text-xs leading-snug text-neutral-400">
              注目要素：{currentSlot?.gap.element.text}（{currentSlot?.gap.element.reading}）
            </Text>
            <Text className="mt-2 text-xs leading-snug text-neutral-400" numberOfLines={3}>
              文 · {currentSlot?.gap.sourceSentence ?? ""}
            </Text>

            {currentSlot ? (
              <View className="mt-6">
                <Text className="text-sm font-medium text-neutral-500">
                  第{questionIndex + 1}問 / 全{slots.length}問
                </Text>
                <View className="mt-2 self-start rounded-full bg-neutral-100 px-3 py-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-neutral-600">
                    {currentSlot.item.practiceType.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text className="mt-4 text-lg font-semibold leading-snug text-neutral-900">
                  {currentSlot.item.prompt}
                </Text>
                {currentSlot.item.hint ? (
                  <Text className="mt-3 text-sm italic leading-relaxed text-neutral-500">
                    ヒント: {currentSlot.item.hint}
                  </Text>
                ) : null}

                {feedbackResult === null ? (
                  <View className="mt-5">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      あなたの答え
                    </Text>
                    <TextInput
                      accessibilityLabel="練習の答え"
                      className="mt-2 min-h-[100px] w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-base leading-relaxed text-neutral-900"
                      multiline
                      textAlignVertical="top"
                      value={answer}
                      onChangeText={setAnswer}
                      editable={!evaluateLoading && !srsLoading}
                      placeholder="答えを入力"
                      placeholderTextColor="#a3a3a3"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {evaluateError ? (
                      <View className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2" accessibilityRole="alert">
                        <Text className="text-sm text-amber-900">{evaluateError}</Text>
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={answer.trim().length === 0 || evaluateLoading || srsLoading}
                      onPress={() => void handleSubmitAnswer()}
                      className={`mt-4 w-full items-center justify-center rounded-xl py-4 ${
                        answer.trim().length === 0 || evaluateLoading || srsLoading
                          ? "bg-neutral-300"
                          : "bg-neutral-900 active:opacity-90"
                      }`}
                    >
                      {evaluateLoading ? (
                        <ActivityIndicator accessibilityLabel="採点中" color="#ffffff" />
                      ) : (
                        <Text className="text-base font-semibold text-white">答えを送る</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      点数
                    </Text>
                    <Text className="mt-1 text-3xl font-bold text-neutral-900">{feedbackResult.qualityScore}</Text>
                    <Text className="text-sm text-neutral-500">/ 5</Text>

                    <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      エラー
                    </Text>
                    {feedbackResult.errorTags.length === 0 ? (
                      <Text className="mt-2 text-sm text-neutral-600">なし</Text>
                    ) : (
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {feedbackResult.errorTags.map((tag) => (
                          <View key={tag} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1">
                            <Text className="text-xs font-medium text-orange-900">{formatErrorTag(tag)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      フィードバック
                    </Text>
                    <Text className="mt-2 text-base leading-relaxed text-neutral-800">{feedbackResult.feedback}</Text>

                    {srsLoading ? (
                      <View className="mt-6 flex-row items-center gap-3">
                        <ActivityIndicator accessibilityLabel="復習間隔を算出中" />
                        <Text className="text-sm text-neutral-600">次の復習タイミングを計算しています…</Text>
                      </View>
                    ) : null}

                    {!srsLoading && srsPreview ? (
                      <View className="mt-6 rounded-xl border border-indigo-200 bg-white px-3 py-3">
                        <Text className="text-sm font-semibold text-indigo-950">
                          次の復習: {srsPreview.suggestedIntervalDays}日後
                        </Text>
                        <Text className="mt-2 text-xs leading-snug text-neutral-600">{srsPreview.reasoning}</Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void handleConfirmSrs()}
                          className="mt-4 w-full items-center rounded-xl bg-indigo-600 py-4 active:opacity-90"
                        >
                          <Text className="text-base font-semibold text-white">保存して続ける</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {!srsLoading && srsError ? (
                      <View className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                        <Text className="text-sm text-amber-950">{srsError}</Text>
                        <Pressable
                          accessibilityRole="button"
                          className="mt-4 w-full items-center rounded-xl border border-neutral-300 bg-white py-3 active:opacity-90"
                          onPress={handleSkipSrs}
                        >
                          <Text className="text-base font-semibold text-neutral-900">スキップして続ける</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {!prepareLoading && !prepareError && phase === "summary" ? (
          <View className="grow pb-12">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">練習完了</Text>
            <Text className="mt-3 text-2xl font-semibold text-neutral-900">まとめ</Text>
            <Text className="mt-3 text-sm leading-relaxed text-neutral-600">
              このセッションで触れた苦手項目ごとの復習の目安です。
            </Text>

            <View className="mt-6 gap-4">
              {summaryRows.map((row) => (
                <View key={row.gap.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                  <Text className="text-base font-semibold text-neutral-900">
                    {row.gap.element.text}（{row.gap.element.reading}）
                  </Text>
                  {row.rec ? (
                    <>
                      <Text className="mt-3 text-sm text-neutral-700">
                        次の復習:{" "}
                        <Text className="font-semibold text-indigo-900">{row.rec.suggestedIntervalDays}日後</Text>
                      </Text>
                      <Text className="mt-2 text-[11px] text-neutral-500">
                        {formatNextReviewSummaryDate(row.rec.nextReviewAt)}
                      </Text>
                      <Text className="mt-2 text-xs leading-snug text-neutral-600">{row.rec.reasoning}</Text>
                    </>
                  ) : (
                    <Text className="mt-3 text-sm text-neutral-500">この項目の復習間隔は保存されませんでした。</Text>
                  )}
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              className="mt-8 w-full items-center rounded-xl bg-neutral-900 py-4 active:opacity-90"
              onPress={() => router.back()}
            >
              <Text className="text-base font-semibold text-white">苦手リストに戻る</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
