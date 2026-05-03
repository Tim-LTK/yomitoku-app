import type { LevelCode } from "@/lib/onboarding/levelCodes";

function usesBilingualCopy(levelCode: LevelCode): boolean {
  return levelCode === "complete_beginner" || levelCode === "n5" || levelCode === "n4";
}

/** Opening assistant copy — bilingual for every learner path. */

export function getOpeningPlacementMessage(): { jp: string; en: string } {
  return {
    jp: "こんにちは！短い質問にお答えください。いただいた内容だけでプロフィールを作成します。",
    en: "Hello! Please answer a few short questions. We only look at these answers — nothing stored yet — when building your profile.",
  };
}

/** Five placement prompts; English line omitted for upper bands per Phase 1.6 UX rules. */

export function getPlacementQuestions(levelCode: LevelCode): Array<{ jp: string; en?: string }> {
  const bilingual = usesBilingualCopy(levelCode);

  const withEn = (jp: string, en: string) =>
    bilingual ? { jp, en } : { jp };

  return [
    withEn(
      "あなた自身について、日本語で2〜3文で簡単に紹介してください。",
      "Introduce yourself in Japanese in 2–3 short sentences.",
    ),
    withEn(
      "昨日と今日、それぞれ何をしましたか。日本語で説明してください。",
      "What did you do yesterday and today? Explain in Japanese.",
    ),
    withEn(
      "趣味や得意なことを日本語で話してください。（何をしているか、どのくらいの頻度かも含めて）",
      "Describe a hobby or something you enjoy in Japanese (what you do and how often).",
    ),
    withEn(
      "最近あった出来事のうち、印象に残っていることを日本語で書いてください。",
      "Write in Japanese about a recent event that left an impression.",
    ),
    withEn(
      "これから勉強したい日本語のトピックや目標があれば、日本語で述べてください。",
      "If you have study goals ahead, explain them briefly in Japanese.",
    ),
  ];
}
