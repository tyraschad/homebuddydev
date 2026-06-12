import { createServerFn } from "@tanstack/react-start";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ContextInput = {
  query: string;
  device?: { name: string; brand?: string; type?: string; photo?: string; questions: string[] } | null;
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
    if (data.device) ctx.push(`Device: ${data.device.name}${data.device.brand ? ` (brand: ${data.device.brand})` : ""}${data.device.type ? ` [${data.device.type}]` : ""}.`);
    if (data.reminder) {
      ctx.push(`Reminder: ${data.reminder.name}${data.reminder.time ? ` at ${data.reminder.time}` : ""}${data.reminder.dose ? `, ${data.reminder.dose} pill(s)` : ""}${data.reminder.notes ? `. Notes: ${data.reminder.notes}` : ""}.`);
    }
    const photoNote = data.device?.photo ? " The attached photo shows the device — use it to give accurate visual cues (button color, position, labels)." : "";
    const userPrompt = `${ctx.join(" ")}\nUser request: "${data.query}"\nProduce 3-5 step-by-step instructions to help them. Each step 1-3 sentences.${photoNote}`;

    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userPrompt }];
    if (data.device?.photo) {
      userContent.push({ type: "image_url", image_url: { url: data.device.photo } });
    }

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
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
    const photoNote = data.device?.photo ? " The attached photo shows the device — use it to ground your answer in what's visible." : "";
    const userPrompt = `${ctx.join(" ")}\nQuestion: "${data.query}"\nGive ONE concise answer (1-3 sentences).${photoNote}`;

    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userPrompt }];
    if (data.device?.photo) {
      userContent.push({ type: "image_url", image_url: { url: data.device.photo } });
    }

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
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

type ClarifyMsg = { role: "user" | "assistant"; content: string };
type ClarifyInput = {
  query: string;
  device?: { name: string; brand?: string; type?: string; photo?: string; questions: string[] } | null;
  conditions: string[];
  clarifyHistory: ClarifyMsg[];
  turnCount: number;
};
type ClarifyResult =
  | { kind: "question"; question: string; quickReplies?: string[]; expectsFreeText: boolean }
  | { kind: "steps"; steps: string[] };

export const clarifyOrAnswer = createServerFn({ method: "POST" })
  .inputValidator((d: ClarifyInput) => d)
  .handler(async ({ data }): Promise<ClarifyResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const baseSystem = buildSystem(data.conditions);

    const lower = data.conditions.map((c) => c.toLowerCase());
    const cognitive = lower.some((c) => c.includes("cognitive") || c.includes("dementia") || c.includes("memory"));
    const maxQuestions = cognitive ? 1 : 2;

    const dev = data.device;
    const devLine = dev
      ? `Device: ${dev.name}${dev.brand ? ` (brand: ${dev.brand})` : ""}${dev.type ? ` [type: ${dev.type}]` : ""}.${dev.photo ? " A photo of the device is attached." : ""}`
      : "No device specified.";

    const rules = [
      `You are guiding an elderly person. Before returning steps, ask AT LEAST ONE short clarifying question to ground your answer in their current situation, UNLESS the attached photo already answers the only thing you'd need to ask — then you may go straight to steps.`,
      `Hard maximum of ${maxQuestions} clarifying question(s) total in this session.`,
      `For each question, pick the answer mode:`,
      `  - If the answer is from a small known set (yes/no, on/off, channel/app name, simple state) → provide 2-4 short quickReplies and set expectsFreeText to false.`,
      `  - If the answer is open-ended (what they see, a channel number, a name) → omit quickReplies (or provide at most 2 hints) and set expectsFreeText to true.`,
      `  - When you provide quickReplies, always include "Not sure" as one of them (the UI will add it if you forget).`,
      dev?.brand || dev?.type ? `Tailor wording to the device (e.g. "On your ${[dev.brand, dev.type].filter(Boolean).join(" ")}, ...").` : "",
      `When you have enough context, call return_steps with 3-5 short steps (1-3 sentences each).`,
      `Questions asked so far this session: ${Math.max(0, data.turnCount)}.`,
    ].filter(Boolean).join("\n");

    const userIntro = `${devLine}\nUser request: "${data.query}"`;
    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: userIntro }];
    if (dev?.photo) userContent.push({ type: "image_url", image_url: { url: dev.photo } });

    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: `${baseSystem}\n\n${rules}` },
      { role: "user", content: userContent },
      ...data.clarifyHistory.map((m) => ({ role: m.role, content: m.content })),
    ];

    // If we've already hit the cap, force steps.
    const forceSteps = data.turnCount >= maxQuestions;

    const tools = [
      {
        type: "function",
        function: {
          name: "ask_clarifying_question",
          description: "Ask a single short clarifying question to ground the next answer.",
          parameters: {
            type: "object",
            properties: {
              question: { type: "string" },
              quickReplies: { type: "array", items: { type: "string" }, maxItems: 5 },
              expectsFreeText: { type: "boolean" },
            },
            required: ["question", "expectsFreeText"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "return_steps",
          description: "Return the final ordered step-by-step instructions.",
          parameters: {
            type: "object",
            properties: {
              steps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
            },
            required: ["steps"],
            additionalProperties: false,
          },
        },
      },
    ];

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages,
      tools,
      tool_choice: forceSteps
        ? { type: "function", function: { name: "return_steps" } }
        : "auto",
    };

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit. Please wait and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const fnName = call?.function?.name;
    const args = call?.function?.arguments;
    if (!fnName || !args) {
      // Fall back to text answer as a single step
      const txt = json.choices?.[0]?.message?.content ?? "";
      return { kind: "steps", steps: [String(txt).trim() || "Sorry, I couldn't find steps. Please try again."] };
    }
    const parsed = JSON.parse(args);
    if (fnName === "ask_clarifying_question") {
      const q = String(parsed.question || "").trim();
      if (!q) return { kind: "steps", steps: ["Sorry, I couldn't think of a good next step. Please try rephrasing."] };
      const expectsFreeText = Boolean(parsed.expectsFreeText);
      let quickReplies: string[] | undefined = Array.isArray(parsed.quickReplies)
        ? parsed.quickReplies.map((s: unknown) => String(s).trim()).filter(Boolean)
        : undefined;
      if (quickReplies && quickReplies.length && !quickReplies.some((r) => r.toLowerCase() === "not sure")) {
        quickReplies = [...quickReplies, "Not sure"];
      }
      return { kind: "question", question: q, quickReplies, expectsFreeText };
    }
    // return_steps
    const steps: string[] = Array.isArray(parsed.steps) ? parsed.steps.map((s: unknown) => String(s)).filter(Boolean) : [];
    return { kind: "steps", steps };
  });
