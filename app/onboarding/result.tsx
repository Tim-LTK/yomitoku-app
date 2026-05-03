import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnboardingDraft } from "@/app/onboarding/context";
import { saveProfile } from "@/lib/storage/profile";
import type { StudentProfile } from "@/lib/types/profile";

function itemList(lines: string[], empty: string) {
  const list = lines.filter((s) => s.trim().length > 0);
  if (list.length === 0) {
    return <Text className="mt-2 text-xs text-neutral-500">{empty}</Text>;
  }
  return (
    <View className="mt-3 gap-1">
      {list.map((item, i) => (
        <Text key={`${String(i)}-${item.slice(0, 24)}`} className="text-sm leading-snug text-neutral-800">
          • {item}
        </Text>
      ))}
    </View>
  );
}

function buildStrengths(profile: StudentProfile): string[] {
  const out: string[] = [];
  if (profile.kanjiAdvantage) {
    out.push("漢字・表記が相対的な強みとして示唆されています。");
  }
  if (profile.knownGrammar.length > 0) {
    const top = profile.knownGrammar.slice(0, 4);
    out.push(...top.map((g) => `言語機能のひとつの目安 · ${g}`));
  }
  if (out.length === 0 && profile.notes.trim().length > 0) {
    const clip = profile.notes.length > 140 ? `${profile.notes.slice(0, 140)}…` : profile.notes;
    out.push(clip);
  }
  return out.slice(0, 6);
}

function buildConcerns(profile: StudentProfile): string[] {
  const out: string[] = [];
  if (profile.listeningGap) {
    out.push("リスニングの強化余地がフラグされています。");
  }
  out.push(...profile.weakAreas.map((w) => `フォーカス候補 · ${w}`));
  return out.slice(0, 8);
}

export default function OnboardingResultScreen() {
  const insets = useSafeAreaInsets();
  const draft = useOnboardingDraft();

  const profile = draft.pendingProfile;

  const strengths = useMemo(() => (profile ? buildStrengths(profile) : []), [profile]);

  const concerns = useMemo(() => (profile ? buildConcerns(profile) : []), [profile]);

  const onConfirm = useCallback(async () => {
    if (!profile) {
      return;
    }
    await saveProfile(profile);
    router.replace("/(tabs)");
  }, [profile]);

  if (!profile) {
    return (
      <View className="flex-1 bg-white px-8" style={{ paddingTop: Math.max(insets.top, 56) }}>
        <Text className="text-center text-neutral-700">評価結果が見つかりません。</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-8 self-center rounded-xl bg-neutral-900 px-8 py-3"
          onPress={() => router.replace("/onboarding/assessment")}
        >
          <Text className="text-sm font-semibold text-white">プレースメントへ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} className="pt-6">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">ステップ 4 / 4</Text>
        <Text className="mt-4 text-2xl font-bold text-neutral-900">あなたのプロフィール</Text>

        <View className="mt-10 rounded-2xl bg-white px-5 py-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">モデル評価レベル</Text>
          <Text className="mt-2 text-5xl font-extrabold text-indigo-900">{profile.assessedLevel}</Text>
          <Text className="mt-6 text-[11px] text-neutral-500">自己申告</Text>
          <Text className="mt-2 text-lg font-semibold text-neutral-800">{profile.selfReportedLevel}</Text>
          <Text className="mt-4 text-[11px] text-neutral-500">母語 · Native languages</Text>
          <Text className="mt-1 text-sm text-neutral-800">{profile.nativeLanguages.join(", ")}</Text>
        </View>

        <View className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
          <Text className="text-base font-bold text-emerald-900">強み</Text>
          <Text className="mt-0.5 text-xs text-emerald-800">Strength snapshot</Text>
          {itemList(strengths, "特筆項目はモデル側で空でした。")}
        </View>

        <View className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5">
          <Text className="text-base font-bold text-amber-950">注意点</Text>
          <Text className="mt-0.5 text-xs text-amber-900">Areas to prioritize</Text>
          {itemList(concerns, "明確な注意点リストはモデル側で空でした。")}
        </View>

        <View className="mt-8 rounded-2xl border border-neutral-200 bg-white px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">メモ · Notes</Text>
          <Text className="mt-3 text-sm leading-relaxed text-neutral-800">{profile.notes}</Text>
          <Text className="mt-4 text-[10px] leading-snug text-neutral-400">{profile.updatedAt}</Text>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom + 18, 24) }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => void onConfirm()}
          className="items-center rounded-2xl bg-indigo-600 py-4 active:opacity-90"
        >
          <Text className="text-base font-semibold text-white">この内容で始める</Text>
          <Text className="mt-1 text-xs text-indigo-100">Confirm profile</Text>
        </Pressable>
      </View>
    </View>
  );
}
