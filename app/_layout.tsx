import "../global.css";

import "@/lib/supabase";

import Ionicons from "@expo/vector-icons/Ionicons";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { loadProfile } from "@/lib/storage/profile";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  const pathname = usePathname();
  const [profileGateReady, setProfileGateReady] = useState(false);

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }
    void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }

    let cancelled = false;
    void loadProfile().then((profile) => {
      if (cancelled) {
        return;
      }
      if (
        !profile &&
        typeof pathname === "string" &&
        !pathname.includes("onboarding")
      ) {
        router.replace("/onboarding");
      }
      setProfileGateReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, fontError, pathname]);

  if (fontError != null) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
  }

  if (!profileGateReady) {
    return null;
  }

  return (
    <GluestackUIProvider mode="light">
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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
