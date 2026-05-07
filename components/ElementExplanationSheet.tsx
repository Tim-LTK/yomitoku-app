import { ActivityIndicator, InteractionManager, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { PitchAccentBadge, canShowPitchAccentVisual } from "@/components/PitchAccentBadge";
import { PitchAccentExplainerHint } from "@/components/PitchAccentExplainerHint";
import type { BreakdownElement } from "@/lib/types/breakdown";
import type { ElementExplanation } from "@/lib/types/gaps";

export type ElementExplanationSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  loading: boolean;
  error: string | null;
  explanation: ElementExplanation | null;
  element: BreakdownElement | null;
  sentencePreview: string | null;
  onFlagGap: () => Promise<void>;
  flagBusy: boolean;
  flagError: string | null;
  gapSaved: boolean;
  onNavigateToNigate?: () => void;
  /** JMdict pitch pattern (display-only). */
  pitchAccent?: string | null;
};

export function ElementExplanationSheet({
  visible,
  onDismiss,
  loading,
  error,
  explanation,
  element,
  sentencePreview,
  onFlagGap,
  flagBusy,
  flagError,
  gapSaved,
  onNavigateToNigate,
  pitchAccent,
}: ElementExplanationSheetProps) {
  const headline = explanation?.headline ?? "";
  const detail = explanation?.detail ?? "";
  const pitfalls = explanation?.commonPitfalls;

  const canFlag = Boolean(explanation) && !loading && !error;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      transparent={Platform.OS !== "ios"}
      onRequestClose={onDismiss}
    >
      <View
        className={
          Platform.OS === "ios" ? "flex-1 bg-white" : "flex-1 justify-end bg-black/40"
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet backdrop"
          onPress={Platform.OS === "ios" ? undefined : onDismiss}
          className={Platform.OS === "ios" ? "absolute h-0 w-0 opacity-0" : "flex-1"}
        />

        <View
          className={
            Platform.OS === "ios"
              ? "max-h-[92%] flex-1 px-5 pb-10 pt-3"
              : "max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-5"
          }
        >
          <View className="mb-3 flex-row items-center justify-between border-b border-neutral-100 pb-3">
            <Text className="text-lg font-semibold text-neutral-900">解説</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              className="rounded-lg bg-neutral-100 px-3 py-2 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-neutral-800">閉じる</Text>
            </Pressable>
          </View>

          {sentencePreview ? (
            <Text className="pb-3 text-xs leading-snug text-neutral-500" numberOfLines={2}>
              文 · {sentencePreview}
            </Text>
          ) : null}

          {element ? (
            <View className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-3">
              <Text className="text-sm font-semibold text-indigo-950">
                {element.text}{" "}
                <Text className="font-normal text-indigo-800">({element.reading})</Text>
              </Text>
              {pitchAccent ? (
                <>
                  <PitchAccentBadge pitchAccent={pitchAccent} reading={element.reading} />
                  <PitchAccentExplainerHint visible={canShowPitchAccentVisual(pitchAccent, element.reading)} />
                </>
              ) : null}
              <Text className="mt-1 text-xs text-indigo-900">{element.meaning}</Text>
            </View>
          ) : null}

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {loading ? (
              <View className="items-center py-16">
                <ActivityIndicator accessibilityLabel="読み込み中" />
                <Text className="mt-3 text-sm text-neutral-500">読み込み中…</Text>
              </View>
            ) : null}

            {error && !loading ? (
              <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-3" accessibilityRole="alert">
                <Text className="text-sm leading-snug text-red-900">{error}</Text>
              </View>
            ) : null}

            {!loading && !error && explanation ? (
              <View>
                <Text className="text-xl font-semibold leading-snug text-neutral-900">{headline}</Text>
                <Text className="mt-4 text-base leading-relaxed text-neutral-800">{detail}</Text>
                {pitfalls && pitfalls.trim().length > 0 ? (
                  <View className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                      よくある間違い
                    </Text>
                    <Text className="mt-2 text-sm leading-relaxed text-amber-950">{pitfalls}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          {canFlag ? (
            <View className="mt-5 border-t border-neutral-100 pt-4">
              {gapSaved ? (
                <Text className="mb-3 text-center text-sm font-medium text-emerald-700">
                  苦手リストに追加しました ✓
                </Text>
              ) : null}
              {flagError ? (
                <View className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2" accessibilityRole="alert">
                  <Text className="text-sm text-amber-950">{flagError}</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Saves this topic as a personal knowledge gap"
                disabled={flagBusy || gapSaved}
                onPress={() => void onFlagGap()}
                className={`w-full items-center rounded-xl py-4 ${
                  flagBusy || gapSaved ? "bg-neutral-300" : "bg-amber-600 active:opacity-90"
                }`}
              >
                {flagBusy ? (
                  <ActivityIndicator accessibilityLabel="保存中" color="#ffffff" />
                ) : (
                  <Text className="text-base font-semibold text-white">苦手に追加</Text>
                )}
              </Pressable>
              {gapSaved && onNavigateToNigate ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    onDismiss();
                    InteractionManager.runAfterInteractions(() => {
                      onNavigateToNigate();
                    });
                  }}
                  className="mt-4 items-center py-2 active:opacity-80"
                >
                  <Text className="text-base font-semibold text-indigo-700">苦手タブへ →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
