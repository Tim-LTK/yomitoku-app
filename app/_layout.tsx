import "../global.css";

import "@/lib/supabase";

import Ionicons from "@expo/vector-icons/Ionicons";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }
    void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (fontError != null) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GluestackUIProvider mode="light">
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="breakdown/[id]"
            options={{
              headerShown: true,
              title: "分析",
              headerBackTitle: "戻る",
            }}
          />
          <Stack.Screen
            name="practice/[id]"
            options={{
              headerShown: true,
              title: "練習",
              headerBackTitle: "戻る",
            }}
          />
          <Stack.Screen
            name="practice/nigate"
            options={{
              headerShown: true,
              title: "練習",
              headerBackTitle: "戻る",
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
