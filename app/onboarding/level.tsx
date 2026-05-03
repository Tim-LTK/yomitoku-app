import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildSelfReportedLevelLabel, useOnboardingDraft } from "@/lib/onboarding/context";
import type { LevelCode } from "@/lib/onboarding/levelCodes";

const LEVEL_ROWS: { code: LevelCode; jp: string; en: string }[] = [
  { code: "hajimete", jp: "初めて（完全な初心者）", en: "Complete beginner" },
  { code: "n5", jp: "N5 相当", en: "Around JLPT N5" },
  { code: "n5_n4", jp: "N5 〜 N4", en: "Between N5 and N4" },
  { code: "n4", jp: "N4 相当", en: "Around JLPT N4" },
  { code: "n4_n3", jp: "N4 〜 N3", en: "Between N4 and N3" },
  { code: "n3", jp: "N3 相当", en: "Around JLPT N3" },
  { code: "n2", jp: "N2 相当", en: "Around JLPT N2" },
];

export default function OnboardingLevelScreen() {
  const insets = useSafeAreaInsets();
  const { level, setLevel } = useOnboardingDraft();

  const canContinue = level !== null;
  const labelPreview = level ? buildSelfReportedLevelLabel(level) : "";

  const selectLevel = useCallback(
    (code: LevelCode) => {
      setLevel(code);
    },
    [setLevel],
  );

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          hitSlop={12}
          onPress={() => router.back()}
          className="mb-2 flex-row items-center gap-1 self-start py-2 active:opacity-80"
        >
          <Ionicons name="chevron-back" size={22} color="#4f46e5" />
          <View className="-ml-0.5">
            <Text className="text-base font-semibold text-indigo-700">戻る</Text>
            <Text className="mt-0.5 text-[11px] text-neutral-500">Back</Text>
          </View>
        </Pressable>

        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">ステップ 2 / 4</Text>
        <Text className="mt-4 text-2xl font-semibold leading-snug text-neutral-900">あなたの日本語レベルはどれに近いですか？</Text>
        <Text className="mt-2 text-base text-neutral-500">Pick the band that best matches you today.</Text>

        <View className="mt-8 gap-3">
          {LEVEL_ROWS.map((row) => {
            const sel = level === row.code;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                key={row.code}
                onPress={() => selectLevel(row.code)}
                className={`rounded-2xl border px-4 py-4 active:opacity-90 ${
                  sel ? "border-indigo-600 bg-indigo-50" : "border-neutral-200 bg-white"
                }`}
              >
                <Text className={`text-lg font-semibold ${sel ? "text-indigo-950" : "text-neutral-900"}`}>{row.jp}</Text>
                <Text className="mt-2 text-xs text-neutral-500">{row.en}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-4 text-xs leading-relaxed text-neutral-500">N1の方には他のリソースをお勧めします。</Text>

        {labelPreview ? (
          <Text className="mt-6 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600" selectable>
            送信文言プレビュー · {labelPreview}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom + 16, 24), paddingHorizontal: 24 }}
        className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white pt-4"
      >
        <Pressable
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={() => router.push("/onboarding/assessment")}
          className={`items-center rounded-2xl py-4 ${canContinue ? "bg-indigo-600 active:opacity-90" : "bg-neutral-300"}`}
        >
          <Text className="text-base font-semibold text-white">次へ</Text>
          <Text className="mt-1 text-xs text-white/90">Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
