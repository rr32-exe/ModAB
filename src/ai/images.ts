import type { Env, ImageData } from "../types";

// ─── Image generation ────────────────────────────────────────────────────────
export async function generateArticleImages(
  env: Env,
  topic: string,
  articleTitle: string
): Promise<ImageData[]> {
  const prompts = buildImagePrompts(topic, articleTitle);
  const positions: ImageData["position"][] = ["cover", "inline", "inline", "sidebar"];

  const results = await Promise.allSettled(
    prompts.map((prompt, idx) =>
      generateSingleImage(env, prompt, positions[idx] ?? "inline")
    )
  );

  const images: ImageData[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result && result.status === "fulfilled") {
      images.push(result.value);
    }
  }

  return images;
}

// ─── Single image ─────────────────────────────────────────────────────────────
async function generateSingleImage(
  env: Env,
  prompt: string,
  position: ImageData["position"]
): Promise<ImageData> {
  // response type varies by model – handle as unknown
  const rawResponse = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    { prompt }
  );

  // response is a ReadableStream<Uint8Array> from the SD model
  let bytes: Uint8Array;

  if (rawResponse instanceof ReadableStream) {
    const reader = (rawResponse as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const read = await reader.read();
      done = read.done;
      if (read.value) chunks.push(read.value);
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  } else if (rawResponse instanceof Uint8Array) {
    bytes = rawResponse as Uint8Array;
  } else {
    // Fallback: empty placeholder
    bytes = new Uint8Array(0);
  }

  const base64 = uint8ArrayToBase64(bytes);

  // Generate alt text
  const altText = await generateAltText(env, prompt);

  return {
    alt: altText,
    base64,
    width: 1024,
    height: 1024,
    position,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildImagePrompts(topic: string, articleTitle: string): string[] {
  const base = `high quality, professional photography, ${topic}`;

  return [
    `${base}, hero shot, cinematic lighting, wide angle, travel blog cover image, 4k`,
    `${base}, lifestyle photography, people enjoying, warm colors, authentic moment`,
    `${base}, detail shot, close up, beautiful composition, editorial style`,
    `${base}, scenic view, golden hour, stunning landscape, award winning photography`,
  ];
}

// ─── Alt text ─────────────────────────────────────────────────────────────────
async function generateAltText(env: Env, prompt: string): Promise<string> {
  try {
    const response = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          {
            role: "user",
            content: `Write a concise, descriptive alt text (max 125 chars) for an image described as: "${prompt}". 
Return ONLY the alt text, no quotes or explanation.`,
          },
        ],
      max_tokens: 64,
    });

    const text =
      typeof response === "object" && response !== null && "response" in response
        ? String((response as { response: unknown }).response).trim()
        : "";

    return text.slice(0, 125) || prompt.slice(0, 125);
  } catch {
    return prompt.slice(0, 125);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}
