import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ElementExplanationSheet } from "@/components/ElementExplanationSheet";
import {
  BreakdownSentenceCard,
  type ExpandedElementKey,
} from "@/components/breakdown/BreakdownSentenceCard";
import { postExplain } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { appendKnowledgeGap, buildKnowledgeGap } from "@/lib/storage/gaps";
import type { AnalyseResponse, BreakdownElement } from "@/lib/types/breakdown";
import type { ElementExplanation } from "@/lib/types/gaps";

export type BreakdownDetailViewProps = {
  routeId: string | undefined;
  payload: AnalyseResponse | undefined;
  onGoHome: () => void;
};

export function BreakdownDetailView({ routeId, payload, onGoHome }: BreakdownDetailViewProps) {
  const id = routeId;

  const [expandedElement, setExpandedElement] = useState<ExpandedElementKey>(null);

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

  const sentenceCount = payload?.breakdowns.length ?? 0;

  const toggleChip = useCallback((sentenceIndex: number, elementIndex: number) => {
    setExpandedElement((prev) =>
      prev?.sentenceIndex === sentenceIndex && prev?.elementIndex === elementIndex
        ? null
        : { sentenceIndex, elementIndex },
    );
  }, []);

  const handleOpenExplain = useCallback(
    async (ctx: {
      element: BreakdownElement;
      sourceSentence: string;
      sentenceIndex: number;
    }) => {
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

  const headerBlurb = useMemo(() => {
    if (!payload) {
      return null;
    }
    return `全${payload.breakdowns.length}文`;
  }, [payload]);

  return (
    <ScrollView className="flex-1 bg-neutral-50" keyboardShouldPersistTaps="handled">
      <View className="px-4 py-4 pb-10">
        {!id ? (
          <View className="items-center pt-16">
            <Text className="text-center text-base text-neutral-800">Missing breakdown id.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onGoHome}
              className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
            >
              <Text className="text-center text-base font-semibold text-indigo-800">ホームへ</Text>
            </Pressable>
          </View>
        ) : null}

        {id && !payload ? (
          <View className="items-center pt-16">
            <Text className="text-center text-base leading-relaxed text-neutral-800">
              This breakdown isn&apos;t cached anymore — start again from Home.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onGoHome}
              className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
            >
              <Text className="text-center text-base font-semibold text-indigo-800">ホームへ</Text>
            </Pressable>
          </View>
        ) : null}

        {headerBlurb ? (
          <View className="mb-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">分析</Text>
            <Text className="mt-2 text-xl font-semibold text-neutral-900">文 · {headerBlurb}</Text>
          </View>
        ) : null}

        {payload
          ? payload.breakdowns.map((breakdown, index) => (
              <BreakdownSentenceCard
                key={`sentence-${index}`}
                breakdown={breakdown}
                sentenceIndex={index}
                totalSentences={sentenceCount}
                expanded={expandedElement}
                onToggleChip={toggleChip}
                onOpenExplain={handleOpenExplain}
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
