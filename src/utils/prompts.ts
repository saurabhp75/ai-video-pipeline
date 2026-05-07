// ─── AI Video Generation Prompt Templates ───

/**
 * System prompt for the AI video prompt generator skill.
 * Optimized for viral short-form content across Instagram, TikTok, YouTube Shorts.
 */
export const CINEMATIC_PROMPT_SYSTEM = `You are an elite viral short-form video creator.
Generate cinematic prompts for AI video models.
Focus on:
- motion
- cinematic camera movement
- viral aesthetics
- emotional hooks
- realism
- high retention`;

/**
 * System prompt for generating video ideas and content strategy.
 */
export const IDEA_SYSTEM_PROMPT = `You are a viral content strategist specializing in short-form video.
You understand platform algorithms, trending formats, and what makes content shareable.
Generate creative, specific video ideas optimized for the given platform.
Focus on: hooks that stop the scroll, emotional payoff, shareability.`;

/**
 * System prompt for storyboard generation.
 */
export const STORYBOARD_SYSTEM_PROMPT = `You are a professional storyboard artist and cinematographer for viral short-form videos.
You break down ideas into cinematic scenes optimized for AI video generation models.
Each scene must include precise camera direction and a prompt suitable for an AI video model.
Focus on: viral hook in first 2 seconds, fast pacing, dramatic transitions.`;

// ─── High-quality prompt structure ───

/**
 * Prompt structure for optimal video generation results:
 * [subject] [action] [environment] [camera movement] [lighting] [mood] [style] [quality]
 */
export const PROMPT_STRUCTURE = {
  subject: "what/who is in frame",
  action: "what is happening",
  environment: "where it takes place",
  camera: "camera movement and angle",
  lighting: "lighting style",
  mood: "emotional tone",
  style: "visual aesthetic",
  quality: "technical quality markers",
} as const;

// ─── Negative prompt defaults ───

/**
 * Default negative prompt for video generation.
 * Prevents common AI video artifacts.
 */
export const NEGATIVE_PROMPT =
  "blurry, distorted, low quality, ugly faces, watermark, jittery, artifacts, text, letters, morphing, deformed";

// ─── Trending content niches ───

export const TRENDING_NICHES = [
  "Indian mythology cinematics",
  "Cyberpunk India",
  "Historical alternate reality",
  "Horror POV videos",
  "Spiritual + philosophical shorts",
  "Motivational edits",
  "Fake movie trailers",
  "AI-generated luxury lifestyle",
  "AI podcast clips",
  "Tech future concepts",
] as const;

// ─── Video generation defaults ───

/**
 * Default Kling video generation parameters.
 */
export const DEFAULT_VIDEO_PARAMS = {
  duration: "10",
  aspectRatio: "9:16",
  cfgScale: 0.5,
  model: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
} as const;

/**
 * Platform-optimized aspect ratios.
 */
export const PLATFORM_ASPECT_RATIOS = {
  instagram: "9:16",
  tiktok: "9:16",
  youtube: "9:16",
  threads: "9:16",
} as const;

// ─── Cinematic camera movements ───

export const CAMERA_MOVEMENTS = [
  "slow dolly in",
  "cinematic tracking shot",
  "drone orbit",
  "whip pan",
  "crash zoom",
  "steadicam float",
  "parallax slide",
  "dutch angle tilt",
  "overhead crane",
  "snorricam POV",
] as const;

// ─── Cinematic transitions ───

export const TRANSITIONS = [
  "whip pan",
  "match cut",
  "dolly zoom",
  "smash cut",
  "cross dissolve",
  "J-cut",
  "L-cut",
  "speed ramp",
  "light leak",
  "ink bleed",
] as const;
