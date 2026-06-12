import { createServerFn } from "@tanstack/react-start";

const BASE_PROMPT =
  "You are identifying household devices for an elder care app. Look at this photo and return only the device name, as short and specific as possible. Examples: 'TV remote', 'microwave', 'landline phone', 'wall thermostat'. Return the device name only, no explanation.";

export const identifyDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { dataUrl: string; brand?: string; type?: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");

    const match = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Invalid image data");
    const mimeType = match[1];
    const base64 = match[2];

    const brand = data.brand?.trim();
    const type = data.type?.trim();
    const hint = brand || type
      ? `The user says this is a ${[brand, type].filter(Boolean).join(" ")}. Use that as a strong hint; confirm or correct it based on the photo. Prefer the user's wording when it matches. `
      : "";
    const prompt = `${hint}${BASE_PROMPT}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64 } },
              ],
            },
          ],
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { name: text.trim().replace(/^["']|["']$/g, "") };
  });
