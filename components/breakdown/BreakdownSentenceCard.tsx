import { Pressable, Text, View } from "react-native";

import { formatGrammarRoleLabel } from "@/lib/breakdown/formatRole";
import { getRoleColour } from "@/lib/ui/roleColours";
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

function OpenedElementDetail({
  element,
  onOpenExplainPress,
}: {
  element: BreakdownElement;
  onOpenExplainPress: () => void;
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
        onPress={onOpenExplainPress}
        className="mt-4 items-center rounded-xl bg-neutral-900 py-3 active:opacity-90"
      >
        <Text className="text-sm font-semibold text-white">解説を見る</Text>
      </Pressable>
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
