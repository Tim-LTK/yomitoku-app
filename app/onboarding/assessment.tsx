import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  buildNativeLanguagesForApi,
  buildSelfReportedLevelLabel,
  useOnboardingDraft,
} from "@/lib/onboarding/context";
import { postOnboardAssess } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { getOpeningPlacementMessage, getPlacementQuestions } from "@/lib/onboarding/placementQuestions";
import { showTranslation } from "@/lib/onboarding/showTranslation";
import type { StudentProfile } from "@/lib/types/profile";

type Bubble = {
  role: "assistant" | "user";
  jp: string;
  en?: string;
};

export default function OnboardingAssessmentScreen() {
  const insets = useSafeAreaInsets();
  const draft = useOnboardingDraft();

  const levelSlugForTranslation = draft.level === "complete_beginner" ? "hajimete" : draft.level;
  const showAssistantEn = showTranslation(levelSlugForTranslation);

  const nativeForApi = useMemo(
    () => buildNativeLanguagesForApi(draft.selectedNativeIds, draft.otherNativeDetail),
    [draft.otherNativeDetail, draft.selectedNativeIds],
  );

  const levelLabel = useMemo(
    () => buildSelfReportedLevelLabel(draft.level, draft.studyingTowardNext),
    [draft.level, draft.studyingTowardNext],
  );

  const questions = useMemo(() => (draft.level ? getPlacementQuestions(draft.level) : []), [draft.level]);

  const seededRef = useRef(false);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (seededRef.current || draft.level === null || nativeForApi.length === 0) {
      return;
    }
    const qs = getPlacementQuestions(draft.level);
    if (qs.length !== 5) {
      return;
    }
    seededRef.current = true;
    const op = getOpeningPlacementMessage();
    setMessages([
      { role: "assistant", jp: op.jp, en: showAssistantEn ? op.en : undefined },
      {
        role: "assistant",
        jp: qs[0].jp,
        en: showAssistantEn ? qs[0].en : undefined,
      },
    ]);
  }, [draft.level, nativeForApi, showAssistantEn]);

  const finalize = useCallback(
    async (five: string[]) => {
      if (!draft.level || nativeForApi.length === 0 || !levelLabel) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const profile: StudentProfile = await postOnboardAssess({
          nativeLanguages: nativeForApi,
          selfReportedLevel: levelLabel,
          answers: {
            q1: five[0],
            q2: five[1],
            q3: five[2],
            q4: five[3],
            q5: five[4],
          },
        });
        draft.setPendingProfile(profile);
        router.replace("/onboarding/result");
      } catch (e) {
        const msg =
          e instanceof AnalyseClientError ? e.message : "プロフィールの作成に失敗しました。";
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [draft.level, draft.setPendingProfile, levelLabel, nativeForApi],
  );

  const onSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || busy || responses.length >= 5 || questions.length !== 5) {
      return;
    }

    const nextAnswers = [...responses, trimmed];
    setInput("");

    if (nextAnswers.length < 5) {
      const qi = nextAnswers.length;
      const q = questions[qi];
      setMessages((prev) => [
        ...prev,
        { role: "user", jp: trimmed },
        {
          role: "assistant",
          jp: q.jp,
          en: showAssistantEn ? q.en : undefined,
        },
      ]);
      setResponses(nextAnswers);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", jp: trimmed }]);
    setResponses(nextAnswers);
    void finalize(nextAnswers);
  }, [busy, finalize, input, questions, responses.length, showAssistantEn]);

  const missingDeps = draft.level === null || nativeForApi.length === 0 || !levelLabel;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-neutral-50"
    >
      <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
        <View className="border-b border-neutral-200 px-6 pb-4 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="戻る"
            hitSlop={12}
            disabled={busy}
            onPress={() => router.back()}
            className={`mb-3 flex-row items-center gap-1 self-start py-2 ${busy ? "opacity-40" : "active:opacity-80"}`}
          >
            <Ionicons name="chevron-back" size={22} color="#4f46e5" />
            <View className="-ml-0.5">
              <Text className="text-base font-semibold text-indigo-700">戻る</Text>
              <Text className="mt-0.5 text-[11px] text-neutral-500">Back</Text>
            </View>
          </Pressable>
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">ステップ 3 / 4</Text>
          <Text className="mt-1 text-xl font-semibold text-neutral-900">プレースメント</Text>
          <Text className="mt-2 text-[11px] text-neutral-500">回答のみをサーバーに送り、モデル評価に利用します。</Text>
        </View>

        {missingDeps ? (
          <View className="flex-1 items-center px-10 pt-24">
            <Text className="text-center text-sm text-neutral-600">入力が足りません。</Text>
            <Pressable
              className="mt-6 rounded-xl bg-neutral-900 px-6 py-3"
              accessibilityRole="button"
              onPress={() => router.replace("/onboarding")}
            >
              <Text className="text-sm font-semibold text-white">やり直す</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
              className="grow"
            >
              {messages.map((m, i) =>
                m.role === "assistant" ? (
                  <View key={`assistant-${String(i)}`} className="mb-6 max-w-[95%] self-start">
                    <Text className="text-base leading-relaxed text-neutral-900">{m.jp}</Text>
                    {m.en && showAssistantEn ? (
                      <Text className="mt-2 text-sm leading-relaxed text-neutral-500">{m.en}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View key={`user-${String(i)}`} className="mb-6 max-w-[95%] self-end rounded-2xl bg-indigo-100 px-4 py-3">
                    <Text className="text-base leading-relaxed text-indigo-950">{m.jp}</Text>
                  </View>
                ),
              )}

              {busy ? (
                <View className="mt-2 flex-row gap-4 self-start">
                  <ActivityIndicator accessibilityLabel="プロフィール作成中" />
                  <View className="flex-shrink">
                    <Text className="text-sm leading-relaxed text-neutral-900">プロフィールを作成中...</Text>
                    <Text className="mt-1 text-xs leading-relaxed text-neutral-400">Creating your profile...</Text>
                  </View>
                </View>
              ) : null}

              {error ? (
                <View className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <Text className="text-sm text-red-900">{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-4 rounded-lg bg-neutral-900 py-3"
                    onPress={() => router.replace("/onboarding/level")}
                  >
                    <Text className="text-center text-sm font-semibold text-white">前に戻る</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>

            {!busy ? (
              <View
                className="border-t border-neutral-200 bg-white px-4 pb-6 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom + 8, 24) }}
              >
                <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">あなたの答え</Text>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  editable={responses.length < 5}
                  multiline
                  textAlignVertical="top"
                  placeholder="自由記述 · Free response"
                  placeholderTextColor="#a3a3a3"
                  className="mt-3 min-h-[120px] w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-base leading-relaxed text-neutral-900"
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={input.trim().length === 0 || responses.length >= 5}
                  onPress={onSend}
                  className={`mt-4 items-center rounded-2xl py-4 ${input.trim().length === 0 || responses.length >= 5 ? "bg-neutral-300" : "bg-indigo-600 active:opacity-90"}`}
                >
                  <Text className="text-base font-semibold text-white">{responses.length >= 5 ? "送信中..." : "送る"}</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
