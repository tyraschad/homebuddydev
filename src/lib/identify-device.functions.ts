import { createServerFn } from "@tanstack/react-start";

const PROMPT =
  "You are identifying household devices for an elder care app. Look at this photo and return only the device name, as short and specific as possible. Examples: 'TV remote', 'microwave', 'landline phone', 'wall thermostat'. Return the device name only, no explanation.";

export const identifyDevice = createServerFn({ method: "POST" })
  .inputValidator((d: { dataUrl: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");

    const match = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Invalid image data");
    const mimeType = match[1];
    const base64 = match[2];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
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
