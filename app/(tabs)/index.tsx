import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

import { UploadZone } from "@/components/UploadZone";
import { postAnalyse } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { createBreakdownRouteId } from "@/lib/breakdown/routeId";
import { storeAnalyseResult } from "@/lib/breakdown/routePayload";
import {
  listRecentBreakdowns,
  loadBreakdown,
  saveBreakdown,
  type RecentBreakdownEntry,
} from "@/lib/storage/breakdowns";

export default function HomeScreen() {
  const [japaneseInput, setJapaneseInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentBreakdownEntry[]>([]);

  const refreshRecent = useCallback(() => {
    void listRecentBreakdowns().then(setRecent);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshRecent();
    }, [refreshRecent]),
  );

  const trimmedInput = japaneseInput.trim();

  const isSubmitDisabled = useMemo(() => trimmedInput.length === 0 || isSubmitting, [trimmedInput, isSubmitting]);

  const handleOpenRecent = useCallback(async (entry: RecentBreakdownEntry) => {
    const payload = await loadBreakdown(entry.id);
    if (!payload) {
      return;
    }
    storeAnalyseResult(entry.id, payload);
    router.push(`/breakdown/${entry.id}`);
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = japaneseInput.trim();
    if (!text || isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const routeId = createBreakdownRouteId();
      const result = await postAnalyse({ text });
      storeAnalyseResult(routeId, result);
      await saveBreakdown(routeId, result);
      router.push(`/breakdown/${routeId}`);
    } catch (err) {
      if (err instanceof AnalyseClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Something went wrong while analysing — try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, japaneseInput]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 px-4"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="pt-6 text-center text-2xl font-semibold text-neutral-900">Yomitoku</Text>
        <Text className="mt-1 pb-4 text-center text-sm text-neutral-500">読み解く · Phase 1 · Analyse</Text>

        <UploadZone
          disabled={isSubmitting}
          onExtractedText={(text) => {
            setErrorMessage(null);
            setJapaneseInput(text);
          }}
          onError={setErrorMessage}
        />

        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Japanese input</Text>
        <TextInput
          accessibilityLabel="Japanese sentence input"
          className="mt-2 min-h-[148px] w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-base leading-relaxed text-neutral-900"
          multiline
          textAlignVertical="top"
          value={japaneseInput}
          onChangeText={setJapaneseInput}
          editable={!isSubmitting}
          placeholder="一文を入力または貼り付けしてください"
          placeholderTextColor="#a3a3a3"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityHint="Runs grammar analysis on your sentence"
          disabled={isSubmitDisabled}
          onPress={handleSubmit}
          className={`mt-4 w-full items-center justify-center rounded-xl py-4 ${
            isSubmitDisabled ? "bg-neutral-300" : "bg-neutral-900 active:opacity-90"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator accessibilityLabel="Loading analysis" color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">Explain breakdown</Text>
          )}
        </Pressable>

        {errorMessage ? (
          <View className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3" accessibilityRole="alert">
            <Text className="text-sm leading-snug text-red-900">{errorMessage}</Text>
          </View>
        ) : null}

        {recent.length > 0 ? (
          <View className="mt-8 pb-6">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">最近の分析</Text>
            <View className="mt-2">
              {recent.map((entry) => {
                const d = new Date(entry.analysedAt);
                const when = Number.isFinite(d.valueOf())
                  ? d.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })
                  : entry.analysedAt;
                return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  onPress={() => void handleOpenRecent(entry)}
                  className="mb-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 active:bg-neutral-100"
                >
                  <Text className="text-sm leading-snug text-neutral-900" numberOfLines={2}>
                    {entry.preview.length > 0 ? entry.preview : "—"}
                  </Text>
                  <Text className="mt-1 text-[11px] text-neutral-400">{when}</Text>
                </Pressable>
              );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
