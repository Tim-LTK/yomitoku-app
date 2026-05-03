import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  formatGrammarRoleChipLabel,
  getChipRolePaint,
} from "@/components/breakdown/grammarRoleChip";
import type { BreakdownElement, SentenceBreakdown } from "@/lib/types/breakdown";

export type ExpandedElementKey = { sentenceIndex: number; elementIndex: number } | null;

export type BreakdownSentenceCardProps = {
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

const Palette = {
  neutral50: "#fafafa",
  neutral100: "#f5f5f5",
  neutral200: "#e5e5e5",
  neutral400: "#a3a3a3",
  neutral500: "#737373",
  neutral600: "#525252",
  neutral800: "#262626",
  neutral900: "#171717",
  white: "#ffffff",
  amber50: "#fffbeb",
  amber800: "#92400e",
  amber900: "#78350f",
  amber950: "#451a03",
  slate50: "#f8fafc",
  slate200: "#e2e8f0",
  slate900: "#0f172a",
};

function OpenedElementDetail({
  element,
  onOpenExplainPress,
}: {
  element: BreakdownElement;
  onOpenExplainPress: () => void;
}) {
  const paint = getChipRolePaint(element.role);
  const roleLabel = formatGrammarRoleChipLabel(element.role);

  return (
    <View style={styles.openedOuter}>
      <View style={styles.openedHeadingRow}>
        <Text style={styles.openedElementText}>{element.text}</Text>
        <Text style={styles.openedReading}>{element.reading}</Text>
      </View>
      <View style={[styles.rolePill, { backgroundColor: paint.backgroundColor }]}>
        <Text style={[styles.rolePillLabel, { color: paint.color }]}>{roleLabel}</Text>
      </View>
      <Text style={styles.openedMeaning}>{element.meaning}</Text>
      {element.note && element.note.trim().length > 0 ? (
        <Text style={styles.openedNote}>{element.note}</Text>
      ) : null}

      <TouchableOpacity accessibilityRole="button" onPress={onOpenExplainPress} activeOpacity={0.85}>
        <View style={styles.explainBtnInner}>
          <Text style={styles.explainBtnText}>解説を見る</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function BreakdownSentenceCard({
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
    <View style={styles.card}>
      <View style={styles.difficultyRow}>
        <View style={styles.difficultyPill}>
          <Text style={styles.difficultyText}>{breakdown.difficulty}</Text>
        </View>
      </View>
      <Text style={styles.sentenceHeading}>
        第{sentenceIndex + 1}文 · 全{totalSentences}文
      </Text>
      <Text style={styles.chipHint}>チップをタップして詳しく</Text>

      <Text style={styles.sectionLabel}>要素</Text>
      <View style={styles.chipRow}>
        {breakdown.elements.map((el, elIdx) => {
          const paint = getChipRolePaint(el.role);
          const isOpen = openEl === elIdx;
          return (
            <TouchableOpacity
              key={`${sentenceIndex}-${elIdx}-${el.text}-${el.reading}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isOpen }}
              onPress={() => onToggleChip(sentenceIndex, elIdx)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.chipInner,
                  { backgroundColor: paint.backgroundColor },
                  isOpen && styles.chipInnerSelected,
                ]}
              >
                <Text style={[styles.chipText, { color: paint.color }]}>{el.text}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {openEl !== null && breakdown.elements[openEl] !== undefined ? (
        <OpenedElementDetail
          element={breakdown.elements[openEl]}
          onOpenExplainPress={() =>
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
          <Text style={styles.grammarMemoTitle}>文法メモ</Text>
          <View style={styles.noteList}>
            {breakdown.grammarNotes.map((note, noteIdx) => (
              <View key={`note-${sentenceIndex}-${noteIdx}`} style={styles.grammarMemoCard}>
                <Text style={styles.grammarMemoPattern}>{note.pattern}</Text>
                <Text style={styles.grammarMemoBody}>{note.explanation}</Text>
                <Text style={styles.grammarMemoContext}>{note.timInContext}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {breakdown.nuanceNote.trim().length > 0 ? (
        <>
          <Text style={styles.nuanceSectionLabel}>ニュアンス</Text>
          <View style={styles.nuanceCard}>
            <Text style={styles.nuanceBody}>{breakdown.nuanceNote}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.nuanceSectionLabel}>ニュアンス</Text>
          <Text style={styles.nuancePlaceholder}>—</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.neutral200,
    backgroundColor: Palette.white,
    padding: 16,
  },
  difficultyRow: {
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  difficultyPill: {
    borderRadius: 6,
    backgroundColor: Palette.neutral100,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.neutral800,
  },
  sentenceHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.neutral800,
  },
  chipHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: Palette.neutral500,
  },
  sectionLabel: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: Palette.neutral400,
  },
  chipRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipInner: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipInnerSelected: {
    borderWidth: 2,
    borderColor: Palette.neutral900,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  openedOuter: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Palette.neutral200,
    backgroundColor: Palette.neutral50,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  openedHeadingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    columnGap: 8,
    rowGap: 4,
  },
  openedElementText: {
    fontSize: 20,
    fontWeight: "600",
    color: Palette.neutral900,
  },
  openedReading: {
    fontSize: 16,
    color: Palette.neutral600,
  },
  rolePill: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rolePillLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  openedMeaning: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.neutral800,
  },
  openedNote: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
    color: Palette.neutral600,
  },
  explainBtnInner: {
    marginTop: 16,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: Palette.neutral900,
    paddingVertical: 12,
  },
  explainBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.white,
  },
  grammarMemoTitle: {
    marginTop: 24,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: Palette.neutral400,
  },
  noteList: {
    marginTop: 8,
  },
  grammarMemoCard: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: Palette.amber50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  grammarMemoPattern: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.amber950,
  },
  grammarMemoBody: {
    marginTop: 2,
    fontSize: 14,
    color: Palette.amber900,
  },
  grammarMemoContext: {
    marginTop: 4,
    fontSize: 12,
    fontStyle: "italic",
    color: Palette.amber800,
  },
  nuanceSectionLabel: {
    marginTop: 24,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: Palette.neutral400,
  },
  nuanceCard: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.slate200,
    backgroundColor: Palette.slate50,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nuanceBody: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.slate900,
  },
  nuancePlaceholder: {
    marginTop: 8,
    fontSize: 14,
    color: Palette.neutral400,
  },
});
