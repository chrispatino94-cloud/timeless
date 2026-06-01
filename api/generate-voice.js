import { Readable } from "node:stream";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    const raw = req.body.toString();
    return raw ? JSON.parse(raw) : {};
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "ElevenLabs API key is not configured" });
    return;
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voiceId =
    typeof body.voiceId === "string" && body.voiceId.trim()
      ? body.voiceId.trim()
      : DEFAULT_VOICE_ID;

  if (!text) {
    sendJson(res, 400, { error: "Missing text" });
    return;
  }

  try {
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const details = await elevenLabsResponse.text();
      sendJson(res, elevenLabsResponse.status, {
        error: "ElevenLabs voice generation failed",
        details: details.slice(0, 500),
      });
      return;
    }

    if (!elevenLabsResponse.body) {
      sendJson(res, 502, { error: "ElevenLabs returned no audio stream" });
      return;
    }

    res.setHeader("Content-Type", elevenLabsResponse.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    const contentLength = elevenLabsResponse.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    await new Promise((resolve, reject) => {
      const stream = Readable.fromWeb(elevenLabsResponse.body);

      stream.on("error", reject);
      res.on("finish", resolve);
      stream.pipe(res);
    });
  } catch (error) {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    sendJson(res, 502, { error: "Could not generate voice" });
  }
}
