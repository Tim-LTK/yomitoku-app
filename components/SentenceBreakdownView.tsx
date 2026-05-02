import { Text, View } from "react-native";

import { ElementTag } from "@/components/ElementTag";
import type { SentenceBreakdown } from "@/lib/types/breakdown";

type SentenceBreakdownViewProps = {
  breakdown: SentenceBreakdown;
  index: number;
};

export function SentenceBreakdownView({ breakdown, index }: SentenceBreakdownViewProps) {
  return (
    <View className="mb-8">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Sentence {index + 1}
        </Text>
        <View className="rounded-md bg-neutral-200 px-2 py-1">
          <Text className="text-xs font-bold text-neutral-800">{breakdown.difficulty}</Text>
        </View>
      </View>
      <Text className="text-lg font-semibold leading-relaxed text-neutral-900">{breakdown.original}</Text>
      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Elements
      </Text>
      <View className="mt-2">
        {breakdown.elements.map((el, idx) => (
          <ElementTag key={`${el.text}-${el.reading}-${idx}`} element={el} />
        ))}
      </View>
      {breakdown.grammarNotes.length > 0 ? (
        <>
          <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
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
  );
}
