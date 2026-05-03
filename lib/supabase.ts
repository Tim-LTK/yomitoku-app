import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const ENV_KEYS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function readExpoPublic(name: string): string {
  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const raw = extra?.[name];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
}

/** Local Supabase REST client — gap CRUD still flows through `/srs` on FastAPI. */
export const supabase: SupabaseClient = createClient(
  readExpoPublic(ENV_KEYS[0]) || "http://127.0.0.1:54321",
  readExpoPublic(ENV_KEYS[1]) || "local-dev-supabase-placeholder",
);
