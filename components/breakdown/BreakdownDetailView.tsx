import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

const Palette = {
  neutral50: "#fafafa",
  neutral100: "#f5f5f5",
  neutral400: "#a3a3a3",
  neutral800: "#262626",
  neutral900: "#171717",
  indigo800: "#3730a3",
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
    <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {!id ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyMessage}>Missing breakdown id.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={onGoHome} activeOpacity={0.8}>
              <View style={styles.homeBtnInner}>
                <Text style={styles.homeBtnText}>ホームへ</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {id && !payload ? (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyMessage, styles.emptyMessageMultiline]}>
              This breakdown isn&apos;t cached anymore — start again from Home.
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={onGoHome} activeOpacity={0.8}>
              <View style={styles.homeBtnInner}>
                <Text style={styles.homeBtnText}>ホームへ</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {headerBlurb ? (
          <View style={styles.header}>
            <Text style={styles.headerEyebrow}>分析</Text>
            <Text style={styles.headerTitle}>文 · {headerBlurb}</Text>
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Palette.neutral50,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyBlock: {
    alignItems: "center",
    paddingTop: 64,
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 16,
    color: Palette.neutral800,
  },
  emptyMessageMultiline: {
    lineHeight: 23,
  },
  homeBtnInner: {
    marginTop: 24,
    alignSelf: "center",
    borderRadius: 8,
    backgroundColor: Palette.neutral100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  homeBtnText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: Palette.indigo800,
  },
  header: {
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: Palette.neutral400,
  },
  headerTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "600",
    color: Palette.neutral900,
  },
});
