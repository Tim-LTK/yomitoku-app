export function createBreakdownRouteId(): string {
  const cryptoRef = (
    globalThis as unknown as {
      crypto?: { randomUUID?: () => string };
    }
  ).crypto;

  const randomUUID = cryptoRef?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID();
  }

  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
