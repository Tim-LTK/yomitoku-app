import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { BreakdownDetailView } from "@/components/breakdown/BreakdownDetailView";
import { getAnalyseResult, storeAnalyseResult } from "@/lib/breakdown/routePayload";
import { loadBreakdown } from "@/lib/storage/breakdowns";
import type { AnalyseResponse } from "@/lib/types/breakdown";

export default function BreakdownDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [payload, setPayload] = useState<AnalyseResponse | undefined>(() =>
    id ? getAnalyseResult(id) : undefined,
  );
  const [hydrationDone, setHydrationDone] = useState(
    () => !id || Boolean(id && getAnalyseResult(id)),
  );

  useEffect(() => {
    if (!id) {
      setPayload(undefined);
      setHydrationDone(true);
      return;
    }

    const mem = getAnalyseResult(id);
    if (mem) {
      setPayload(mem);
      setHydrationDone(true);
      return;
    }

    setPayload(undefined);
    setHydrationDone(false);
    let cancelled = false;
    void loadBreakdown(id).then((stored) => {
      if (cancelled) {
        return;
      }
      if (stored) {
        storeAnalyseResult(id, stored);
        setPayload(stored);
      }
      setHydrationDone(true);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const onGoHome = useCallback(() => {
    router.push("/");
  }, []);

  const onNavigateToNigate = useCallback(() => {
    router.push("/(tabs)/nigateList");
  }, []);

  return (
    <BreakdownDetailView
      routeId={id}
      payload={payload}
      hydrationDone={hydrationDone}
      onGoHome={onGoHome}
      onNavigateToNigate={onNavigateToNigate}
    />
  );
}
