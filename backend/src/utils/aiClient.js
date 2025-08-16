// utils/aiClient.js
import dotenv from "dotenv";
dotenv.config();

/**
 * Central place to access an AI model.
 * - If OPENAI_API_KEY is set, uses OpenAI (chat completions)
 * - Otherwise falls back to a local mock
 */

let openai = null;
let model = process.env.AI_MODEL || "gpt-4o-mini"; // fast & cheap for tags/captions

if (process.env.OPENAI_API_KEY) {
  // Lazy import so app boots even if package missing in dev
  const { OpenAI } = await import("openai");
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const useOpenAI = Boolean(openai);

export async function aiGenerateTags({ title, content, mediaHints = [], max = 8 }) {
  // normalize inputs
  const safeMax = Math.min(Math.max(parseInt(max || 8, 10), 1), 20);

  if (!useOpenAI) {
    // ✅ Fallback mock for local/dev without keys
    const base = ["dev", "javascript", "react", "prisma", "cloudinary", "webrtc", "nodejs", "postgres"];
    return Array.from(new Set([...(mediaHints || []), ...base])).slice(0, safeMax);
  }

  const system = `You generate short, lowercase tags (no #) for social posts. 
Return ONLY a JSON array of strings. Avoid duplicates and single-letter tags.`;

  const user = `
Title: ${title || "(none)"}
Content: ${content || "(none)"}
Media hints: ${Array.isArray(mediaHints) ? mediaHints.join(", ") : "(none)"}
Max tags: ${safeMax}
  `.trim();

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.2,
  });

  const text = resp.choices?.[0]?.message?.content?.trim() || "[]";
  try {
    const parsed = JSON.parse(text);
    return (Array.isArray(parsed) ? parsed : []).map((t) => String(t).toLowerCase()).slice(0, safeMax);
  } catch {
    // defensive fallback
    return ["general", "post"].slice(0, safeMax);
  }
}

export async function aiSuggestCaptions({ title, content, tone = "friendly", count = 5 }) {
  const safeCount = Math.min(Math.max(parseInt(count || 5, 10), 1), 20);

  if (!useOpenAI) {
    // ✅ Fallback mock
    return [
      "Shipping something cool today 🚀",
      "Another day, another build ⚙️",
      "Learning in public. Join the journey!",
      "Sneak peek of what’s coming 👀",
      "Small steps, big wins."
    ].slice(0, safeCount);
  }

  const system = `You write concise social captions (max ~100 chars each). 
Avoid hashtags and emojis unless they add value. Output only a JSON array of strings.`;

  const user = `
Title: ${title || "(none)"}
Content: ${content || "(none)"}
Desired tone: ${tone}
Count: ${safeCount}
  `.trim();

  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.5,
  });

  const text = resp.choices?.[0]?.message?.content?.trim() || "[]";
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.slice(0, safeCount) : [];
  } catch {
    return ["Excited to share this!", "New drop soon.", "Work in progress.", "Thoughts?", "What do you think?"].slice(0, safeCount);
  }
}
// utils/aiClient.js (append these)

export async function aiMediaAwareCaptions({
    labels = [],           // e.g., ["laptop","coffee","code editor"] from FE or Vision
    mime = "",             // e.g., "image/jpeg" | "video/mp4"
    context = "",          // optional text context (post body)
    tone = "friendly",
    count = 5,
  }) {
    const safeCount = Math.min(Math.max(parseInt(count || 5, 10), 1), 20);
  
    if (!useOpenAI) {
      // Fallback mock uses labels to sound relevant
      const base = [
        `Quick look: ${labels.slice(0, 2).join(" + ")}`.trim(),
        `Behind the scenes: ${labels[0] || "project"}`,
        `Captured the moment.`,
        `From idea to screen.`,
        `What do you think?`,
      ];
      return base.slice(0, safeCount);
    }
  
    const system = `You write short, catchy social captions (<=100 chars). 
  Use the provided media labels/mime to stay relevant. Avoid hashtags unless necessary. 
  Output ONLY a JSON array of strings.`;
  
    const user = `
  Media labels: ${labels.join(", ") || "(none)"}
  Media mime: ${mime || "(unknown)"}
  Context: ${context || "(none)"}
  Tone: ${tone}
  Count: ${safeCount}
  `.trim();
  
    const resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
    });
  
    const text = resp.choices?.[0]?.message?.content?.trim() || "[]";
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.slice(0, safeCount) : [];
    } catch {
      return ["A quick snapshot.", "In the zone.", "Captured the vibe.", "Little progress.", "Your thoughts?"].slice(0, safeCount);
    }
  }
  
  export async function aiTitleFromContent({
    content = "",
    maxLen = 60,     // desired max chars
  }) {
    const safeMax = Math.min(Math.max(parseInt(maxLen || 60, 10), 20), 120);
  
    if (!useOpenAI) {
      // Simple mock: first sentence trimmed
      const s = String(content || "").split(/[.?!]/)[0] || "New post";
      return s.slice(0, safeMax);
    }
  
    const system = `You create short, informative post titles under ${safeMax} characters. 
  No emojis, no hashtags. Output ONLY the title as plain text.`;
  
    const user = `
  Content:
  ${content || "(empty)"} 
  `.trim();
  
    const resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
    });
  
    const title = resp.choices?.[0]?.message?.content?.trim() || "New post";
    return title.slice(0, safeMax);
  }
  