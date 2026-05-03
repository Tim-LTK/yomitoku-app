import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { NativeChipId } from "@/app/onboarding/context";
import { buildNativeLanguagesForApi, useOnboardingDraft } from "@/app/onboarding/context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CHIPS: { id: NativeChipId; headline: string; sub: string }[] = [
  { id: "cantonese", headline: "広東語", sub: "(Cantonese)" },
  { id: "mandarin", headline: "普通話・北京語", sub: "(Mandarin)" },
  { id: "english", headline: "英語", sub: "(English)" },
  { id: "korean", headline: "韓国語", sub: "(Korean)" },
  { id: "other", headline: "その他", sub: "(Other)" },
];

export default function OnboardingLanguagesScreen() {
  const insets = useSafeAreaInsets();
  const {
    selectedNativeIds,
    otherNativeDetail,
    setSelectedNativeIds,
    setOtherNativeDetail,
  } = useOnboardingDraft();

  const toggle = useCallback(
    (id: NativeChipId) => {
      const set = new Set(selectedNativeIds);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      setSelectedNativeIds([...set]);
    },
    [selectedNativeIds, setSelectedNativeIds],
  );

  const validSelection = useMemo(() => {
    const langs = buildNativeLanguagesForApi(selectedNativeIds, otherNativeDetail);
    const needsOther =
      selectedNativeIds.includes("other") && otherNativeDetail.trim().length === 0;
    return langs.length > 0 && !needsOther;
  }, [otherNativeDetail, selectedNativeIds]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-semibold text-neutral-900">あなたの母語は何ですか？</Text>
        <Text className="mt-2 text-base text-neutral-500">What is your native language?</Text>
        <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          複数選択可 · Select all that apply
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {CHIPS.map((c) => {
            const sel = selectedNativeIds.includes(c.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                key={c.id}
                onPress={() => toggle(c.id)}
                className={`rounded-2xl border px-4 py-3 active:opacity-85 ${
                  sel ? "border-indigo-600 bg-indigo-50" : "border-neutral-200 bg-neutral-50"
                }`}
              >
                <Text className={`text-base font-semibold ${sel ? "text-indigo-950" : "text-neutral-900"}`}>
                  {c.headline}
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500">{c.sub}</Text>
              </Pressable>
            );
          })}
        </View>
        {selectedNativeIds.includes("other") ? (
          <View className="mt-6">
            <Text className="text-sm font-semibold text-neutral-800">その他を具体的に書いてください</Text>
            <Text className="mt-1 text-xs text-neutral-500">Please describe your native language briefly.</Text>
            <TextInput
              accessibilityLabel="Other native language detail"
              className="mt-3 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-base text-neutral-900"
              value={otherNativeDetail}
              onChangeText={setOtherNativeDetail}
              placeholder='例 · e.g. "Vietnamese"'
              placeholderTextColor="#a3a3a3"
            />
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom + 16, 24), paddingHorizontal: 24 }}
        className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white pb-6 pt-4"
      >
        <Pressable
          accessibilityRole="button"
          disabled={!validSelection}
          onPress={() => router.push("/onboarding/level")}
          className={`items-center rounded-2xl py-4 ${validSelection ? "bg-indigo-600 active:opacity-90" : "bg-neutral-300"}`}
        >
          <Text className="text-base font-semibold text-white">次へ</Text>
          <Text className="mt-1 text-xs text-white/90">Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
