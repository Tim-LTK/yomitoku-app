import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ElementExplanationSheet } from "@/components/ElementExplanationSheet";
import { formatGrammarRoleLabel } from "@/lib/breakdown/formatRole";
import { cloudDeleteGap, cloudLoadGaps } from "@/lib/storage/supabaseGaps";
import { getRoleColour } from "@/lib/ui/roleColours";
import type { KnowledgeGap } from "@/lib/types/gaps";

export default function NigateListScreen() {
  const [items, setItems] = useState<KnowledgeGap[]>([]);
  const [explainGap, setExplainGap] = useState<KnowledgeGap | null>(null);
  const insets = useSafeAreaInsets();

  const refresh = useCallback(() => {
    void (async () => {
      try {
        const next = await cloudLoadGaps();
        setItems(next);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const noopFlagGap = useCallback(async () => {}, []);

  const renderItem = useCallback(({ item }: { item: KnowledgeGap }) => {
    const colours = getRoleColour(item.element.role);
    const flagged = new Date(item.createdAtIso);
    const when = Number.isFinite(flagged.valueOf())
      ? flagged.toLocaleString("ja-JP", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : item.createdAtIso;

    return (
      <View className="mx-4 mb-3 flex-row overflow-hidden rounded-2xl border border-neutral-200 bg-white py-3 pl-4 pr-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`解説: ${item.element.text}`}
          className="min-w-0 flex-1"
          onPress={() => setExplainGap(item)}
          activeOpacity={0.9}
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-lg font-semibold text-neutral-900">{item.element.text}</Text>
            <Text className="text-sm text-neutral-600">（{item.element.reading}）</Text>
          </View>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <View className={`self-start rounded-full px-3 py-1 ${colours.chipBg}`}>
              <Text className={`text-[11px] font-semibold ${colours.chipText}`}>
                {formatGrammarRoleLabel(item.element.role)}
              </Text>
            </View>
          </View>
          <Text className="mt-3 text-xs text-neutral-500" numberOfLines={2}>
            {item.sourceSentence}
          </Text>
          <Text className="mt-2 text-[11px] text-neutral-400">{when}</Text>
        </TouchableOpacity>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete gap"
          onPress={() =>
            void (async () => {
              await cloudDeleteGap(item.id);
              refresh();
            })()
          }
          hitSlop={12}
          className="ml-2 items-center justify-center self-center rounded-lg bg-red-50 px-3 py-3 active:opacity-80"
        >
          <Ionicons name="trash-outline" size={20} color="#b91c1c" />
        </Pressable>
      </View>
    );
  }, [refresh]);

  return (
    <View className="flex-1 bg-neutral-50">
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 pt-8">
          <Text className="text-center text-lg font-semibold text-neutral-800">苦手はまだありません</Text>
          <Text className="mt-3 text-center text-sm leading-relaxed text-neutral-500">
            タップして解説を見て、苦手に追加しよう
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }}
          ListHeaderComponent={
            <Text className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              苦手リスト
            </Text>
          }
        />
      )}

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-4 pt-3"
      >
        <Pressable
          accessibilityRole="button"
          disabled
          className="w-full items-center rounded-xl bg-neutral-200 py-4"
        >
          <Text className="text-base font-semibold text-neutral-500">練習する</Text>
          <Text className="mt-1 text-xs text-neutral-400">近日公開</Text>
        </Pressable>
      </View>

      <ElementExplanationSheet
        visible={explainGap !== null}
        onDismiss={() => setExplainGap(null)}
        loading={false}
        error={null}
        explanation={explainGap?.explanationSnapshot ?? null}
        element={explainGap?.element ?? null}
        sentencePreview={explainGap?.sourceSentence ?? null}
        onFlagGap={noopFlagGap}
        flagBusy={false}
        flagError={null}
        gapSaved={explainGap !== null}
      />
    </View>
  );
}
