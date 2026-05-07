import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

/**
 * Deprecated entry shim — 「練習する」 now routes straight to `/practice/drill`.
 * Kept so old deep links `/practice/nigate?ids=…` continue to work.
 */
export default function NigatePracticeRedirectScreen() {
  const rawIds = useLocalSearchParams<{ ids?: string | string[] }>().ids;
  const idsCsv = useMemo(() => {
    if (typeof rawIds === "string") {
      return rawIds;
    }
    if (Array.isArray(rawIds)) {
      return rawIds[0] ?? "";
    }
    return "";
  }, [rawIds]);

  if (!idsCsv.trim()) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-neutral-800">問題セットがありません。</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-6 rounded-xl bg-neutral-100 px-6 py-3 active:opacity-80"
          onPress={() => router.back()}
        >
          <Text className="text-base font-semibold text-indigo-900">戻る</Text>
        </Pressable>
      </View>
    );
  }

  return <Redirect href={{ pathname: "/practice/[id]", params: { id: "drill", ids: idsCsv } }} />;
}
