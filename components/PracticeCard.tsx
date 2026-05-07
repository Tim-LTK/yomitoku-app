import { memo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { formatGrammarRoleLabel } from "@/lib/breakdown/formatRole";
import type { GrammarRole } from "@/lib/types/breakdown";
import type { PracticeItem } from "@/lib/types/practice";

type Props = {
  item: PracticeItem;
  grammarLabel: string;
  answer: string | undefined;
  onChangeAnswer: (itemId: string, value: string) => void;
};

function questionBadgeLabel(qt: PracticeItem["questionType"]): string {
  switch (qt) {
    case "fill_blank":
      return "穴埋め";
    case "conjugate":
      return "活用";
    case "translate":
      return "英訳";
    case "application_mc":
      return "運用 MC";
    case "nuance_choice":
      return "ニュアンス";
    default:
      return qt;
  }
}

export function grammarLabelFromRole(role: GrammarRole | string): string {
  return formatGrammarRoleLabel(role as GrammarRole);
}

export const PracticeCard = memo(function PracticeCard({ item, grammarLabel, answer, onChangeAnswer }: Props) {
  const value = answer ?? "";
  const typed = ["fill_blank", "conjugate", "translate"].includes(item.questionType);
  const mc = item.questionType === "application_mc" || item.questionType === "nuance_choice";
  const options = item.options ?? [];

  return (
    <View className="relative mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white px-4 pb-5 pt-4">
      <View className="absolute right-3 top-3 z-10 rounded-full bg-amber-100 px-2.5 py-1">
        <Text className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          {questionBadgeLabel(item.questionType)}
        </Text>
      </View>

      <Text className="pr-20 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {grammarLabel}
      </Text>
      <Text className="mt-2 text-base font-semibold leading-snug text-neutral-900">{item.prompt}</Text>

      {typed ? (
        <View className="mt-4">
          <TextInput
            accessibilityLabel={`答え (${item.itemId})`}
            className="mt-2 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-base text-neutral-900"
            value={value}
            onChangeText={(t) => onChangeAnswer(item.itemId, t)}
            placeholder="入力してください"
            placeholderTextColor="#a3a3a3"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {item.hint ? (
            <Text className="mt-2 text-sm leading-relaxed text-neutral-400">{item.hint}</Text>
          ) : null}
        </View>
      ) : null}

      {mc ? (
        <View className="mt-4 gap-2">
          {options.map((opt, idx) => {
            const selected = value === opt;
            return (
              <Pressable
                key={`${item.itemId}-opt-${idx}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChangeAnswer(item.itemId, opt)}
                className={`rounded-xl border px-4 py-3 active:opacity-90 ${
                  selected ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 bg-neutral-50"
                }`}
              >
                <Text className={`text-base leading-snug ${selected ? "text-indigo-950" : "text-neutral-900"}`}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
          {item.hint ? (
            <Text className="mt-1 text-sm leading-relaxed text-neutral-400">{item.hint}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});
