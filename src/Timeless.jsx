import { useState, useEffect, useCallback } from "react";
import VoiceMessage from "./VoiceMessage.jsx";

const STORAGE_KEY = "timeless_vault_v1";

function getAppOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://timeless.app";
}

const MILESTONES = [
  { id: "b18", label: "18th Birthday", note: "The day they become an adult" },
  { id: "hs", label: "High School Graduation", note: "Walking across the stage" },
  { id: "college", label: "College Graduation", note: "Earning their degree" },
  { id: "job", label: "First Real Job", note: "When the career begins" },
  { id: "home", label: "First Home", note: "Getting the keys" },
  { id: "wedding", label: "Wedding Day", note: "When they find their person" },
  { id: "child", label: "Birth of First Child", note: "Becoming a parent" },
  { id: "b30", label: "30th Birthday", note: "A milestone decade" },
  { id: "hard", label: "Their Hardest Day", note: "For when they need you most" },
  { id: "yr1", label: "One Year After", note: "365 days without you" },
  { id: "miss", label: "Whenever They Miss You", note: "No date — just when they need it" },
];

const DEMO_VAULT = [
  {
    id: "d1",
    recipient: "Nolan",
    from: "Dad",
    milestone: MILESTONES[0],
    preview: "I remember the exact weight of you in my arms the first time. You came into the world with your fists already clenched, like you knew there was work to be done. That never changed.",
    full: `I remember the exact weight of you in my arms the first time. You came into the world with your fists already clenched, like you knew there was work to be done. That never changed.

By the time you're reading this, you've turned 18. I don't know exactly who you became — I only know who you were when I wrote this. And who you were was already enough to make everything worth it.

The things I need you to know: you were never a second thought. Every patent filed, every late night, every app I built at a library table with 40 minutes left on the clock — it was practice. Practice for the world I wanted to hand you. I wasn't just building companies. I was building a father worth having.

Be patient with the world, Nolan. It will be slower than you. Be patient with yourself on the days you feel behind — the people who changed things were always the ones who kept going after it stopped making sense.

I love you more than I have words for. I always did.
— Dad`,
    revealed: false,
  },
  {
    id: "d2",
    recipient: "Nolan",
    from: "Dad",
    milestone: MILESTONES[5],
    preview: "Whoever you choose to spend your life with — they're already lucky. Not because of anything I gave you, but because of who you chose to become.",
    full: `Whoever you choose to spend your life with — they're already lucky. Not because of anything I gave you, but because of who you chose to become despite everything.

I want you to know something I wish someone had told me: love isn't just a feeling. It's a practice. You'll have to choose it on the days it doesn't feel natural. Do it anyway. Show up on the Tuesdays that don't mean anything. That's where the real thing lives.

Be the kind of partner who's present — not just for the milestones, but for the ordinary nights. The arguments you don't win. The moments when someone just needs you in the room.

You know how to build things. I made sure of that. Now build a life with someone who makes the building feel worth it.

I'm proud of you for making it here. I was always proud of you.
— Dad`,
    revealed: false,
  },
  {
    id: "d3",
    recipient: "Nolan",
    from: "Dad",
    milestone: MILESTONES[6],
    preview: "Now you understand. Everything I ever did that looked crazy — the patents, the 2am sessions, the hundred tabs open — it was all for this exact moment.",
    full: `Now you understand.

Everything I ever did that looked crazy — the patents, the 2am coding sessions, the hundred tabs open at a library table with the clock running out — it was all for this exact moment you're in right now.

Because the first time you hold your child, something in you reorganizes. Everything that felt urgent stops mattering. And everything that seemed ordinary — a heartbeat, a hand wrapped around one finger — becomes the whole world.

I felt that with you. September 19, 2019. You came out and I understood, for the first time, what the word "everything" actually meant.

Be present. Put the phone down. Build them a world.

And when they're old enough, tell them their grandfather started building before they were born. Not for fame. Not for a Forbes list. For moments exactly like this one.

I love you both already.
— Dad`,
    revealed: false,
  },
];

function hydrateMilestone(stored) {
  if (!stored) return MILESTONES[0];
  const id = stored.id ?? stored;
  return MILESTONES.find((m) => m.id === id) ?? stored;
}

function loadVault() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((msg) => ({
      ...msg,
      milestone: hydrateMilestone(msg.milestone),
      revealed: Boolean(msg.revealed),
    }));
  } catch {
    return null;
  }
}

function saveVault(messages) {
  try {
    const serializable = messages.map((msg) => ({
      ...msg,
      milestone: { id: msg.milestone.id, label: msg.milestone.label, note: msg.milestone.note },
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    /* private browsing or quota */
  }
}

function generateShareId(existingIds = new Set()) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  do {
    id = "";
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  } while (existingIds.has(id));
  return id;
}

function vaultShareUrl(shareId) {
  return `${getAppOrigin()}/vault/${shareId}`;
}

function ensureShareIds(messages) {
  const ids = new Set(messages.map((m) => m.shareId).filter(Boolean));
  return messages.map((m) => {
    if (m.shareId) return m;
    const shareId = generateShareId(ids);
    ids.add(shareId);
    return { ...m, shareId };
  });
}

function exportMessagePdf(msg) {
  const url = msg.shareId ? vaultShareUrl(msg.shareId) : "";
  const executor =
    msg.executorName
      ? `<p style="margin-top:1.25rem;font-size:13px;color:#78716c;">Delivery entrusted to ${msg.executorName}${msg.executorEmail ? ` · ${msg.executorEmail}` : ""}</p>`
      : "";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Timeless — For ${msg.recipient}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400&display=swap" rel="stylesheet" />
  <style>
    @page { margin: 1.1in; }
    body { font-family: "Cormorant Garamond", Georgia, serif; color: #292524; margin: 0; padding: 0; }
    .wrap { max-width: 6.5in; margin: 0 auto; }
    .meta { font-family: Jost, sans-serif; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; color: #b45309; margin-bottom: 6px; }
    .sub { font-family: Jost, sans-serif; font-size: 12px; color: #a8a29e; margin-bottom: 2rem; font-weight: 300; }
    h1 { font-size: 28px; font-weight: 400; margin: 0 0 1.75rem; padding-bottom: 1.25rem; border-bottom: 1px solid #e7e5e4; }
    .body { font-size: 17px; line-height: 1.85; white-space: pre-wrap; }
    .sign { margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid #e7e5e4; font-family: Jost, sans-serif; font-size: 14px; color: #57534e; }
    .foot { margin-top: 2rem; font-family: Jost, sans-serif; font-size: 10px; color: #a8a29e; letter-spacing: 0.08em; }
    .seal { text-align: right; margin-bottom: 1rem; font-size: 11px; color: #92400e; letter-spacing: 0.15em; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="seal">TIMELESS™ · PATENT PENDING</div>
    <div class="meta">${msg.revealed ? "Opened Message" : "Sealed Message"} · ${msg.milestone.label}</div>
    <div class="sub">${msg.milestone.note}</div>
    <h1>For ${msg.recipient},</h1>
    <div class="body">${(msg.full || msg.preview || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <div class="sign">With love, ${msg.from}</div>
    ${executor}
    <div class="foot">${url ? `Vault link: ${url} · ` : ""}Sealed until ${msg.milestone.label}</div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to save as PDF, then use Print → Save as PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

const amber = {
  light: "#fef3c7",
  mid: "#f59e0b",
  dark: "#92400e",
  border: "#fde68a",
  muted: "#b45309",
};

const stone = {
  50: "#fafaf9",
  100: "#f5f5f4",
  200: "#e7e5e4",
  400: "#a8a29e",
  600: "#57534e",
  800: "#292524",
  900: "#1c1917",
};

const btn = {
  primary: {
    background: amber.dark,
    color: "white",
    border: "none",
    borderRadius: 2,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "0.04em",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  secondary: {
    background: "transparent",
    color: amber.dark,
    border: `1px solid ${amber.dark}`,
    borderRadius: 2,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "0.04em",
    fontFamily: "inherit",
  },
  ghost: {
    background: "none",
    border: "none",
    color: amber.dark,
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
};

const globalStyles = `
  @keyframes timelessFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes timelessFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes timelessCardIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes timelessModalIn {
    from { opacity: 0; transform: scale(0.97) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

function PadlockIcon({ size = 18, color = amber.dark }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="1.5" stroke={color} strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.25" fill={color} />
    </svg>
  );
}

function WaxSeal({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.92 }}>
      <circle cx="24" cy="24" r="22" fill={amber.light} stroke={amber.mid} strokeWidth="1.2" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={amber.dark} strokeWidth="0.8" opacity="0.35" />
      <circle cx="24" cy="24" r="12" fill={amber.mid} opacity="0.12" />
      <text x="24" y="27" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fill={amber.dark} letterSpacing="0.12em" fontWeight="600">T</text>
      <path d="M8 20 Q12 14 16 18 Q20 10 24 14 Q28 10 32 18 Q36 14 40 20" fill="none" stroke={amber.muted} strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

function SharePage({ msg, sans, onVault, onCompose }) {
  const [copied, setCopied] = useState(false);
  const link = vaultShareUrl(msg.shareId);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const el = document.createElement("textarea");
        el.value = link;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* user can select the input manually */
    }
  };

  return (
    <div style={{ textAlign: "center", paddingTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <WaxSeal size={64} />
      </div>
      <h2 style={{ fontSize: "2.5rem", fontWeight: 300, color: stone[900], margin: "0 0 0.5rem", lineHeight: 1.2 }}>
        Your message is sealed.
      </h2>
      <p style={{ fontFamily: sans, fontSize: 15, color: stone[600], margin: "0 auto 2rem", maxWidth: 420, fontWeight: 300, lineHeight: 1.7 }}>
        For <strong style={{ fontWeight: 500, color: amber.dark }}>{msg.recipient}</strong> · delivered at{" "}
        <strong style={{ fontWeight: 500, color: amber.dark }}>{msg.milestone.label}</strong>
      </p>

      <div
        style={{
          background: stone[50],
          border: `1px solid ${stone[200]}`,
          borderRadius: 2,
          padding: "1.25rem 1rem",
          marginBottom: "1rem",
          textAlign: "left",
        }}
      >
        <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.2em", color: amber.muted, textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>
          Private vault link
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            style={{
              flex: "1 1 200px",
              fontFamily: sans,
              fontSize: 14,
              padding: "11px 12px",
              border: `1px solid ${stone[200]}`,
              borderRadius: 2,
              background: "white",
              color: stone[800],
              outline: "none",
            }}
          />
          <button
            onClick={handleCopy}
            style={{ ...btn.primary, padding: "11px 20px", fontSize: 13, flexShrink: 0 }}
          >
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      {msg.executorName && (
        <p style={{ fontFamily: sans, fontSize: 13, color: stone[500], margin: "0 0 2rem", fontWeight: 300, lineHeight: 1.6 }}>
          Share this link with {msg.executorName}
          {msg.executorEmail ? ` (${msg.executorEmail})` : ""} — they will deliver your message at the right time.
        </p>
      )}

      <p style={{ fontFamily: sans, fontSize: 12, color: stone[400], margin: "0 0 2.5rem", fontWeight: 300 }}>
        Only people with this link can access the vault entry. The message stays sealed until its milestone.
      </p>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => exportMessagePdf(msg)} style={{ ...btn.secondary, fontSize: 13 }}>
          Save as PDF
        </button>
        <button type="button" onClick={onVault} style={btn.secondary}>
          View in Vault
        </button>
        <button type="button" onClick={onCompose} style={btn.primary}>
          Compose Another
        </button>
      </div>
    </div>
  );
}

function AboutPage({ sans, onBack }) {
  const useCases = [
    {
      title: "For parents",
      body: "Write to your child before they're old enough to understand — sealed until graduation, their wedding, or the day they become a parent themselves.",
    },
    {
      title: "For partners",
      body: "Leave words for the vows you never got to revise, the hard season you saw coming, or the ordinary Tuesday when they'll need to hear you stayed.",
    },
    {
      title: "For friends",
      body: "Be the person who shows up later — with a message timed for their hardest day, their biggest win, or the moment they miss you most.",
    },
  ];

  return (
    <div>
      <button onClick={onBack} style={btn.ghost}>
        ← Back
      </button>

      <div style={{ marginTop: "1.5rem", marginBottom: "2.5rem" }}>
        <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.25em", color: amber.muted, textTransform: "uppercase", fontWeight: 500, marginBottom: "1rem" }}>
          About Timeless™
        </div>
        <h2 style={{ fontSize: "2.35rem", fontWeight: 300, color: stone[900], margin: "0 0 1.5rem", lineHeight: 1.2 }}>
          Words that arrive when they matter.
        </h2>
        <div style={{ fontSize: "1.2rem", lineHeight: 1.85, color: stone[700], maxWidth: 560 }}>
          <p style={{ margin: "0 0 1rem" }}>Timeless lets you write sealed messages tied to life milestones — not dates on a calendar, but moments in a human life.</p>
          <p style={{ margin: "0 0 1rem" }}>Each message stays locked until that moment arrives. A trusted executor delivers it at the right time.</p>
          <p style={{ margin: "0 0 1rem" }}>You can share a private vault link, export a letter for a physical seal, and know your words survive even if you cannot be there to say them.</p>
          <p style={{ margin: 0, fontStyle: "italic", color: amber.dark }}>Patent pending · Built for the people who love someone past a single conversation.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {useCases.map((uc) => (
          <div
            key={uc.title}
            style={{
              background: "white",
              border: `1px solid ${stone[200]}`,
              borderRadius: 2,
              padding: "1.35rem 1.25rem",
              borderTop: `3px solid ${amber.mid}`,
            }}
          >
            <h3 style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: amber.dark, margin: "0 0 10px", fontWeight: 500 }}>
              {uc.title}
            </h3>
            <p style={{ fontFamily: sans, fontSize: 14, color: stone[600], margin: 0, fontWeight: 300, lineHeight: 1.65 }}>
              {uc.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealModal({ msg, sans, onCancel, onConfirm }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28, 25, 23, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        zIndex: 1000,
        animation: "timelessFadeIn 0.25s ease forwards",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          border: `1px solid ${stone[200]}`,
          borderRadius: 2,
          padding: "2.25rem 2rem",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 12px 40px rgba(28, 25, 23, 0.12)",
          animation: "timelessModalIn 0.3s ease forwards",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <PadlockIcon size={28} />
        </div>
        <h3 id="reveal-modal-title" style={{ fontFamily: "inherit", fontSize: "1.5rem", fontWeight: 400, color: stone[900], margin: "0 0 0.75rem", lineHeight: 1.3 }}>
          Open this message early?
        </h3>
        <p style={{ fontFamily: sans, fontSize: 14, color: stone[600], lineHeight: 1.7, margin: "0 0 1.75rem", fontWeight: 300 }}>
          This message is sealed until <strong style={{ fontWeight: 500, color: amber.dark }}>{msg.milestone.label}</strong>. Are you sure you want to open it now?
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onCancel} style={{ ...btn.secondary, padding: "10px 20px", fontSize: 13 }}>Keep Sealed</button>
          <button onClick={onConfirm} style={{ ...btn.primary, padding: "10px 20px", fontSize: 13 }}>Open Message</button>
        </div>
      </div>
    </div>
  );
}

export default function Timeless() {
  const [view, setView] = useState("landing");
  const [messages, setMessages] = useState(() => {
    const loaded = loadVault() ?? DEMO_VAULT;
    return ensureShareIds(loaded);
  });
  const [sharedMessage, setSharedMessage] = useState(null);
  const [draft, setDraft] = useState({
    recipient: "",
    from: "",
    milestone: null,
    body: "",
    executorName: "",
    executorEmail: "",
  });
  const [selected, setSelected] = useState(null);
  const [pendingReveal, setPendingReveal] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const [landingVisible, setLandingVisible] = useState(false);

  useEffect(() => {
    saveVault(messages);
  }, [messages]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap";
    link.onload = () => setFontsReady(true);
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    if (view === "landing") {
      setLandingVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setLandingVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [view]);

  const display = fontsReady ? '"Cormorant Garamond", Georgia, serif' : "Georgia, serif";
  const sans = fontsReady ? '"Jost", system-ui, sans-serif' : "system-ui, sans-serif";

  const revealMessage = useCallback((msg) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, revealed: true } : m)));
    setSelected({ ...msg, revealed: true });
    setPendingReveal(null);
    setView("detail");
  }, []);

  const handleAI = useCallback(async () => {
    if (!draft.recipient || !draft.milestone) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Write a heartfelt, deeply personal legacy message from "${draft.from || "someone who loves them"}" to "${draft.recipient}" to be delivered at their "${draft.milestone.label}" — ${draft.milestone.note}.

Write 3–4 paragraphs that:
- Feel genuinely human and specific, not generic
- Speak to what this milestone actually means in a life
- Carry real wisdom and love, the kind that only comes from knowing someone deeply
- Avoid all clichés — every line should feel like it was written for this person specifically
- End with something they'll carry forever

Write the message directly, as the person writing it. No preamble, no meta-commentary. Begin immediately.`,
            },
          ],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b) => b.type === "text")?.text || "";
      if (text) setDraft((d) => ({ ...d, body: text }));
      else setAiError("Something went wrong — your own words are always enough.");
    } catch {
      setAiError("Could not reach the AI — but what you'd say yourself is the best thing anyway.");
    }
    setAiLoading(false);
  }, [draft.recipient, draft.from, draft.milestone]);

  const handleSave = () => {
    if (!draft.recipient || !draft.milestone || !draft.body.trim()) return;
    const existingIds = new Set(messages.map((m) => m.shareId).filter(Boolean));
    const shareId = generateShareId(existingIds);
    const msg = {
      id: Date.now().toString(),
      shareId,
      recipient: draft.recipient,
      from: draft.from || "You",
      milestone: draft.milestone,
      preview: draft.body.slice(0, 160) + (draft.body.length > 160 ? "..." : ""),
      full: draft.body,
      executorName: draft.executorName.trim() || null,
      executorEmail: draft.executorEmail.trim() || null,
      revealed: false,
    };
    setMessages((m) => [msg, ...m]);
    setSharedMessage(msg);
    setDraft({
      recipient: "",
      from: "",
      milestone: null,
      body: "",
      executorName: "",
      executorEmail: "",
    });
    setView("share");
  };

  const fadeUp = (delay = 0) => ({
    opacity: landingVisible ? 1 : 0,
    transform: landingVisible ? "translateY(0)" : "translateY(18px)",
    transition: `opacity 0.9s ease ${delay}s, transform 0.9s ease ${delay}s`,
  });

  const wrap = {
    fontFamily: display,
    minHeight: 500,
    padding: "2.5rem 1.5rem",
    maxWidth: 700,
    margin: "0 auto",
  };

  // ── LANDING ──────────────────────────────────────────────────────────────
  if (view === "landing") {
    return (
      <div style={{ ...wrap, textAlign: "center", paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
        <div
          style={{
            ...fadeUp(0),
            fontFamily: sans,
            fontSize: 10,
            letterSpacing: "0.3em",
            color: amber.muted,
            fontWeight: 500,
            textTransform: "uppercase",
            marginBottom: "2rem",
          }}
        >
          TIMELESS™ &nbsp;·&nbsp; PATENT PENDING
        </div>

        <h1
          style={{
            ...fadeUp(0.12),
            fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
            fontWeight: 300,
            lineHeight: 1.12,
            color: stone[900],
            margin: "0 auto 1.25rem",
            maxWidth: 580,
            letterSpacing: "-0.01em",
          }}
        >
          Some words are too{" "}
          <em style={{ fontStyle: "italic", fontWeight: 400, color: amber.dark }}>
            important to say just once.
          </em>
        </h1>

        <p
          style={{
            ...fadeUp(0.24),
            fontFamily: sans,
            fontSize: 16,
            fontWeight: 300,
            color: stone[600],
            maxWidth: 480,
            margin: "0 auto 2.5rem",
            lineHeight: 1.75,
          }}
        >
          Leave messages for the people you love, to be delivered at the moments that matter most — even long after you're gone.
        </p>

        <div style={{ ...fadeUp(0.36), display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <button onClick={() => setView("compose")} style={btn.primary}>
            Compose a Message
          </button>
          <button onClick={() => setView("vault")} style={btn.secondary}>
            View the Vault ({messages.length})
          </button>
        </div>

        <button
          onClick={() => setView("about")}
          style={{
            ...fadeUp(0.42),
            ...btn.ghost,
            margin: "0 auto 3.5rem",
            fontFamily: sans,
            fontSize: 13,
            letterSpacing: "0.06em",
            color: stone[500],
          }}
        >
          About Timeless →
        </button>

        {/* Preview card */}
        <div
          style={{
            ...fadeUp(0.48),
            background: "white",
            border: `1px solid ${stone[200]}`,
            borderRadius: 2,
            padding: "1.75rem 2rem",
            textAlign: "left",
            maxWidth: 500,
            margin: "0 auto 3rem",
            borderLeft: `3px solid ${amber.mid}`,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            <WaxSeal size={36} />
          </div>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.2em", color: amber.muted, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>
            SEALED · For Nolan · Wedding Day
          </div>
          <p style={{ fontStyle: "italic", fontSize: "1.15rem", color: stone[600], lineHeight: 1.7, margin: 0, paddingRight: 40 }}>
            "Whoever you choose to spend your life with — they're already lucky. Not because of anything I gave you, but because of who you chose to become..."
          </p>
          <div style={{ fontFamily: sans, fontSize: 12, color: stone[400], marginTop: 12 }}>— Dad</div>
        </div>

        <div
          style={{
            ...fadeUp(0.58),
            fontFamily: sans,
            fontSize: 12,
            color: stone[400],
            borderTop: `1px solid ${stone[200]}`,
            paddingTop: "1.5rem",
            letterSpacing: "0.03em",
          }}
        >
          A father for his son · A mother for her daughter · A friend for hard times ahead
        </div>
      </div>
    );
  }

  // ── ABOUT ─────────────────────────────────────────────────────────────────
  if (view === "about") {
    return (
      <div style={wrap}>
        <AboutPage sans={sans} onBack={() => setView("landing")} />
        <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
          <button onClick={() => setView("compose")} style={btn.primary}>
            Compose a Message
          </button>
        </div>
      </div>
    );
  }

  // ── SHARE ───────────────────────────────────────────────────────────────────
  if (view === "share" && sharedMessage) {
    return (
      <div style={wrap}>
        <SharePage
          msg={sharedMessage}
          sans={sans}
          onVault={() => setView("vault")}
          onCompose={() => {
            setSharedMessage(null);
            setView("compose");
          }}
        />
      </div>
    );
  }

  // ── COMPOSE ───────────────────────────────────────────────────────────────
  if (view === "compose") {
    const canAI = draft.recipient.trim() && draft.milestone;
    const canSave = canAI && draft.body.trim();
    return (
      <div style={{ ...wrap }}>
        <button onClick={() => setView("landing")} style={btn.ghost}>
          ← Back
        </button>

        <h2 style={{ fontSize: "2.25rem", fontWeight: 400, margin: "1.25rem 0 0.25rem", color: stone[900] }}>
          Compose a Message
        </h2>
        <p style={{ fontFamily: sans, fontSize: 14, color: stone[600], margin: "0 0 2rem", fontWeight: 300 }}>
          They'll receive it at the right moment. You just need to write it now.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[
            { key: "recipient", label: "For", placeholder: "Nolan" },
            { key: "from", label: "From", placeholder: "Dad" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label
                style={{
                  fontFamily: sans,
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  color: stone[600],
                  display: "block",
                  marginBottom: 7,
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {label}
              </label>
              <input
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  fontFamily: display,
                  fontSize: 20,
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${stone[200]}`,
                  borderRadius: 2,
                  outline: "none",
                  boxSizing: "border-box",
                  color: stone[900],
                  background: "white",
                }}
              />
            </div>
          ))}
        </div>

        <label
          style={{
            fontFamily: sans,
            fontSize: 11,
            letterSpacing: "0.15em",
            color: stone[600],
            display: "block",
            marginBottom: 10,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Deliver This Message When
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
            gap: 8,
            marginBottom: 28,
          }}
        >
          {MILESTONES.map((m) => {
            const active = draft.milestone?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setDraft((d) => ({ ...d, milestone: m }))}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  border: `1px solid ${active ? amber.dark : stone[200]}`,
                  borderRadius: 2,
                  background: active ? amber.light : "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: active ? amber.dark : stone[800],
                  lineHeight: 1.35,
                  fontFamily: sans,
                  transition: "all 0.12s",
                }}
              >
                {m.label}
                <div style={{ fontSize: 11, color: active ? amber.muted : stone[400], fontWeight: 300, marginTop: 3 }}>
                  {m.note}
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: stone[50],
            border: `1px solid ${stone[200]}`,
            borderRadius: 2,
            padding: "1.25rem 1.25rem 1rem",
            marginBottom: 28,
          }}
        >
          <label
            style={{
              fontFamily: sans,
              fontSize: 11,
              letterSpacing: "0.15em",
              color: stone[600],
              display: "block",
              marginBottom: 4,
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Who Should Deliver This?
          </label>
          <p
            style={{
              fontFamily: sans,
              fontSize: 13,
              color: stone[600],
              margin: "0 0 14px",
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            This person will be notified to deliver your message at the right time.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input
              value={draft.executorName}
              onChange={(e) => setDraft((d) => ({ ...d, executorName: e.target.value }))}
              placeholder="Full name"
              style={{
                fontFamily: sans,
                fontSize: 15,
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${stone[200]}`,
                borderRadius: 2,
                outline: "none",
                boxSizing: "border-box",
                color: stone[900],
                background: "white",
              }}
            />
            <input
              type="email"
              value={draft.executorEmail}
              onChange={(e) => setDraft((d) => ({ ...d, executorEmail: e.target.value }))}
              placeholder="Email address"
              style={{
                fontFamily: sans,
                fontSize: 15,
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${stone[200]}`,
                borderRadius: 2,
                outline: "none",
                boxSizing: "border-box",
                color: stone[900],
                background: "white",
              }}
            />
          </div>
        </div>

        <label
          style={{
            fontFamily: sans,
            fontSize: 11,
            letterSpacing: "0.15em",
            color: stone[600],
            display: "block",
            marginBottom: 8,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Your Message
        </label>
        <textarea
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder="Write what you'd want them to know at this moment in their life..."
          rows={11}
          style={{
            fontFamily: display,
            fontSize: 18,
            lineHeight: 1.85,
            width: "100%",
            padding: "14px",
            border: `1px solid ${stone[200]}`,
            borderRadius: 2,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            color: stone[900],
            background: "white",
            marginBottom: 8,
          }}
        />

        {aiError && (
          <p style={{ fontFamily: sans, fontSize: 13, color: amber.muted, margin: "0 0 12px" }}>
            {aiError}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={handleAI}
            disabled={!canAI || aiLoading}
            style={{
              ...btn.secondary,
              opacity: canAI ? 1 : 0.35,
              cursor: canAI ? "pointer" : "not-allowed",
              fontSize: 13,
              padding: "10px 18px",
            }}
          >
            {aiLoading ? "Writing..." : "✦ Help me write this"}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...btn.primary,
              opacity: canSave ? 1 : 0.35,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            Seal & Save to Vault →
          </button>
        </div>
      </div>
    );
  }

  // ── VAULT ─────────────────────────────────────────────────────────────────
  if (view === "vault") {
    return (
      <div style={{ ...wrap }}>
        {pendingReveal && (
          <RevealModal
            msg={pendingReveal}
            sans={sans}
            onCancel={() => setPendingReveal(null)}
            onConfirm={() => revealMessage(pendingReveal)}
          />
        )}

        <button onClick={() => setView("landing")} style={btn.ghost}>
          ← Back
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "1.25rem 0 2rem" }}>
          <div>
            <h2 style={{ fontSize: "2.25rem", fontWeight: 400, margin: "0 0 4px", color: stone[900] }}>
              The Vault
            </h2>
            <p style={{ fontFamily: sans, fontSize: 14, color: stone[600], margin: 0, fontWeight: 300 }}>
              {messages.length} message{messages.length !== 1 ? "s" : ""} sealed and waiting
            </p>
          </div>
          <button onClick={() => setView("compose")} style={{ ...btn.primary, padding: "10px 18px", fontSize: 13 }}>
            + New Message
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((msg, i) => (
            <MsgCard
              key={msg.id}
              msg={msg}
              display={display}
              sans={sans}
              index={i}
              onClick={() => {
                if (!msg.revealed) {
                  setPendingReveal(msg);
                  return;
                }
                setSelected(msg);
                setView("detail");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── DETAIL ────────────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const shareLink = selected.shareId ? vaultShareUrl(selected.shareId) : null;

    return (
      <div style={{ ...wrap }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: "0.5rem" }}>
          <button
            onClick={() => {
              setView("vault");
              setSelected(null);
            }}
            style={btn.ghost}
          >
            ← Back to Vault
          </button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {shareLink && (
              <button
                onClick={() => {
                  setSharedMessage(selected);
                  setView("share");
                }}
                style={{ ...btn.secondary, padding: "9px 16px", fontSize: 12 }}
              >
                Share Link
              </button>
            )}
            <button
              onClick={() => exportMessagePdf(selected)}
              style={{ ...btn.primary, padding: "9px 16px", fontSize: 12 }}
            >
              Save as PDF
            </button>
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: `1px solid ${stone[200]}`,
            borderRadius: 2,
            padding: "3rem 2.5rem",
            marginTop: "1rem",
            borderTop: `3px solid ${amber.mid}`,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 20, right: 24 }}>
            <WaxSeal size={52} />
          </div>

          <div
            style={{
              fontFamily: sans,
              fontSize: 10,
              letterSpacing: "0.25em",
              color: amber.muted,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            {selected.revealed ? "Opened Message" : "Sealed Message"} · {selected.milestone.label}
          </div>
          <div style={{ fontFamily: sans, fontSize: 13, color: stone[400], marginBottom: "2rem", fontWeight: 300 }}>
            {selected.milestone.note}
          </div>

          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 400,
              margin: "0 0 2rem",
              color: stone[900],
              borderBottom: `1px solid ${stone[200]}`,
              paddingBottom: "1.5rem",
              paddingRight: 56,
            }}
          >
            For {selected.recipient},
          </h2>

          <div
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.9,
              color: stone[800],
              whiteSpace: "pre-wrap",
            }}
          >
            {selected.full || selected.preview}
          </div>

          <VoiceMessage messageText={selected.full || selected.preview} />

          <div
            style={{
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: `1px solid ${stone[200]}`,
              fontFamily: sans,
              fontSize: 14,
              color: stone[600],
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span>With love, {selected.from}</span>
              <span style={{ fontSize: 12, color: stone[400], letterSpacing: "0.05em" }}>TIMELESS™</span>
            </div>
            {selected.executorName && (
              <p style={{ fontSize: 13, color: stone[400], marginTop: 14, fontWeight: 300, lineHeight: 1.6 }}>
                Delivery entrusted to {selected.executorName}
                {selected.executorEmail ? ` · ${selected.executorEmail}` : ""}
              </p>
            )}
          </div>
        </div>

        {shareLink && (
          <p
            style={{
              fontFamily: sans,
              fontSize: 12,
              color: stone[500],
              textAlign: "center",
              marginTop: "1rem",
              fontWeight: 300,
              letterSpacing: "0.02em",
            }}
          >
            Vault: {shareLink}
          </p>
        )}

        <p
          style={{
            fontFamily: sans,
            fontSize: 12,
            color: stone[400],
            textAlign: "center",
            marginTop: shareLink ? "0.75rem" : "1.5rem",
            fontWeight: 300,
          }}
        >
          {selected.revealed
            ? "Opened before its milestone · Handle with care"
            : "This message is sealed until delivered"}{" "}
          · Patent Pending · Chris Patino, 2025
        </p>
      </div>
    );
  }

  return null;
}

function MsgCard({ msg, display, sans, onClick, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const sealed = !msg.revealed;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        background: sealed ? stone[50] : "white",
        border: `1px solid ${hovered ? amber.dark : stone[200]}`,
        borderLeft: `3px solid ${hovered ? amber.dark : amber.border}`,
        borderRadius: 2,
        padding: "20px 22px",
        cursor: "pointer",
        width: "100%",
        fontFamily: display,
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
        animation: `timelessCardIn 0.45s ease ${index * 0.06}s both`,
      }}
    >
      <div style={{ position: "absolute", bottom: 14, right: 16, opacity: sealed ? 0.85 : 0.55 }}>
        <WaxSeal size={40} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, paddingRight: 48 }}>
        <div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 10,
              letterSpacing: "0.2em",
              color: amber.muted,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            For {msg.recipient} · {msg.milestone.label}
          </div>
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 10,
            background: sealed ? amber.light : stone[100],
            color: sealed ? amber.dark : stone[600],
            padding: "3px 8px",
            borderRadius: 1,
            letterSpacing: "0.08em",
            fontWeight: 500,
            flexShrink: 0,
            marginLeft: 12,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {sealed ? (
            <>
              <PadlockIcon size={11} />
              SEALED
            </>
          ) : (
            "OPENED"
          )}
        </div>
      </div>

      {sealed ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0 4px", minHeight: 56 }}>
          <PadlockIcon size={20} color={amber.muted} />
          <p style={{ fontFamily: sans, fontSize: 14, color: stone[600], margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
            Sealed until <span style={{ color: amber.dark, fontWeight: 400 }}>{msg.milestone.label}</span>
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontStyle: "italic", fontSize: "1.05rem", color: stone[600], lineHeight: 1.65, margin: "0 0 10px", paddingRight: 40 }}>
            "{msg.preview}"
          </p>
          <div style={{ fontFamily: sans, fontSize: 12, color: stone[400] }}>— {msg.from}</div>
        </>
      )}

      {msg.executorName && sealed && (
        <div style={{ fontFamily: sans, fontSize: 11, color: stone[400], marginTop: 10, fontWeight: 300, letterSpacing: "0.02em" }}>
          Delivered by {msg.executorName}
        </div>
      )}
    </button>
  );
}
