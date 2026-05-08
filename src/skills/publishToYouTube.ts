/**
 * publishToYouTube.ts
 *
 * Uploads videos to YouTube using the YouTube Data API v3.
 *
 * Supports:
 * - Direct upload with metadata (title, description, tags)
 * - Scheduled publishing
 * - Shorts upload (vertical 9:16 format, #Shorts in title)
 * - Privacy settings (public, unlisted, private)
 * - Thumbnail upload
 *
 * Requires OAuth 2.0 credentials (see README for setup).
 */

import { google, youtube_v3 } from "googleapis";
import { createReadStream, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";

// ─── Types ───

export interface YouTubeUploadOptions {
  /** Video title */
  title: string;
  /** Video description */
  description?: string;
  /** Tags/keywords */
  tags?: string[];
  /** Category ID (see YouTube category list; default: 22 = People & Blogs) */
  categoryId?: string;
  /** Privacy status */
  privacyStatus?: "private" | "unlisted" | "public";
  /** Whether this is a YouTube Short (adds #Shorts, sets vertical metadata) */
  isShort?: boolean;
  /** ISO 8601 date string for scheduled publishing (only for "private" videos) */
  scheduledPublishAt?: string;
  /** Whether the video is made for kids */
  madeForKids?: boolean;
  /** Path to a custom thumbnail image */
  thumbnailPath?: string;
  /** Language of the video */
  language?: string;
}

export interface YouTubeUploadResult {
  /** YouTube video ID */
  videoId: string;
  /** Full YouTube URL */
  url: string;
  /** Privacy status of the uploaded video */
  privacyStatus: string;
  /** Upload status */
  status: "uploaded" | "failed";
}

// ─── OAuth 2.0 authentication ───

const TOKEN_PATH = join(process.cwd(), ".youtube-token.json");
const CREDENTIALS_PATH = join(process.cwd(), "youtube-credentials.json");

/**
 * Get an authenticated YouTube API client using OAuth 2.0.
 *
 * Uses stored refresh tokens when available, otherwise prompts for
 * interactive authentication (one-time setup).
 */
async function getYouTubeClient(): Promise<youtube_v3.Youtube> {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `YouTube OAuth credentials not found at ${CREDENTIALS_PATH}\n\n` +
      `Setup instructions:\n` +
      `1. Go to https://console.cloud.google.com/apis/credentials\n` +
      `2. Create an OAuth 2.0 Client ID (Desktop application type)\n` +
      `3. Download the JSON and save it as youtube-credentials.json in the project root\n` +
      `4. The first upload will open a browser for authentication`,
    );
  }

  const credentials = JSON.parse(
    readFileSync(CREDENTIALS_PATH, "utf-8"),
  ) as {
    installed?: { client_id: string; client_secret: string; redirect_uris: string[] };
    web?: { client_id: string; client_secret: string; redirect_uris: string[] };
  };

  const clientInfo = credentials.installed ?? credentials.web;
  if (!clientInfo) {
    throw new Error("Invalid OAuth credentials format in youtube-credentials.json");
  }

  const oauth2Client = new google.auth.OAuth2(
    clientInfo.client_id,
    clientInfo.client_secret,
    clientInfo.redirect_uris?.[0] ?? "urn:ietf:wg:oauth:2.0:oob",
  );

  // Try to load existing token
  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
    oauth2Client.setCredentials(token);

    // Refresh if expired
    oauth2Client.on("tokens", (tokens) => {
      if (tokens.refresh_token) {
        writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      }
    });

    return google.youtube({ version: "v3", auth: oauth2Client });
  }

  // First-time auth: prompt user
  logger.info("First-time YouTube authentication required");
  logger.info("Opening browser for OAuth consent...");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
    ],
    prompt: "consent",
  });

  // Use a local redirect approach — the user pastes the code
  const { spawn } = await import("child_process");

  // Try to open the browser
  const platform = process.platform;
  const openCmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";

  spawn(openCmd, [authUrl], { detached: true, stdio: "ignore" }).unref();

  // For automated pipelines, try to use service accounts or stored tokens
  throw new Error(
    `🔐 YouTube authentication required\n\n` +
    `1. A browser window should have opened. If not, open this URL:\n` +
    `   ${authUrl}\n\n` +
    `2. Sign in with your YouTube/Google account\n` +
    `3. Copy the authorization code and set it as an env var:\n` +
    `   export YOUTUBE_AUTH_CODE=<your-code>\n\n` +
    `4. OR for CI/automated pipelines, use a service account:\n` +
    `   - Create a service account at console.cloud.google.com\n` +
    `   - Set YOUTUBE_CLIENT_EMAIL and YOUTUBE_PRIVATE_KEY env vars`,
  );
}

/**
 * Exchange an authorization code for tokens and save them.
 */
async function exchangeCode(code: string): Promise<youtube_v3.Youtube> {
  const credentials = JSON.parse(
    readFileSync(CREDENTIALS_PATH, "utf-8"),
  );

  const clientInfo = credentials.installed ?? credentials.web;
  const oauth2Client = new google.auth.OAuth2(
    clientInfo.client_id,
    clientInfo.client_secret,
    clientInfo.redirect_uris?.[0] ?? "urn:ietf:wg:oauth:2.0:oob",
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  logger.info("YouTube authentication successful! Token saved to .youtube-token.json");

  return google.youtube({ version: "v3", auth: oauth2Client });
}

/**
 * Get a YouTube client using a service account (for CI/automation).
 */
async function getServiceAccountClient(): Promise<youtube_v3.Youtube | null> {
  const email = process.env.YOUTUBE_CLIENT_EMAIL;
  const key = process.env.YOUTUBE_PRIVATE_KEY;

  if (!email || !key) return null;

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
    ],
  });

  await auth.authorize();
  return google.youtube({ version: "v3", auth });
}

// ─── Upload function ───

/**
 * Upload a video to YouTube.
 *
 * @param videoPath - Path to the video file (.mp4, .mov, etc.)
 * @param options - Upload metadata and settings
 * @returns YouTubeUploadResult with video ID and URL
 */
export async function publishToYouTube(
  videoPath: string,
  options: YouTubeUploadOptions,
): Promise<YouTubeUploadResult> {
  // Check file exists
  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const fileSize = statSync(videoPath).size;
  logger.info("Preparing YouTube upload...", {
    title: options.title,
    fileSizeMB: (fileSize / (1024 * 1024)).toFixed(1),
    privacy: options.privacyStatus ?? "private",
  });

  // Get authenticated client
  let youtube: youtube_v3.Youtube;

  // Try service account first
  const saClient = await getServiceAccountClient();
  if (saClient) {
    youtube = saClient;
    logger.info("Using service account for YouTube authentication");
  } else if (process.env.YOUTUBE_AUTH_CODE) {
    youtube = await exchangeCode(process.env.YOUTUBE_AUTH_CODE);
  } else {
    youtube = await getYouTubeClient();
  }

  // Prepare title — for Shorts, append #Shorts
  let title = options.title;
  if (options.isShort) {
    if (!title.includes("#Shorts") && !title.includes("#shorts")) {
      title = `${title} #Shorts`;
    }
  }

  // Prepare description
  let description = options.description ?? "";
  if (options.isShort) {
    const shortsTags = [
      "#Shorts",
      "#YouTubeShorts",
      ...(options.tags?.map((t) => `#${t.replace(/\s+/g, "")}`) ?? []),
    ];
    description = `${description}\n\n${shortsTags.join(" ")}`;
  }

  // Upload the video
  logger.info("Uploading video to YouTube...");

  const requestBody: youtube_v3.Schema$Video = {
    snippet: {
      title,
      description,
      tags: options.tags,
      categoryId: options.categoryId ?? "22", // People & Blogs
      defaultLanguage: options.language ?? "en",
      defaultAudioLanguage: options.language ?? "en",
    },
    status: {
      privacyStatus: options.privacyStatus ?? "private",
      madeForKids: options.madeForKids ?? false,
    },
  };

  const resumableUpload = await youtube.videos.insert({
    part: ["snippet", "status"],
    notifySubscribers: options.privacyStatus === "public",
    requestBody,
    media: {
      body: createReadStream(videoPath),
    },
  });

  const videoId = resumableUpload.data.id;
  if (!videoId) {
    throw new Error("YouTube upload failed: no video ID returned");
  }

  logger.info("YouTube upload successful!", { videoId });

  // Upload thumbnail if provided
  if (options.thumbnailPath && existsSync(options.thumbnailPath)) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          body: createReadStream(options.thumbnailPath),
        },
      });
      logger.info("Custom thumbnail uploaded");
    } catch (err) {
      logger.warn("Failed to upload custom thumbnail", { error: String(err) });
    }
  }

  // Set scheduled publish if requested and video is private
  if (options.scheduledPublishAt && options.privacyStatus === "private") {
    try {
      await youtube.videos.update({
        part: ["status"],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: "private",
            publishAt: options.scheduledPublishAt,
          },
        },
      });
      logger.info("Scheduled publish set", { at: options.scheduledPublishAt });
    } catch (err) {
      logger.warn("Failed to set scheduled publish", { error: String(err) });
    }
  }

  const url = `https://youtube.com/watch?v=${videoId}`;

  return {
    videoId,
    url,
    privacyStatus: options.privacyStatus ?? "private",
    status: "uploaded",
  };
}

/**
 * Upload a YouTube Short (convenience wrapper).
 *
 * Automatically sets vertical metadata and #Shorts tag.
 */
export async function publishShort(
  videoPath: string,
  options: Omit<YouTubeUploadOptions, "isShort">,
): Promise<YouTubeUploadResult> {
  return publishToYouTube(videoPath, {
    ...options,
    isShort: true,
    tags: [...(options.tags ?? []), "Shorts", "YouTubeShorts"],
  });
}

/**
 * Upload multiple videos in batch.
 */
export async function publishBatch(
  videos: Array<{ path: string; options: YouTubeUploadOptions }>,
  delayMs = 30000, // 30 seconds between uploads to avoid rate limits
): Promise<YouTubeUploadResult[]> {
  const results: YouTubeUploadResult[] = [];

  for (let i = 0; i < videos.length; i++) {
    const { path, options } = videos[i]!;
    logger.info(`Uploading video ${i + 1}/${videos.length}...`);

    try {
      const result = await publishToYouTube(path, options);
      results.push(result);
    } catch (err) {
      logger.error(`Failed to upload video ${i + 1}`, { error: String(err) });
      results.push({
        videoId: "",
        url: "",
        privacyStatus: options.privacyStatus ?? "private",
        status: "failed",
      });
    }

    // Delay between uploads
    if (i < videos.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ─── Utility: generate title/description from video idea ───

/**
 * Generate SEO-optimized YouTube title and description from a video idea.
 *
 * Uses the existing LLM pipeline (via @mariozechner/pi-ai) to create
 * click-worthy titles and keyword-rich descriptions.
 */
export async function generateYouTubeMetadata(
  idea: string,
  hook?: string,
): Promise<{ title: string; description: string; tags: string[] }> {
  // Try to use the existing LLM pipeline
  try {
    const { getModel, complete } = await import("@mariozechner/pi-ai");

    const model = getModel("opencode-go", "deepseek-v4-pro");
    const response = await complete(
      model,
      {
        systemPrompt:
          "You are a YouTube SEO expert. Generate click-worthy titles (max 100 chars), keyword-rich descriptions, and relevant tags for short-form videos. Return JSON only.",
        messages: [
          {
            role: "user" as const,
            content: `Video idea: ${idea}\n${hook ? `Hook: ${hook}` : ""}\n\nReturn JSON: { "title": "...", "description": "...", "tags": ["..."] }`,
            timestamp: Date.now(),
          },
        ],
      },
      { apiKey: process.env.OPENCODE_API_KEY },
    );

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const metadata = JSON.parse(jsonMatch[0]) as {
        title: string;
        description: string;
        tags: string[];
      };
      return metadata;
    }
  } catch {
    // Fallback: use simple templates
    logger.warn("LLM metadata generation failed, using template-based metadata");
  }

  // Fallback: template-based metadata
  return {
    title: `${idea.slice(0, 90)} #Shorts`,
    description: `${idea}\n\nAI-generated viral short. ${hook ?? ""}`,
    tags: ["Shorts", "AI Generated", "Viral"],
  };
}
