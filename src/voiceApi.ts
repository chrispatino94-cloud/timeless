/**
 * Client-side voice generation API helper.
 *
 * Concern A (extraction): this module owns the HTTP call, timeout, and error mapping
 * so VoiceMessage can stay focused on UI state.
 *
 * Concern B (TypeScript): every public value has an explicit type; catch uses unknown.
 */

export const VOICE_REQUEST_TIMEOUT_MS = 45000;

/** User-facing copy for known failure modes. */
export const voiceErrors = {
  emptyText: "Write a message first, then I can turn it into audio.",
  paymentRequired:
    "This voice is not available on the current ElevenLabs plan yet. Please try again after the voice setting is updated.",
  timeout: "Voice generation is taking longer than expected. Please try again in a moment.",
  apiKeyMissing: "Voice generation is not connected yet. The site owner needs to add the ElevenLabs API key.",
  fallback: "I could not generate the voice right now. Please try again.",
} as const;

/** Shape of JSON error bodies returned by /api/generate-voice on failure. */
export interface VoiceApiErrorBody {
  code?: string;
  error?: string;
}

/**
 * Discriminated union for the helper result.
 * Callers switch on `ok` instead of try/catch for business failures.
 */
export type GenerateVoiceResult =
  | { ok: true; audioBlob: Blob }
  | { ok: false; errorMessage: string };

/**
 * Narrow unknown JSON into VoiceApiErrorBody without using `any`.
 * Runtime JSON is untyped; unknown forces us to prove each field before use.
 */
function parseVoiceApiErrorBody(data: unknown): VoiceApiErrorBody {
  if (typeof data !== "object" || data === null) {
    return {};
  }

  const record = data as Record<string, unknown>;
  const body: VoiceApiErrorBody = {};

  if (typeof record.code === "string") {
    body.code = record.code;
  }
  if (typeof record.error === "string") {
    body.error = record.error;
  }

  return body;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return voiceErrors.fallback;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/**
 * Calls /api/generate-voice and returns either an audio Blob or a user-facing error string.
 * Empty-text validation stays in the UI layer so the button can give instant feedback
 * without spending an API round-trip.
 */
export async function generateVoiceAudio(text: string): Promise<GenerateVoiceResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), VOICE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/generate-voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const raw: unknown = await response.json().catch(() => ({}));
      const data = parseVoiceApiErrorBody(raw);

      if (response.status === 402 || data.code === "payment_required") {
        // 402 / payment_required → account/plan issue, not bad user text.
        return { ok: false, errorMessage: voiceErrors.paymentRequired };
      }

      if (data.code === "api_key_missing") {
        // Missing server env — friendly copy, no secret details.
        return { ok: false, errorMessage: voiceErrors.apiKeyMissing };
      }

      return {
        ok: false,
        errorMessage: data.error || `Voice generation failed with ${response.status}`,
      };
    }

    const audioBlob = await response.blob();
    return { ok: true, audioBlob };
  } catch (err: unknown) {
    // catch bindings are unknown under strict TS — we must narrow before reading fields.
    if (isAbortError(err)) {
      return { ok: false, errorMessage: voiceErrors.timeout };
    }

    return { ok: false, errorMessage: getErrorMessage(err) };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
