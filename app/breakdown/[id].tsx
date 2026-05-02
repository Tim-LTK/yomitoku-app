import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ElementExplanationSheet } from "@/components/ElementExplanationSheet";
import { SentenceBreakdownView } from "@/components/SentenceBreakdownView";
import { postExplain } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { getAnalyseResult } from "@/lib/breakdown/routePayload";
import { appendKnowledgeGap, buildKnowledgeGap } from "@/lib/storage/gaps";
import type { BreakdownElement } from "@/lib/types/breakdown";
import type { ElementExplanation } from "@/lib/types/gaps";

export default function BreakdownDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const payload = id ? getAnalyseResult(id) : undefined;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ElementExplanation | null>(null);
  const [sheetElement, setSheetElement] = useState<BreakdownElement | null>(null);
  const [sentenceText, setSentenceText] = useState<string | null>(null);
  const [sentenceOrdinal, setSentenceOrdinal] = useState<number>(0);

  const [flagBusy, setFlagBusy] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [gapSaved, setGapSaved] = useState(false);

  const breakdownCount = payload?.breakdowns.length ?? 0;

  const handleElementPress = useCallback(
    async (ctx: { element: BreakdownElement; sourceSentence: string; sentenceIndex: number }) => {
      setSheetOpen(true);
      setSheetLoading(true);
      setSheetError(null);
      setExplanation(null);
      setSheetElement(ctx.element);
      setSentenceText(ctx.sourceSentence);
      setSentenceOrdinal(ctx.sentenceIndex);
      setGapSaved(false);
      setFlagError(null);
      try {
        const body = await postExplain({
          breakdownElement: ctx.element,
          sourceSentence: ctx.sourceSentence,
        });
        setExplanation(body);
      } catch (err) {
        if (err instanceof AnalyseClientError) {
          setSheetError(err.message);
        } else if (err instanceof Error) {
          setSheetError(err.message);
        } else {
          setSheetError("Could not load explanation.");
        }
      } finally {
        setSheetLoading(false);
      }
    },
    [],
  );

  const handleFlagGap = useCallback(async () => {
    if (!id || !sheetElement || !explanation || sentenceText === null) {
      return;
    }
    setFlagBusy(true);
    setFlagError(null);
    try {
      await appendKnowledgeGap(
        buildKnowledgeGap({
          breakdownRouteId: id,
          sentenceIndex: sentenceOrdinal,
          sourceSentence: sentenceText,
          element: sheetElement,
          explanationSnapshot: explanation,
        }),
      );
      setGapSaved(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save gap — storage may be unavailable.";
      setFlagError(message);
    } finally {
      setFlagBusy(false);
    }
  }, [explanation, id, sentenceOrdinal, sentenceText, sheetElement]);

  const dismissSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetLoading(false);
    setSheetError(null);
    setExplanation(null);
    setSheetElement(null);
    setSentenceText(null);
    setGapSaved(false);
    setFlagError(null);
  }, []);

  const subtitle = useMemo(() => {
    if (!payload) {
      return null;
    }
    return `${payload.breakdowns.length} sentence${payload.breakdowns.length === 1 ? "" : "s"}`;
  }, [payload]);

  return (
    <ScrollView className="flex-1 bg-neutral-50" keyboardShouldPersistTaps="handled">
      <View className="px-4 py-4 pb-10">
        {!id ? (
          <View className="items-center pt-16">
            <Text className="text-center text-base text-neutral-800">Missing breakdown id.</Text>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-center text-base font-semibold text-indigo-800">Back to Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {id && !payload ? (
          <View className="items-center pt-16">
            <Text className="text-center text-base leading-relaxed text-neutral-800">
              This breakdown isn&apos;t cached anymore — start again from Home.
            </Text>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-center text-base font-semibold text-indigo-800">Back to Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {subtitle ? (
          <View className="mb-5">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Breakdown</Text>
            <Text className="mt-2 text-xl font-semibold text-neutral-900">Sentences · {subtitle}</Text>
            <Text className="mt-2 text-sm leading-relaxed text-neutral-500">
              Expand a sentence, then tap any segment chip for a tutor-style explanation.
            </Text>
          </View>
        ) : null}

        {payload
          ? payload.breakdowns.map((breakdown, index) => (
              <SentenceBreakdownView
                key={`sentence-${index}`}
                breakdown={breakdown}
                index={index}
                defaultExpanded={breakdownCount === 1 ? true : index === 0}
                onElementPress={handleElementPress}
              />
            ))
          : null}
      </View>

      <ElementExplanationSheet
        visible={sheetOpen}
        onDismiss={dismissSheet}
        loading={sheetLoading}
        error={sheetError}
        explanation={explanation}
        element={sheetElement}
        sentencePreview={sentenceText}
        onFlagGap={handleFlagGap}
        flagBusy={flagBusy}
        flagError={flagError}
        gapSaved={gapSaved}
      />
    </ScrollView>
  );
}
