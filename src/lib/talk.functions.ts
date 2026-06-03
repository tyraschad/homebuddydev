import { createServerFn } from "@tanstack/react-start";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ContextInput = {
  query: string;
  device?: { name: string; photo?: string; questions: string[] } | null;
  reminder?: { name: string; time?: string; dose?: number; notes?: string; type?: string; details?: string } | null;
  conditions: string[];
  mode: "steps" | "answer";
};

function buildSystem(conditions: string[]) {
  const adapt: string[] = [];
  const lower = conditions.map((c) => c.toLowerCase());
  if (lower.some((c) => c.includes("low vision") || c.includes("vision")))
    adapt.push("Use SHORT sentences and emphasize visual cues (BIG, RED, TOP) in CAPS.");
  if (lower.some((c) => c.includes("cognitive") || c.includes("dementia") || c.includes("memory")))
    adapt.push("Use very simple words. One action per step. Repeat key info.");
  if (lower.some((c) => c.includes("hearing")))
    adapt.push("Be clear and direct; avoid idioms.");
  return [
    "You help an elderly person. Be warm, concise, and crystal clear.",
    "Max 3 sentences per instruction. Avoid jargon.",
    ...adapt,
  ].join(" ");
}

export const generateSteps = createServerFn({ method: "POST" })
  .inputValidator((d: ContextInput) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const system = buildSystem(data.conditions);
    const ctx: string[] = [];
    if (data.device) ctx.push(`Device: ${data.device.name}.`);
    if (data.reminder) {
      ctx.push(`Reminder: ${data.reminder.name}${data.reminder.time ? ` at ${data.reminder.time}` : ""}${data.reminder.dose ? `, ${data.reminder.dose} pill(s)` : ""}${data.reminder.notes ? `. Notes: ${data.reminder.notes}` : ""}.`);
    }
    const userPrompt = `${ctx.join(" ")}\nUser request: "${data.query}"\nProduce 3-5 step-by-step instructions to help them. Each step 1-3 sentences.`;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_steps",
            description: "Return ordered step-by-step instructions",
            parameters: {
              type: "object",
              properties: {
                steps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
              },
              required: ["steps"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_steps" } },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit. Please wait and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace settings.");
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { steps: [] };
    return { steps: (parsed.steps || []) as string[] };
  });

export const answerQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: ContextInput) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const system = buildSystem(data.conditions);
    const ctx: string[] = [];
    if (data.device) ctx.push(`Device available: ${data.device.name}.`);
    if (data.reminder) ctx.push(`Reminder: ${data.reminder.name}${data.reminder.time ? ` at ${data.reminder.time}` : ""}.`);
    const userPrompt = `${ctx.join(" ")}\nQuestion: "${data.query}"\nGive ONE concise answer (1-3 sentences).`;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit. Please wait and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${res.status}`);
    }
    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content ?? "";
    return { answer: String(answer).trim() };
  });

type ReminderChatInput = {
  reminder: { name: string; time?: string; type?: string; dose?: number; details?: string; notes?: string };
  conditions: string[];
  messages: { role: "user" | "assistant"; content: string }[];
  stage: "intro" | "followup";
};

export const reminderChat = createServerFn({ method: "POST" })
  .inputValidator((d: ReminderChatInput) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const base = buildSystem(data.conditions);
    const r = data.reminder;
    const reminderFacts = [
      `Name: ${r.name}`,
      r.type ? `Type: ${r.type}` : null,
      r.time ? `Scheduled time: ${r.time}` : null,
      r.dose ? `Dose: ${r.dose} pill(s)` : null,
      r.details ? `Details/location: ${r.details}` : null,
      r.notes ? `Notes / what to bring: ${r.notes}` : null,
    ].filter(Boolean).join("\n");

    const introInstruction =
      `Reply in TWO short paragraphs.\n` +
      `Paragraph 1: Conversationally tell them about this reminder. Include the time. If location/details exist, include them. If notes mention what to bring, include that.\n` +
      `Paragraph 2: Ask an open-ended context question like "What do you see around you right now? Are you at home, in the car, or somewhere else?". Keep it warm.\n` +
      `Do NOT use lists. Do NOT mention any device.`;

    const followupInstruction =
      `The user just told you where they are or what they see. Give warm, contextual next-step guidance based on their location and this reminder.\n` +
      `Use a short intro sentence, then a brief numbered list (2-5 short steps) of what to do next.\n` +
      `Do NOT mention any device by name. Keep it conversational and reassuring.`;

    const system = `${base}\n\nYou are helping with a single reminder. Here are the reminder facts:\n${reminderFacts}\n\n${data.stage === "intro" ? introInstruction : followupInstruction}`;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          ...data.messages,
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit. Please wait and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${res.status}`);
    }
    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content ?? "";
    return { answer: String(answer).trim() };
  });

export const speak = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY not configured");
    const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah, warm clear
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: 0.95 },
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`TTS error ${res.status}: ${t.slice(0, 200)}`);
    }
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return { audio: base64, mime: "audio/mpeg" };
  });

export const transcribe = createServerFn({ method: "POST" })
  .inputValidator((d: { audio: string; mime?: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY not configured");
    const bytes = Buffer.from(data.audio, "base64");
    const mime = data.mime || "audio/webm";
    const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), `audio.${ext}`);
    form.append("model_id", "scribe_v2");
    form.append("language_code", "eng");
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit. Please try again.");
      throw new Error(`Transcription failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    return { text: String(json.text || "").trim() };
  });

export const realtimeScribeToken = createServerFn({ method: "POST" })
  .handler(async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY not configured");
    const res = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      { method: "POST", headers: { "xi-api-key": key } },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Token request failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    return { token: String(json.token || "") };
  });
