import { useEffect, useMemo, useRef, useState } from "react";

const VOICE_REQUEST_TIMEOUT_MS = 45000;

const voiceErrors = {
  emptyText: "Write a message first, then I can turn it into audio.",
  paymentRequired:
    "This voice is not available on the current ElevenLabs plan yet. Please try again after the voice setting is updated.",
  timeout: "Voice generation is taking longer than expected. Please try again in a moment.",
  apiKeyMissing: "Voice generation is not connected yet. The site owner needs to add the ElevenLabs API key.",
  fallback: "I could not generate the voice right now. Please try again.",
};

export default function VoiceMessage({ messageText }) {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const cleanText = useMemo(() => (messageText || "").trim(), [messageText]);

  useEffect(() => {
    setAudioUrl("");
    setError("");
  }, [cleanText]);

  useEffect(() => {
    if (!audioUrl) return undefined;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (!audioUrl) return;
    audioRef.current?.play().catch(() => {
      /* The controls are still available if autoplay is blocked. */
    });
  }, [audioUrl]);

  const generateVoice = async () => {
    if (!cleanText) {
      // Empty text is handled before the request so users get instant feedback and we do not spend API credits on a bad payload.
      setError(voiceErrors.emptyText);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), VOICE_REQUEST_TIMEOUT_MS);

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        if (response.status === 402 || data.code === "payment_required") {
          // A 402 means ElevenLabs rejected the selected voice or plan, so the message points at account setup instead of blaming the user's text.
          setError(voiceErrors.paymentRequired);
          return;
        }

        if (data.code === "api_key_missing") {
          // Missing API keys are server configuration issues; the friendly copy avoids exposing environment variable details to regular users.
          setError(voiceErrors.apiKeyMissing);
          return;
        }

        throw new Error(data.error || `Voice generation failed with ${response.status}`);
      }

      const audioBlob = await response.blob();
      setAudioUrl(URL.createObjectURL(audioBlob));
    } catch (err) {
      if (err.name === "AbortError") {
        // TTS can occasionally hang behind an upstream service; aborting keeps the button from spinning forever.
        setError(voiceErrors.timeout);
        return;
      }

      setError(err.message || voiceErrors.fallback);
    } finally {
      window.clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "2rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid #e7e5e4",
      }}
    >
      <button
        type="button"
        onClick={generateVoice}
        disabled={isGenerating || !cleanText}
        style={{
          background: "#92400e",
          color: "white",
          border: "none",
          borderRadius: 2,
          padding: "10px 18px",
          fontSize: 13,
          fontWeight: 500,
          cursor: isGenerating || !cleanText ? "not-allowed" : "pointer",
          opacity: isGenerating || !cleanText ? 0.45 : 1,
          letterSpacing: "0.04em",
          fontFamily: "inherit",
        }}
      >
        {isGenerating ? "Generating..." : "Generate Voice"}
      </button>

      {error && (
        <p style={{ margin: "0.75rem 0 0", fontSize: 13, color: "#b45309", lineHeight: 1.5 }}>
          {error}
        </p>
      )}

      {audioUrl && (
        <div style={{ marginTop: "1rem", display: "grid", gap: 12 }}>
          <audio ref={audioRef} controls src={audioUrl} style={{ width: "100%" }}>
            Your browser does not support the audio element.
          </audio>
          <a
            href={audioUrl}
            download="timeless-voice-message.mp3"
            style={{
              justifySelf: "start",
              color: "#92400e",
              border: "1px solid #92400e",
              borderRadius: 2,
              padding: "9px 16px",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "0.04em",
              fontFamily: "inherit",
            }}
          >
            Download Voice
          </a>
        </div>
      )}
    </div>
  );
}
