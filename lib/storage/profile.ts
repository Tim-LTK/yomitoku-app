import AsyncStorage from "@react-native-async-storage/async-storage";

import { studentProfileSchema, type StudentProfile } from "@/lib/types/profile";

const STORAGE_KEY = "yomitoku:profile:v1" as const;

export async function saveProfile(profile: StudentProfile): Promise<void> {
  const valid = studentProfileSchema.parse(profile);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
}

export async function loadProfile(): Promise<StudentProfile | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const res = studentProfileSchema.safeParse(parsed);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
