import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

const STORAGE_KEY = "yomitoku:hint:pitch_accent_seen";

/** Keeps simultaneous hints (e.g. scan row + modal) in sync before AsyncStorage settles. */
const dismissListeners = new Set<() => void>();

type Props = { visible: boolean };

/**
 * One-time dismissible caption for textbook-style pitch overlines (display-only).
 * Parent passes visible when pitch accent visuals are shown; storage is shared app-wide.
 */
export function PitchAccentExplainerHint({ visible }: Props) {
  const [storageChecked, setStorageChecked] = useState(false);
  const [alreadySeenInStorage, setAlreadySeenInStorage] = useState(false);
  const [suppressAfterDismiss, setSuppressAfterDismiss] = useState(false);

  useEffect(() => {
    const hideFromElsewhere = () => setSuppressAfterDismiss(true);
    dismissListeners.add(hideFromElsewhere);
    return () => {
      dismissListeners.delete(hideFromElsewhere);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (cancelled) {
        return;
      }
      setAlreadySeenInStorage(v === "seen");
      setStorageChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const dismissHint = useCallback(() => {
    dismissListeners.forEach((fn) => {
      fn();
    });
    void AsyncStorage.setItem(STORAGE_KEY, "seen");
  }, []);

  if (!visible || !storageChecked || alreadySeenInStorage || suppressAfterDismiss) {
    return null;
  }

  return (
    <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: 11, color: "#6366f1" }}>線のある文字 = 高く読む</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="ヒントを閉じる" onPress={dismissHint}>
        <Text style={{ fontSize: 11, color: "#a3a3a3" }}>✕</Text>
      </Pressable>
    </View>
  );
}
