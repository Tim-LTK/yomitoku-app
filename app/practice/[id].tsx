import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { PracticeCard, grammarLabelFromRole } from "@/components/PracticeCard";
import { postPracticeGenerate, postPracticeSubmit } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { buildStudentContext } from "@/lib/profile/buildStudentContext";
import { resolveDueGapsFromLocalStorage, resolveGapsForDrill } from "@/lib/practice/sessionGaps";
import { loadProfile } from "@/lib/storage/profile";
import type { KnowledgeGap } from "@/lib/types/gaps";
import type { PracticeItem } from "@/lib/types/practice";

async function resolveStudentContextFallback(): Promise<string> {
  try {
    const profile = await loadProfile();
    if (!profile) {
      return "Student: Japanese language learner. No profile available.";
    }
    return buildStudentContext(profile);
  } catch {
    return "Student: Japanese language learner. No profile available.";
  }
}

export default function PracticeSessionScreen() {
  const rawSegment = useLocalSearchParams<{ id?: string | string[] }>().id;
  const rawIdsParam = useLocalSearchParams<{ ids?: string | string[] }>().ids;
  const segmentId = typeof rawSegment === "string" ? rawSegment : Array.isArray(rawSegment) ? rawSegment[0] : "";
  const idsCsv =
    typeof rawIdsParam === "string"
      ? rawIdsParam
      : Array.isArray(rawIdsParam)
        ? rawIdsParam[0] ?? ""
        : "";

  const isDrill = segmentId.trim().toLowerCase() === "drill";

  const [sessionGaps, setSessionGaps] = useState<KnowledgeGap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [gapsError, setGapsError] = useState<string | null>(null);

  const [items, setItems] = useState<PracticeItem[]>([]);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGaps(): Promise<void> {
      setGapsLoading(true);
      setGapsError(null);
      try {
        const next =
          isDrill && idsCsv.trim().length > 0
            ? await resolveGapsForDrill(idsCsv)
            : await resolveDueGapsFromLocalStorage();
        if (!cancelled) {
          setSessionGaps(next);
          if (next.length === 0) {
            setGapsError(
              isDrill && idsCsv.trim().length > 0
                ? "指定された苦手項目が見つかりません。"
                : "復習が必要な苦手項目がありません。",
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "苦手リストを読み込めませんでした。";
          setGapsError(message);
          setSessionGaps([]);
        }
      } finally {
        if (!cancelled) {
          setGapsLoading(false);
        }
      }
    }

    void loadGaps();
    return () => {
      cancelled = true;
    };
  }, [idsCsv, isDrill]);

  useEffect(() => {
    let cancelled = false;
    if (sessionGaps.length === 0) {
      setItems([]);
      setGenerateError(null);
      return () => {
        cancelled = true;
      };
    }
    setGenerateLoading(true);
    setGenerateError(null);
    void (async () => {
      try {
        const nextItems = await postPracticeGenerate({ gaps: sessionGaps });
        if (cancelled) {
          return;
        }
        setItems(nextItems);
        setAnswers({});
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof AnalyseClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "問題を読み込めませんでした。";
        setGenerateError(message);
        setItems([]);
      } finally {
        if (!cancelled) {
          setGenerateLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionGaps]);

  const gapById = useMemo(() => new Map(sessionGaps.map((g) => [g.id, g])), [sessionGaps]);

  const readyToSubmit =
    items.length > 0 &&
    items.every((item) => (answers[item.itemId]?.trim() ?? "").length > 0) &&
    !submitting &&
    !generateLoading;

  const onChangeAnswer = useCallback((itemId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!readyToSubmit || items.length === 0 || sessionGaps.length === 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const studentContext = await resolveStudentContextFallback();
      const result = await postPracticeSubmit({
        gaps: sessionGaps,
        practiceItems: items,
        items: items.map((it) => ({
          practiceItemId: it.itemId,
          userAnswer: (answers[it.itemId] ?? "").trim(),
        })),
        studentContext,
      });
      const encoded = encodeURIComponent(
        JSON.stringify({
          sessionResult: result,
          practiceItems: items,
          gaps: sessionGaps,
        }),
      );
      router.push({
        pathname: "/practice/summary",
        params: { payload: encoded },
      });
    } catch (err) {
      const message =
        err instanceof AnalyseClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "送信に失敗しました。";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [answers, items, readyToSubmit, sessionGaps]);

  const retryGenerate = useCallback(() => {
    setGenerateError(null);
    setSubmitError(null);
    setSessionGaps((prev) => [...prev]);
  }, []);

  const showGenerating = gapsLoading || (sessionGaps.length > 0 && generateLoading);
  const blockingError = gapsError || generateError;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="grow px-4 py-4 pb-28"
      >
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">練習</Text>

        {showGenerating ? (
          <View className="mt-10 items-center py-8">
            <ActivityIndicator accessibilityLabel="問題を準備中" size="large" />
            <Text className="mt-4 text-center text-sm text-neutral-500">問題を準備中…</Text>
          </View>
        ) : null}

        {blockingError && !showGenerating ? (
          <View className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3" accessibilityRole="alert">
            <Text className="text-sm leading-snug text-red-900">{blockingError}</Text>
            {generateError && sessionGaps.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={retryGenerate}
                className="mt-4 items-center rounded-lg bg-red-900 py-3 active:opacity-90"
              >
                <Text className="text-sm font-semibold text-white">再試行</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                className="mt-4 items-center rounded-lg bg-neutral-900 py-3 active:opacity-90"
              >
                <Text className="text-sm font-semibold text-white">戻る</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {!showGenerating &&
        !blockingError &&
        sessionGaps.length > 0 &&
        items.length > 0 &&
        generateError === null ? (
          <>
            <Text className="mt-2 text-xs leading-relaxed text-neutral-500">{items.length} 問 · 順に答えてください</Text>
            {items.map((item) => {
              const gap = gapById.get(item.gapId);
              const grammarLabel =
                gap !== undefined ? grammarLabelFromRole(gap.element.role) : item.gapId;
              return (
                <PracticeCard
                  key={item.itemId}
                  item={item}
                  grammarLabel={grammarLabel}
                  elementText={gap?.element.text}
                  answer={answers[item.itemId]}
                  onChangeAnswer={onChangeAnswer}
                />
              );
            })}
          </>
        ) : null}

        {submitError ? (
          <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2" accessibilityRole="alert">
            <Text className="text-sm text-amber-900">{submitError}</Text>
          </View>
        ) : null}
      </ScrollView>

      {!showGenerating && !blockingError && items.length > 0 ? (
        <View className="border-t border-neutral-200 bg-white px-4 py-4">
          <Pressable
            accessibilityRole="button"
            disabled={!readyToSubmit || submitting || generateLoading}
            onPress={() => void handleSubmit()}
            className={`w-full flex-row items-center justify-center rounded-xl py-4 ${
              !readyToSubmit || submitting ? "bg-neutral-300" : "bg-neutral-900 active:opacity-90"
            }`}
          >
            {submitting ? (
              <ActivityIndicator accessibilityLabel="送信中" color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">答えを送る</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
