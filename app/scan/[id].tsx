import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { ElementExplanationSheet } from "@/components/ElementExplanationSheet";
import { PitchAccentBadge } from "@/components/PitchAccentBadge";
import { postAsk, postExplain } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { getScanResult } from "@/lib/breakdown/routePayload";
import { enrichFlaggedItems } from "@/lib/scan/enrichment";
import { appendKnowledgeGap, buildKnowledgeGap } from "@/lib/storage/gaps";
import { cloudSaveGap } from "@/lib/storage/supabaseGaps";
import type { BreakdownElement } from "@/lib/types/breakdown";
import type { ElementExplanation } from "@/lib/types/gaps";
import {
  breakdownElementFromFlaggedItem,
  type FlaggedItem,
  type ScanResult,
} from "@/lib/types/scan";

export default function ScanDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [payload, setPayload] = useState<ScanResult | undefined>(() =>
    id ? getScanResult(id) : undefined,
  );
  const [hydrationDone, setHydrationDone] = useState(
    () => !id || Boolean(id && getScanResult(id)),
  );

  const jmdictEnrichGateRef = useRef<string>("");

  useEffect(() => {
    if (!id) {
      setPayload(undefined);
      setHydrationDone(true);
      return;
    }

    const mem = getScanResult(id);
    if (mem) {
      setPayload(mem);
      setHydrationDone(true);
      return;
    }

    setPayload(undefined);
    setHydrationDone(true);
  }, [id]);

  useEffect(() => {
    jmdictEnrichGateRef.current = "";
  }, [id]);

  useEffect(() => {
    if (!hydrationDone || !id) {
      return;
    }
    const result = getScanResult(id);
    if (!result || result.flaggedItems.length === 0) {
      return;
    }
    const gateKey = `${id}:${result.passage}:${result.flaggedItems.map((i) => i.id).join(",")}`;
    if (jmdictEnrichGateRef.current === gateKey) {
      return;
    }
    jmdictEnrichGateRef.current = gateKey;
    enrichFlaggedItems(result.flaggedItems).then((enriched) => {
      setPayload((prev) =>
        prev && prev.passage === result.passage ? { ...prev, flaggedItems: enriched } : prev,
      );
    });
  }, [hydrationDone, id]);

  const explainCacheRef = useRef(new Map<string, ElementExplanation>());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ElementExplanation | null>(null);
  const [sheetElement, setSheetElement] = useState<BreakdownElement | null>(null);
  const [passagePreview, setPassagePreview] = useState<string | null>(null);

  const [flagBusy, setFlagBusy] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [gapSaved, setGapSaved] = useState(false);
  const [sheetPitchAccent, setSheetPitchAccent] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const handleOpenExplain = useCallback(
    async (item: FlaggedItem) => {
      const element = breakdownElementFromFlaggedItem(item);
      const cacheKey = item.id;
      const cached = explainCacheRef.current.get(cacheKey);

      setSheetOpen(true);
      setSheetPitchAccent(item.pitchAccent ?? null);
      setSheetElement(element);
      setPassagePreview(payload?.passage ?? null);
      setGapSaved(false);
      setFlagError(null);

      if (cached) {
        setExplanation(cached);
        setSheetLoading(false);
        setSheetError(null);
        return;
      }

      setExplanation(null);
      setSheetLoading(true);
      setSheetError(null);
      try {
        const body = await postExplain({
          breakdownElement: element,
          sourceSentence: payload?.passage ?? "",
        });
        explainCacheRef.current.set(cacheKey, body);
        setExplanation(body);
      } catch (err) {
        if (err instanceof AnalyseClientError) {
          setSheetError(err.message);
        } else if (err instanceof Error) {
          setSheetError(err.message);
        } else {
          setSheetError("解説を読み込めませんでした。");
        }
      } finally {
        setSheetLoading(false);
      }
    },
    [payload?.passage],
  );

  const handleFlagGap = useCallback(async () => {
    if (!id || !sheetElement || !explanation || !payload) {
      return;
    }
    setFlagBusy(true);
    setFlagError(null);
    try {
      const flagged = buildKnowledgeGap({
        breakdownRouteId: id,
        sentenceIndex: 0,
        sourceSentence: payload.passage,
        element: sheetElement,
        explanationSnapshot: explanation,
      });
      await appendKnowledgeGap(flagged);
      void cloudSaveGap(flagged).catch(() => {});
      setGapSaved(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "苦手の保存に失敗しました。ストレージを確認してください。";
      setFlagError(message);
    } finally {
      setFlagBusy(false);
    }
  }, [explanation, id, payload, sheetElement]);

  const dismissSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetLoading(false);
    setSheetError(null);
    setExplanation(null);
    setSheetElement(null);
    setPassagePreview(null);
    setSheetPitchAccent(null);
    setGapSaved(false);
    setFlagError(null);
  }, []);

  const handleSubmitAsk = useCallback(async () => {
    const q = questionText.trim();
    if (!q || !payload || askLoading) {
      return;
    }
    setAskError(null);
    setAskAnswer(null);
    setAskLoading(true);
    try {
      const res = await postAsk({ question: q, passage: payload.passage });
      setAskAnswer(res.answer);
    } catch (err) {
      if (err instanceof AnalyseClientError) {
        setAskError(err.message);
      } else if (err instanceof Error) {
        setAskError(err.message);
      } else {
        setAskError("送信に失敗しました。");
      }
    } finally {
      setAskLoading(false);
    }
  }, [askLoading, payload, questionText]);

  const onGoHome = useCallback(() => {
    router.push("/");
  }, []);

  const onNavigateToNigate = useCallback(() => {
    router.push("/(tabs)/nigateList");
  }, []);

  const trimmedQuestion = questionText.trim();
  const askDisabled = trimmedQuestion.length === 0 || askLoading || !payload;

  const content =
    !id ? (
      <View className="px-4 py-8">
        <Text className="text-center text-neutral-600">スキャンIDがありません。</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onGoHome}
          className="mt-6 self-center rounded-xl bg-neutral-900 px-6 py-3 active:opacity-90"
        >
          <Text className="text-base font-semibold text-white">ホームへ</Text>
        </Pressable>
      </View>
    ) : !hydrationDone ? (
      <View className="items-center py-16">
        <ActivityIndicator accessibilityLabel="読み込み中" />
      </View>
    ) : !payload ? (
      <View className="px-4 py-8">
        <Text className="text-center text-neutral-600">
          このスキャンを表示できません。ホームからもう一度実行してください。
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onGoHome}
          className="mt-6 self-center rounded-xl bg-neutral-900 px-6 py-3 active:opacity-90"
        >
          <Text className="text-base font-semibold text-white">ホームへ</Text>
        </Pressable>
      </View>
    ) : (
      <>
        <Text className="text-base leading-relaxed text-neutral-900">{payload.passage}</Text>

        <Text className="mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          注目ポイント
        </Text>
        <View className="mt-2 gap-3">
          {payload.flaggedItems.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => void handleOpenExplain(item)}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 active:bg-neutral-100"
            >
              <Text className="text-2xl font-semibold leading-snug text-neutral-900">
                {item.text}
              </Text>
              <Text className="mt-1 text-base text-neutral-600">{item.reading}</Text>
              {item.pitchAccent ? <PitchAccentBadge pitchAccent={item.pitchAccent} /> : null}
              <View className="mt-3 flex-row flex-wrap gap-2">
                <View className="rounded-full border border-neutral-300 bg-white px-2.5 py-1">
                  <Text className="text-xs font-semibold text-neutral-800">{item.jlptLevel}</Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    item.highlightTier === "consolidate"
                      ? "border border-blue-200 bg-blue-50"
                      : "border border-amber-200 bg-amber-50"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      item.highlightTier === "consolidate" ? "text-blue-950" : "text-amber-950"
                    }`}
                  >
                    {item.highlightTier === "consolidate" ? "確認" : "挑戦"}
                  </Text>
                </View>
              </View>
              <Text className="mt-3 text-sm leading-relaxed text-neutral-800">
                {item.briefExplanation}
              </Text>
              <Text className="mt-2 text-sm leading-relaxed text-neutral-500">{item.inContext}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-10 border-t border-neutral-200 pt-8">
          <Text className="text-sm font-semibold text-neutral-900">この文章について質問する</Text>
          <TextInput
            accessibilityLabel="質問を入力"
            className="mt-3 min-h-[100px] w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base leading-relaxed text-neutral-900"
            multiline
            textAlignVertical="top"
            value={questionText}
            onChangeText={setQuestionText}
            editable={!askLoading}
            placeholder="文章の内容について質問を書いてください"
            placeholderTextColor="#a3a3a3"
          />
          <Pressable
            accessibilityRole="button"
            disabled={askDisabled}
            onPress={() => void handleSubmitAsk()}
            className={`mt-4 w-full items-center rounded-xl py-4 ${
              askDisabled ? "bg-neutral-300" : "bg-neutral-900 active:opacity-90"
            }`}
          >
            {askLoading ? (
              <ActivityIndicator accessibilityLabel="送信中" color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">送る</Text>
            )}
          </Pressable>
          {askError ? (
            <View className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2" accessibilityRole="alert">
              <Text className="text-sm text-red-900">{askError}</Text>
            </View>
          ) : null}
          {askAnswer ? (
            <View className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <Text className="text-sm leading-relaxed text-neutral-900">{askAnswer}</Text>
            </View>
          ) : null}
        </View>
      </>
    );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 px-4 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>

      <ElementExplanationSheet
        visible={sheetOpen}
        onDismiss={dismissSheet}
        loading={sheetLoading}
        error={sheetError}
        explanation={explanation}
        element={sheetElement}
        sentencePreview={passagePreview}
        onFlagGap={handleFlagGap}
        flagBusy={flagBusy}
        flagError={flagError}
        gapSaved={gapSaved}
        onNavigateToNigate={onNavigateToNigate}
        pitchAccent={sheetPitchAccent}
      />
    </KeyboardAvoidingView>
  );
}
