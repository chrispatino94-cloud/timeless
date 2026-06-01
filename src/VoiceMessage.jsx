import { useEffect, useMemo, useRef, useState } from "react";

const RACHEL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

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
    const apiKey = process.env.REACT_APP_ELEVENLABS_API_KEY;

    if (!apiKey || apiKey === "your_key_here") {
      setError("Add your ElevenLabs API key to .env first.");
      return;
    }

    if (!cleanText) {
      setError("Write or select a message before generating voice.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${RACHEL_VOICE_ID}`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs returned ${response.status}`);
      }

      const audioBlob = await response.blob();
      setAudioUrl(URL.createObjectURL(audioBlob));
    } catch (err) {
      setError(err.message || "Could not generate voice right now.");
    } finally {
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
