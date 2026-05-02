import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ElementTag } from "@/components/ElementTag";
import type { BreakdownElement, SentenceBreakdown } from "@/lib/types/breakdown";

export type SentenceBreakdownViewProps = {
  breakdown: SentenceBreakdown;
  index: number;
  /** Start expanded for the first sentence only when parent opts in. */
  defaultExpanded?: boolean;
  /** Invoked when a learner taps a segmented chip (Phase 1.5 Explain). */
  onElementPress?: (ctx: {
    element: BreakdownElement;
    sourceSentence: string;
    sentenceIndex: number;
  }) => void;
};

export function SentenceBreakdownView({
  breakdown,
  index,
  defaultExpanded = false,
  onElementPress,
}: SentenceBreakdownViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const sourceSentence = breakdown.original;

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={
          expanded ? "Collapse segmented elements for this sentence" : "Expand to show element chips"
        }
        onPress={toggle}
        className="flex-row items-start gap-3 px-4 py-4 active:bg-neutral-50"
      >
        <View className="min-w-[44px] items-center rounded-lg bg-neutral-100 px-2 py-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            {index + 1}
          </Text>
          <Text className="text-xs font-bold text-neutral-900">{breakdown.difficulty}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-[15px] font-medium leading-snug text-neutral-900"
            numberOfLines={expanded ? undefined : 2}
          >
            {breakdown.original}
          </Text>
          {!expanded ? (
            <Text className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              Tap to open · {breakdown.elements.length} segments
            </Text>
          ) : (
            <Text className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Tap chips for a deeper explanation
            </Text>
          )}
        </View>
        <Text className="pt-1 text-lg text-neutral-400">{expanded ? "−" : "+"}</Text>
      </Pressable>

      {expanded ? (
        <View className="border-t border-neutral-100 px-4 pb-4 pt-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Elements · tap any chip
          </Text>
          <View className="mt-3">
            {breakdown.elements.map((el, idx) => (
              <ElementTag
                key={`${el.text}-${el.reading}-${idx}`}
                element={el}
                onPress={
                  onElementPress
                    ? () =>
                        void onElementPress({
                          element: el,
                          sourceSentence,
                          sentenceIndex: index,
                        })
                    : undefined
                }
              />
            ))}
          </View>

          {breakdown.grammarNotes.length > 0 ? (
            <>
              <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Grammar notes
              </Text>
              <View className="mt-2">
                {breakdown.grammarNotes.map((note, noteIdx) => (
                  <View
                    key={`grammar-${index}-${noteIdx}`}
                    className="mb-2 rounded-lg bg-amber-50 px-3 py-2"
                  >
                    <Text className="text-sm font-semibold text-amber-950">{note.pattern}</Text>
                    <Text className="mt-0.5 text-sm text-amber-900">{note.explanation}</Text>
                    <Text className="mt-1 text-xs italic text-amber-800/90">{note.timInContext}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {breakdown.nuanceNote.trim().length > 0 ? (
            <View className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nuance</Text>
              <Text className="mt-1 text-sm leading-snug text-slate-900">{breakdown.nuanceNote}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
