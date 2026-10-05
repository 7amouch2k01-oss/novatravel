/**
 * NOVA Travel Agent — Retry Helper
 *
 * Retries an async fn up to `maxAttempts` times when the Gemini API returns
 * 503 (model overloaded / high demand) or 429 (rate limit).
 * Uses exponential backoff: 1s, 2s, 4s … capped at 8s.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  label = "Gemini API"
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isOverloaded =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED");

      if (isOverloaded && attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.warn(
          `[${label}] Attempt ${attempt}/${maxAttempts} failed (overloaded). Retrying in ${delay}ms…`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/** True when the error means grounding/web-tool capacity or quota is unavailable. */
export function isGroundingCapacityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE")
  );
}
