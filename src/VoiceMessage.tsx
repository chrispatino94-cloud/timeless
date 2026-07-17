import { useEffect, useMemo, useRef, useState } from "react";
import { generateVoiceAudio, voiceErrors } from "./voiceApi";

/**
 * Props for the voice UI. Typed with an interface so the parent (still JS)
 * gets editor/intellisense help when this file is open, and so TS catches
 * wrong prop names/types at the call site once the parent is converted later.
 */
export interface VoiceMessageProps {
  messageText: string;
}

export default function VoiceMessage({ messageText }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

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

  const generateVoice = async (): Promise<void> => {
    if (!cleanText) {
      // Empty text stays in the UI layer: instant feedback, no API credit spend.
      setError(voiceErrors.emptyText);
      return;
    }

    setIsGenerating(true);
    setError("");

    // Concern A: HTTP/timeout/error mapping lives in voiceApi.
    // Concern B: result is a typed discriminated union — branch on `ok`.
    const result = await generateVoiceAudio(cleanText);

    if (!result.ok) {
      setError(result.errorMessage);
      setIsGenerating(false);
      return;
    }

    setAudioUrl(URL.createObjectURL(result.audioBlob));
    setIsGenerating(false);
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
