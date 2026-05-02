import { Text, View } from "react-native";

import { formatGrammarRoleLabel } from "@/lib/breakdown/formatRole";
import type { BreakdownElement } from "@/lib/types/breakdown";

type ElementTagProps = {
  element: BreakdownElement;
};

export function ElementTag({ element }: ElementTagProps) {
  const roleLabel = formatGrammarRoleLabel(element.role);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${element.text}, reading ${element.reading}, role ${roleLabel}`}
      className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5"
    >
      <View className="flex-row flex-wrap items-end gap-x-2">
        <Text className="text-lg font-semibold text-neutral-900">{element.text}</Text>
        <Text className="text-sm text-neutral-500">{element.reading}</Text>
      </View>
      <View className="mt-2 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <View className="rounded-full bg-indigo-100 px-2.5 py-0.5">
          <Text className="font-medium text-[11px] uppercase tracking-wide text-indigo-800">
            {roleLabel}
          </Text>
        </View>
        <Text className="shrink font-normal text-sm leading-snug text-neutral-800">
          {element.meaning}
        </Text>
      </View>
      {element.note && element.note.trim().length > 0 ? (
        <Text className="mt-1.5 text-xs italic leading-snug text-neutral-600">{element.note}</Text>
      ) : null}
    </View>
  );
}
