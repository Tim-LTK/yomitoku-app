import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ElementExplanationSheet } from "@/components/ElementExplanationSheet";
import { postExplain } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { formatGrammarRoleLabel } from "@/lib/breakdown/formatRole";
import { getAnalyseResult } from "@/lib/breakdown/routePayload";
import { appendKnowledgeGap, buildKnowledgeGap } from "@/lib/storage/gaps";
import { getRoleColour } from "@/lib/ui/roleColours";
import type { BreakdownElement, SentenceBreakdown } from "@/lib/types/breakdown";
import type { ElementExplanation } from "@/lib/types/gaps";

type ExpandedElementKey = { sentenceIndex: number; elementIndex: number } | null;

type BreakdownSentenceCardProps = {
  breakdown: SentenceBreakdown;
  sentenceIndex: number;
  totalSentences: number;
  expanded: ExpandedElementKey;
  onToggleChip: (sentenceIndex: number, elementIndex: number) => void;
  onOpenExplain: (ctx: {
    element: BreakdownElement;
    sourceSentence: string;
    sentenceIndex: number;
  }) => void;
};

function OpenedElementDetail({
  element,
  onOpenExplain,
}: {
  element: BreakdownElement;
  onOpenExplain: () => void;
}) {
  const colours = getRoleColour(element.role);
  const roleLabel = formatGrammarRoleLabel(element.role);

  return (
    <View className="mt-4 rounded-2xl border-2 border-neutral-200 bg-neutral-50 px-4 py-3">
      <View className="flex-row flex-wrap items-end gap-x-2">
        <Text className="text-xl font-semibold text-neutral-900">{element.text}</Text>
        <Text className="text-base text-neutral-600">{element.reading}</Text>
      </View>
      <View className={`mt-2 self-start rounded-full px-3 py-1 ${colours.chipBg}`}>
        <Text className={`text-[11px] font-semibold uppercase tracking-wide ${colours.chipText}`}>
          {roleLabel}
        </Text>
      </View>
      <Text className="mt-3 text-base leading-relaxed text-neutral-800">{element.meaning}</Text>
      {element.note && element.note.trim().length > 0 ? (
        <Text className="mt-2 text-sm italic leading-snug text-neutral-600">{element.note}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onOpenExplain}
        className="mt-4 items-center rounded-xl bg-neutral-900 py-3 active:opacity-90"
      >
        <Text className="text-sm font-semibold text-white">解説を見る</Text>
      </Pressable>
    </View>
  );
}

function BreakdownSentenceCard({
  breakdown,
  sentenceIndex,
  totalSentences,
  expanded,
  onToggleChip,
  onOpenExplain,
}: BreakdownSentenceCardProps) {
  const sourceSentence = breakdown.original;
  const openEl = expanded?.sentenceIndex === sentenceIndex ? expanded.elementIndex : null;

  return (
    <View className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
      <View className="mb-1 flex-row items-center justify-end">
        <View className="rounded-md bg-neutral-100 px-2 py-1">
          <Text className="text-xs font-bold text-neutral-800">{breakdown.difficulty}</Text>
        </View>
      </View>
      <Text className="text-sm font-semibold text-neutral-800">
        第{sentenceIndex + 1}文 · 全{totalSentences}文
      </Text>
      <Text className="mt-2 text-xs leading-snug text-neutral-500">チップをタップして詳しく</Text>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">要素</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {breakdown.elements.map((el, elIdx) => {
          const colours = getRoleColour(el.role);
          const isOpen = openEl === elIdx;
          return (
            <Pressable
              key={`${sentenceIndex}-${elIdx}-${el.text}-${el.reading}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isOpen }}
              onPress={() => onToggleChip(sentenceIndex, elIdx)}
              className={`rounded-full px-3 py-1.5 ${colours.chipBg} ${
                isOpen ? "ring-2 ring-neutral-900 ring-offset-2" : ""
              }`}
            >
              <Text className={`text-[15px] font-semibold ${colours.chipText}`}>{el.text}</Text>
            </Pressable>
          );
        })}
      </View>

      {openEl !== null && breakdown.elements[openEl] !== undefined ? (
        <OpenedElementDetail
          element={breakdown.elements[openEl]}
          onOpenExplain={() =>
            void onOpenExplain({
              element: breakdown.elements[openEl]!,
              sourceSentence,
              sentenceIndex,
            })
          }
        />
      ) : null}

      {breakdown.grammarNotes.length > 0 ? (
        <>
          <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            文法メモ
          </Text>
          <View className="mt-2">
            {breakdown.grammarNotes.map((note, noteIdx) => (
              <View key={`note-${sentenceIndex}-${noteIdx}`} className="mb-2 rounded-lg bg-amber-50 px-3 py-2">
                <Text className="text-sm font-semibold text-amber-950">{note.pattern}</Text>
                <Text className="mt-0.5 text-sm text-amber-900">{note.explanation}</Text>
                <Text className="mt-1 text-xs italic text-amber-800/90">{note.timInContext}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {breakdown.nuanceNote.trim().length > 0 ? (
        <>
          <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400">ニュアンス</Text>
          <View className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Text className="text-sm leading-snug text-slate-900">{breakdown.nuanceNote}</Text>
          </View>
        </>
      ) : (
        <>
          <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400">ニュアンス</Text>
          <Text className="mt-2 text-sm text-neutral-400">—</Text>
        </>
      )}
    </View>
  );
}

export default function BreakdownDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const payload = id ? getAnalyseResult(id) : undefined;

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
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-center text-base font-semibold text-indigo-800">ホームへ</Text>
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
                <Text className="text-center text-base font-semibold text-indigo-800">ホームへ</Text>
              </Pressable>
            </Link>
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
