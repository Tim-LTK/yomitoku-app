import { Link, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { postPracticeEvaluate, postPracticeGenerate } from "@/lib/api/client";
import { AnalyseClientError } from "@/lib/api/errors";
import { getAnalyseResult } from "@/lib/breakdown/routePayload";
import type { SentenceBreakdown } from "@/lib/types/breakdown";
import type { PracticeItem, PracticeResult } from "@/lib/types/practice";

type CompletedRound = { item: PracticeItem; result: PracticeResult };

function formatErrorTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

function averageQuality(rounds: CompletedRound[]): number {
  if (rounds.length === 0) {
    return 0;
  }
  const sum = rounds.reduce((acc, r) => acc + r.result.qualityScore, 0);
  return Math.round((sum / rounds.length) * 100) / 100;
}

export default function PracticeScreen() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const cached = id ? getAnalyseResult(id) : undefined;

  const sentenceBreakdown = useMemo<SentenceBreakdown | undefined>(() => {
    const first = cached?.breakdowns[0];
    return first ?? undefined;
  }, [cached]);

  const [items, setItems] = useState<PracticeItem[]>([]);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluateLoading, setEvaluateLoading] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [feedbackResult, setFeedbackResult] = useState<PracticeResult | null>(null);

  const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>([]);
  const [phase, setPhase] = useState<"drills" | "summary">("drills");

  useEffect(() => {
    if (!sentenceBreakdown) {
      return;
    }
    let cancelled = false;
    setGenerateLoading(true);
    setGenerateError(null);
    void (async () => {
      try {
        const nextItems = await postPracticeGenerate({ sentenceBreakdown });
        if (cancelled) {
          return;
        }
        setItems(nextItems);
        setQuestionIndex(0);
        setAnswer("");
        setFeedbackResult(null);
        setCompletedRounds([]);
        setEvaluateError(null);
        setPhase("drills");
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof AnalyseClientError) {
          setGenerateError(err.message);
        } else if (err instanceof Error) {
          setGenerateError(err.message);
        } else {
          setGenerateError("Could not load practice questions.");
        }
        setItems([]);
      } finally {
        if (!cancelled) {
          setGenerateLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sentenceBreakdown]);

  const currentItem = items[questionIndex];
  const totalQuestions = items.length;

  const handleSubmitAnswer = useCallback(async () => {
    const text = answer.trim();
    if (!sentenceBreakdown || !currentItem || feedbackResult !== null || evaluateLoading || text.length === 0) {
      return;
    }
    setEvaluateLoading(true);
    setEvaluateError(null);
    try {
      const result = await postPracticeEvaluate({
        sentenceBreakdown,
        practiceItem: currentItem,
        userAnswer: text,
      });
      setFeedbackResult(result);
    } catch (err) {
      if (err instanceof AnalyseClientError) {
        setEvaluateError(err.message);
      } else if (err instanceof Error) {
        setEvaluateError(err.message);
      } else {
        setEvaluateError("Evaluation failed.");
      }
    } finally {
      setEvaluateLoading(false);
    }
  }, [answer, currentItem, evaluateLoading, feedbackResult, sentenceBreakdown]);

  const handleContinueAfterFeedback = useCallback(() => {
    if (!feedbackResult || !currentItem) {
      return;
    }
    const round: CompletedRound = { item: currentItem, result: feedbackResult };
    setCompletedRounds((prev) => [...prev, round]);
    setFeedbackResult(null);
    setAnswer("");
    setEvaluateError(null);

    if (questionIndex >= items.length - 1) {
      setPhase("summary");
    } else {
      setQuestionIndex((i) => i + 1);
    }
  }, [currentItem, feedbackResult, items.length, questionIndex]);

  const handleRetryGenerate = useCallback(() => {
    if (!sentenceBreakdown) {
      return;
    }
    setGenerateError(null);
    setGenerateLoading(true);
    void (async () => {
      try {
        const nextItems = await postPracticeGenerate({ sentenceBreakdown });
        setItems(nextItems);
        setQuestionIndex(0);
        setAnswer("");
        setFeedbackResult(null);
        setCompletedRounds([]);
        setEvaluateError(null);
        setPhase("drills");
      } catch (err) {
        if (err instanceof AnalyseClientError) {
          setGenerateError(err.message);
        } else if (err instanceof Error) {
          setGenerateError(err.message);
        } else {
          setGenerateError("Could not load practice questions.");
        }
        setItems([]);
      } finally {
        setGenerateLoading(false);
      }
    })();
  }, [sentenceBreakdown]);

  const overall = averageQuality(completedRounds);
  const maxPossible = completedRounds.length * 5;
  const totalEarned = completedRounds.reduce((acc, r) => acc + r.result.qualityScore, 0);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="grow px-4 py-4 pb-10"
      >
        {!id ? (
          <View className="grow items-center pt-16">
            <Text className="text-center text-base text-neutral-800">Missing practice session id.</Text>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-base font-semibold text-indigo-800">Back to Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {id && !cached ? (
          <View className="grow items-center pt-16">
            <Text className="text-center text-base leading-relaxed text-neutral-800">
              This breakdown isn&apos;t cached anymore — open Practice from a fresh breakdown.
            </Text>
            <Link href="/" asChild>
              <Pressable
                accessibilityRole="button"
                className="mt-6 rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-base font-semibold text-indigo-800">Back to Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {cached && !sentenceBreakdown ? (
          <View className="grow items-center pt-16 px-2">
            <Text className="text-center text-base text-neutral-800">No sentences in this breakdown to practice.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              className="mt-6 rounded-lg bg-neutral-100 px-4 py-2.5 active:opacity-80"
            >
              <Text className="text-base font-semibold text-indigo-800">Back</Text>
            </Pressable>
          </View>
        ) : null}

        {sentenceBreakdown && phase === "drills" ? (
          <View className="grow">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Phase 2 · Practice</Text>
            <Text className="mt-1 text-xs leading-snug text-neutral-400">Ground: {sentenceBreakdown.original}</Text>

            {generateLoading ? (
              <View className="mt-10 items-center py-8">
                <ActivityIndicator accessibilityLabel="Loading practice questions" size="large" />
                <Text className="mt-4 text-center text-sm text-neutral-500">Preparing questions…</Text>
              </View>
            ) : null}

            {generateError ? (
              <View className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3" accessibilityRole="alert">
                <Text className="text-sm leading-snug text-red-900">{generateError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleRetryGenerate}
                  disabled={generateLoading}
                  className={`mt-4 items-center rounded-lg py-3 ${
                    generateLoading ? "bg-neutral-200" : "bg-red-900 active:opacity-90"
                  }`}
                >
                  <Text className="text-sm font-semibold text-white">Try again</Text>
                </Pressable>
              </View>
            ) : null}

            {!generateLoading && !generateError && totalQuestions > 0 && currentItem ? (
              <View className="mt-6">
                <Text className="text-sm font-medium text-neutral-500">
                  Question {questionIndex + 1} of {totalQuestions}
                </Text>
                <View className="mt-2 self-start rounded-full bg-neutral-100 px-3 py-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-neutral-600">
                    {currentItem.practiceType.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text className="mt-4 text-lg font-semibold leading-snug text-neutral-900">{currentItem.prompt}</Text>
                {currentItem.hint ? (
                  <Text className="mt-3 text-sm italic leading-relaxed text-neutral-500">Hint: {currentItem.hint}</Text>
                ) : null}

                {feedbackResult === null ? (
                  <View className="mt-5">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Your answer</Text>
                    <TextInput
                      accessibilityLabel="Practice answer"
                      className="mt-2 min-h-[100px] w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-3 text-base leading-relaxed text-neutral-900"
                      multiline
                      textAlignVertical="top"
                      value={answer}
                      onChangeText={setAnswer}
                      editable={!evaluateLoading}
                      placeholder="Type your answer"
                      placeholderTextColor="#a3a3a3"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {evaluateError ? (
                      <View className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2" accessibilityRole="alert">
                        <Text className="text-sm text-amber-900">{evaluateError}</Text>
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityHint="Submits your answer for AI evaluation"
                      disabled={answer.trim().length === 0 || evaluateLoading}
                      onPress={() => void handleSubmitAnswer()}
                      className={`mt-4 w-full items-center justify-center rounded-xl py-4 ${
                        answer.trim().length === 0 || evaluateLoading
                          ? "bg-neutral-300"
                          : "bg-neutral-900 active:opacity-90"
                      }`}
                    >
                      {evaluateLoading ? (
                        <ActivityIndicator accessibilityLabel="Evaluating answer" color="#ffffff" />
                      ) : (
                        <Text className="text-base font-semibold text-white">Submit answer</Text>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Score</Text>
                    <Text className="mt-1 text-3xl font-bold text-neutral-900">{feedbackResult.qualityScore}</Text>
                    <Text className="text-sm text-neutral-500">out of 5</Text>

                    <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">Error tags</Text>
                    {feedbackResult.errorTags.length === 0 ? (
                      <Text className="mt-2 text-sm text-neutral-600">None — nice work.</Text>
                    ) : (
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {feedbackResult.errorTags.map((tag) => (
                          <View
                            key={tag}
                            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1"
                          >
                            <Text className="text-xs font-medium text-orange-900">{formatErrorTag(tag)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">Feedback</Text>
                    <Text className="mt-2 text-base leading-relaxed text-neutral-800">{feedbackResult.feedback}</Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityHint={
                        questionIndex >= totalQuestions - 1 ? "Finish and see summary" : "Go to next question"
                      }
                      onPress={handleContinueAfterFeedback}
                      className="mt-6 w-full items-center rounded-xl bg-indigo-600 py-4 active:opacity-90"
                    >
                      <Text className="text-base font-semibold text-white">
                        {questionIndex >= totalQuestions - 1 ? "View summary" : "Next question"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === "summary" && sentenceBreakdown ? (
          <View className="grow">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Practice complete</Text>
            <Text className="mt-3 text-2xl font-semibold text-neutral-900">Summary</Text>

            <View className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-5">
              <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Overall score</Text>
              <Text className="mt-2 text-3xl font-bold text-indigo-950">{overall}</Text>
              <Text className="text-sm text-indigo-800">average out of 5</Text>
              <Text className="mt-3 text-sm leading-relaxed text-indigo-900">
                You earned <Text className="font-semibold">{totalEarned}</Text> of{" "}
                <Text className="font-semibold">{maxPossible}</Text> points this session.
              </Text>
            </View>

            <Text className="mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-400">By question</Text>
            <View className="mt-3 gap-4">
              {completedRounds.map((round, i) => (
                <View key={`${round.item.itemId}-${i}`} className="rounded-xl border border-neutral-200 bg-white px-4 py-4">
                  <Text className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Q{i + 1} · {round.item.practiceType.replace(/_/g, " ")}
                  </Text>
                  <Text className="mt-2 text-xs text-neutral-500" numberOfLines={2}>
                    {round.item.prompt}
                  </Text>
                  <Text className="mt-3 text-sm font-semibold text-neutral-900">
                    Score {round.result.qualityScore}/5
                  </Text>
                  {round.result.errorTags.length > 0 ? (
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {round.result.errorTags.map((tag) => (
                        <View
                          key={`${round.item.itemId}-${tag}`}
                          className="rounded-full bg-neutral-100 px-2 py-0.5"
                        >
                          <Text className="text-xs text-neutral-700">{formatErrorTag(tag)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text className="mt-2 text-xs leading-snug text-neutral-600" numberOfLines={4}>
                    {round.result.feedback}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              className="mt-8 w-full items-center rounded-xl border border-neutral-300 py-4 active:opacity-90"
            >
              <Text className="text-base font-semibold text-neutral-900">Back to breakdown</Text>
            </Pressable>
            <Link href="/" asChild>
              <Pressable className="mt-3 w-full items-center py-3 active:opacity-80">
                <Text className="text-base font-semibold text-indigo-800">Home</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
