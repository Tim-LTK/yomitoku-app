import { Stack, useGlobalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { OnboardingProvider } from "@/lib/onboarding/context";

function normalizeAutoFillParam(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    return raw[0];
  }
  return undefined;
}

export default function OnboardingLayout() {
  const params = useGlobalSearchParams();

  const autoFillParam = useMemo(() => normalizeAutoFillParam(params.autoFill), [params.autoFill]);

  const [devAssessmentAutoFillLatched, setDevAssessmentAutoFillLatched] = useState(false);

  useEffect(() => {
    if (__DEV__ && autoFillParam === "true") {
      setDevAssessmentAutoFillLatched(true);
    }
  }, [autoFillParam]);

  return (
    <OnboardingProvider devAssessmentAutoFillRequested={devAssessmentAutoFillLatched}>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
