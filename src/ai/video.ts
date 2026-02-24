import type { Env, VideoData } from "../types";

interface VideoConfig {
  title?: string;
  duration?: number;
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export async function generateVideo(
  env: Env,
  topic: string,
  config: VideoConfig = {}
): Promise<VideoData> {
  // Try Luma Dream Machine first if API key is configured
  if (env.LUMA_API_KEY) {
    try {
      return await generateLumaVideo(env, topic, config);
    } catch (err) {
      console.warn("Luma video generation failed, falling back to YouTube:", err);
    }
  }

  // Fall back to YouTube search
  if (env.YOUTUBE_API_KEY) {
    return await searchYouTubeVideo(env, topic, config.title);
  }

  // Final fallback: empty placeholder
  return {
    source: "youtube",
    embed_id: "",
    embed_url: "",
    title: config.title ?? topic,
    thumbnail_url: "",
  };
}

// ─── Luma Dream Machine ───────────────────────────────────────────────────────
async function generateLumaVideo(
  env: Env,
  topic: string,
  config: VideoConfig
): Promise<VideoData> {
  const prompt = `${config.title ?? topic}: cinematic travel video, professional quality, smooth camera movement`;

  const createRes = await fetch(
    "https://lumalabs.ai/dream-machine/api/v1/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LUMA_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio: "16:9",
        loop: false,
      }),
    }
  );

  if (!createRes.ok) {
    throw new Error(`Luma API error: ${createRes.status} ${createRes.statusText}`);
  }

  const generation = (await createRes.json()) as {
    id: string;
    state: string;
    video?: { url: string; thumbnail_url?: string };
  };

  // Poll for completion (up to 60 s)
  let attempts = 0;
  let genData = generation;

  while (attempts < 20 && genData.state !== "completed" && genData.state !== "failed") {
    await sleep(3000);
    const pollRes = await fetch(
      `https://lumalabs.ai/dream-machine/api/v1/generations/${genData.id}`,
      {
        headers: { Authorization: `Bearer ${env.LUMA_API_KEY}` },
      }
    );

    if (!pollRes.ok) break;
    genData = (await pollRes.json()) as typeof genData;
    attempts++;
  }

  if (genData.state !== "completed" || !genData.video?.url) {
    throw new Error("Luma video generation did not complete in time");
  }

  return {
    source: "luma",
    embed_id: genData.id,
    embed_url: genData.video.url,
    title: config.title ?? topic,
    thumbnail_url: genData.video.thumbnail_url ?? "",
  };
}

// ─── YouTube search fallback ──────────────────────────────────────────────────
async function searchYouTubeVideo(
  env: Env,
  topic: string,
  title?: string
): Promise<VideoData> {
  const query = encodeURIComponent(title ?? topic);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${env.YOUTUBE_API_KEY}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; thumbnails?: { high?: { url?: string } } };
    }>;
  };

  const item = data.items?.[0];
  const videoId = item?.id?.videoId;

  if (!videoId) {
    throw new Error("No YouTube results found");
  }

  return {
    source: "youtube",
    embed_id: videoId,
    embed_url: `https://www.youtube.com/embed/${videoId}`,
    title: item?.snippet?.title ?? (title ?? topic),
    thumbnail_url: item?.snippet?.thumbnails?.high?.url ?? "",
  };
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
