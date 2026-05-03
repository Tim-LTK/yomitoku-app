import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LevelCode } from "@/lib/onboarding/levelCodes";
import type { StudentProfile } from "@/lib/types/profile";

export type NativeChipId = "cantonese" | "mandarin" | "english" | "korean" | "other";

export function buildNativeLanguagesForApi(
  selected: NativeChipId[],
  otherDetail: string,
): string[] {
  const lang: Record<NativeChipId, string | null> = {
    cantonese: "Cantonese",
    mandarin: "Mandarin",
    english: "English",
    korean: "Korean",
    other: null,
  };
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of selected) {
    if (id === "other") {
      const t = otherDetail.trim();
      if (t.length > 0 && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
      continue;
    }
    const label = lang[id];
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

export function buildSelfReportedLevelLabel(
  level: LevelCode | null,
  studyingTowardNext: boolean | null,
): string {
  if (!level) {
    return "";
  }
  const base: Record<LevelCode, string> = {
    complete_beginner: "初めて",
    n5: "N5 相当",
    n4: "N4 相当",
    n3: "N3 相当",
    n2: "N2 相当",
  };
  const body = base[level];
  const flag = studyingTowardNext === true ? "はい" : "いいえ";
  return `${body}／次レベル目標で勉強中: ${flag}`;
}

function placementUsesBilingualCopy(levelCode: LevelCode): boolean {
  return levelCode === "complete_beginner" || levelCode === "n5" || levelCode === "n4";
}

export function getOpeningPlacementMessage(): { jp: string; en: string } {
  return {
    jp: "こんにちは！短い質問にお答えください。いただいた内容だけでプロフィールを作成します。",
    en: "Hello! Please answer a few short questions. We only look at these answers — nothing stored yet — when building your profile.",
  };
}

export function getPlacementQuestions(levelCode: LevelCode): Array<{ jp: string; en?: string }> {
  const bilingual = placementUsesBilingualCopy(levelCode);

  const beginnerSet: Array<{ jp: string; en: string }> = [
    { jp: "あなたの名前は何ですか。", en: "What is your name?" },
    { jp: "毎日、何をしますか。", en: "What do you do every day?" },
    { jp: "きのう、何をしましたか。", en: "What did you do yesterday?" },
    { jp: "日本語を勉強したことがありますか。", en: "Have you ever studied Japanese before?" },
    { jp: "日本語と英語と、どちらが難しいですか。", en: "Which is harder, Japanese or English?" },
  ];

  const upperSet = [
    { jp: "日本に行ったことがありますか。どうでしたか。" },
    { jp: "お金と時間があったら、何をしたいですか。" },
    { jp: "どうして日本語を勉強したいですか。（〜のでを使ってください）" },
    { jp: "携帯電話を見ながら、食事をしますか。" },
    { jp: "自動詞と他動詞について説明してください。例を使ってください。" },
  ];

  return bilingual ? beginnerSet : upperSet;
}

export type OnboardingDraft = {
  selectedNativeIds: NativeChipId[];
  otherNativeDetail: string;
  level: LevelCode | null;
  studyingTowardNext: boolean | null;
  pendingProfile: StudentProfile | null;
  setSelectedNativeIds: (ids: NativeChipId[]) => void;
  setOtherNativeDetail: (s: string) => void;
  setLevel: (l: LevelCode | null) => void;
  setStudyingTowardNext: (b: boolean | null) => void;
  setPendingProfile: (p: StudentProfile | null) => void;
  reset: () => void;
};

const Ctx = createContext<OnboardingDraft | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [selectedNativeIds, setSelectedNativeIds] = useState<NativeChipId[]>([]);
  const [otherNativeDetail, setOtherNativeDetail] = useState("");
  const [level, setLevel] = useState<LevelCode | null>(null);
  const [studyingTowardNext, setStudyingTowardNext] = useState<boolean | null>(null);
  const [pendingProfile, setPendingProfile] = useState<StudentProfile | null>(null);

  const reset = useCallback(() => {
    setSelectedNativeIds([]);
    setOtherNativeDetail("");
    setLevel(null);
    setStudyingTowardNext(null);
    setPendingProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      selectedNativeIds,
      otherNativeDetail,
      level,
      studyingTowardNext,
      pendingProfile,
      setSelectedNativeIds,
      setOtherNativeDetail,
      setLevel,
      setStudyingTowardNext,
      setPendingProfile,
      reset,
    }),
    [
      level,
      otherNativeDetail,
      pendingProfile,
      reset,
      selectedNativeIds,
      studyingTowardNext,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboardingDraft(): OnboardingDraft {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useOnboardingDraft must be used under OnboardingProvider");
  }
  return v;
}
