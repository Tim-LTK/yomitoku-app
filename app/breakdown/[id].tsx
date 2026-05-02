import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { SentenceBreakdownView } from "@/components/SentenceBreakdownView";
import { getAnalyseResult } from "@/lib/breakdown/routePayload";

export default function BreakdownDetailScreen() {
  const router = useRouter();
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const payload = id ? getAnalyseResult(id) : undefined;

  return (
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
      <View className="px-4 py-4 pb-10">
        {!id ? (
          <View className="items-center pt-16">
            <Text className="text-center text-base text-neutral-800">Missing breakdown id.</Text>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-center text-base font-semibold text-indigo-800">Back to Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {id && !payload ? (
          <View className="items-center pt-16">
            <Text className="text-center text-base leading-relaxed text-neutral-800">
              This breakdown isn&apos;t cached anymore — start again from Home.
            </Text>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 self-center rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-center text-base font-semibold text-indigo-800">Back to Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {payload
          ? payload.breakdowns.map((breakdown, index) => (
              <SentenceBreakdownView key={`sentence-${index}`} breakdown={breakdown} index={index} />
            ))
          : null}

        {payload && id ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Opens Phase 2 practice for this breakdown"
            onPress={() => router.push(`/practice/${id}`)}
            className="mt-8 w-full items-center justify-center rounded-xl bg-indigo-600 py-4 active:opacity-90"
          >
            <Text className="text-base font-semibold text-white">Practice this</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
