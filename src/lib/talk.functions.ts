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
