import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { BreakdownDetailView } from "@/components/breakdown/BreakdownDetailView";
import { getAnalyseResult } from "@/lib/breakdown/routePayload";

export default function BreakdownDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const payload = id ? getAnalyseResult(id) : undefined;

  const onGoHome = useCallback(() => {
    router.push("/");
  }, []);

  return <BreakdownDetailView routeId={id} payload={payload} onGoHome={onGoHome} />;
}
