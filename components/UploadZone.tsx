import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { postExtract } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";

export type UploadZoneProps = {
  onExtractedText: (text: string) => void;
  disabled?: boolean;
  onError: (message: string) => void;
};

type PickerSource = "camera" | "library";

function normalizeAssetBase64(asset: ImagePicker.ImagePickerAsset): string | null {
  const raw = asset.base64?.trim();
  if (!raw) {
    return null;
  }
  const dataUrl = /^data:image\/[^;]+;base64,(.+)$/s.exec(raw);
  return (dataUrl?.[1] ?? raw).trim();
}

export function UploadZone({ onExtractedText, disabled = false, onError }: UploadZoneProps) {
  const [isExtracting, setIsExtracting] = useState(false);

  const runPickAndExtract = useCallback(
    async (source: PickerSource) => {
      if (disabled || isExtracting) {
        return;
      }

      if (source === "camera") {
        const cam = await Camera.requestCameraPermissionsAsync();
        if (!cam.granted) {
          onError("Camera access is required to take a photo.");
          return;
        }
      } else {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!lib.granted) {
          onError("Photo library access is required to choose an image.");
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
        exif: false,
      };
      const pick =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (pick.canceled || !pick.assets?.[0]) {
        return;
      }

      const asset = pick.assets[0];
      const imageBase64 = normalizeAssetBase64(asset);
      if (!imageBase64) {
        onError("Could not read the image. Try another photo or lower resolution.");
        return;
      }

      setIsExtracting(true);
      try {
        const text = await postExtract({ imageBase64, mimeType: "image/jpeg" });
        onExtractedText(text.trim());
      } catch (err) {
        if (err instanceof AnalyseClientError) {
          onError(err.message);
        } else if (err instanceof Error) {
          onError(err.message);
        } else {
          onError("Text extraction failed — try again.");
        }
      } finally {
        setIsExtracting(false);
      }
    },
    [disabled, isExtracting, onError, onExtractedText],
  );

  const busy = disabled || isExtracting;

  return (
    <View className="pb-4">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">From image</Text>
      <Text className="mt-1 pb-3 text-sm leading-snug text-neutral-500">
        Extract Japanese from a photo, then review the text below before Explain breakdown.
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the camera to photograph Japanese text"
          disabled={busy}
          onPress={() => void runPickAndExtract("camera")}
          className={`flex-1 items-center justify-center rounded-xl border border-neutral-300 py-3 ${
            busy ? "opacity-45" : "active:opacity-90"
          }`}
        >
          <Text className="text-center text-sm font-semibold text-neutral-900">Take Photo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens your photo library"
          disabled={busy}
          onPress={() => void runPickAndExtract("library")}
          className={`flex-1 items-center justify-center rounded-xl border border-neutral-300 py-3 ${
            busy ? "opacity-45" : "active:opacity-90"
          }`}
        >
          <Text className="text-center text-sm font-semibold text-neutral-900">Choose from Library</Text>
        </Pressable>
      </View>
      {isExtracting ? (
        <View className="mt-4 flex-row items-center justify-center gap-2 rounded-lg bg-neutral-50 px-3 py-3">
          <ActivityIndicator accessibilityLabel="Extracting text from image" />
          <Text className="text-sm text-neutral-600">Reading Japanese from image…</Text>
        </View>
      ) : null}
    </View>
  );
}
