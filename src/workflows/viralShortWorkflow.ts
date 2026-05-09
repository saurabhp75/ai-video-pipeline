import { generateIdea } from "../skills/generateIdea.js";
import { generateScenes } from "../skills/generateScenes.js";
import { generateVideo } from "../skills/generateVideo.js";
import { generateVideoOpenRouter } from "../skills/generateVideoOpenRouter.js";
import { generateVoiceLocal } from "../skills/generateVoiceLocal.js";
import { generateCaptions } from "../skills/generateCaptions.js";
import { generateAndOverlayMusicAceStep } from "../skills/generateMusicAceStep.js";
import { downloadAndMerge } from "../skills/mergeAssets.js";
import { saveVideo } from "../skills/upload.js";
import { logger } from "../utils/logger.js";
import * as path from "path";

export interface ViralShortResult {
  idea: string;
  prompt: string;
  videoUrl: string;
  finalPath?: string;
  mergedPath?: string;
  captionedPath?: string;
  musicPath?: string;
}

export interface ViralShortOptions {
  /** Number of scenes in the storyboard (default: 1) */
  numScenes?: number;
  /** Enable TTS voiceover + merge */
  withVoice?: boolean;
  /** Enable auto-captions (whisper.cpp + FFmpeg burn-in) */
  withCaptions?: boolean;
  /** Enable background music (ACE-Step + overlay) */
  withMusic?: boolean;
  /** Music genre (default: "cinematic") */
  musicGenre?: string;
  /** Music volume relative to video audio (0-1, default: 0.15) */
  musicVolume?: number;
  /** Video provider: "fal" (fal.ai Kling) or "openrouter" (OpenRouter Kling v3 Pro) */
  videoProvider?: "fal" | "openrouter";
  /** Content niche for idea generation */
  niche?: string;
}

/**
 * Full viral short pipeline:
 * 1. Generate trending video idea (LLM)
 * 2. Generate storyboard + scene prompts (LLM)
 * 3. Generate video (fal.ai Kling or OpenRouter Kling v3 Pro)
 * 4. Generate voiceover (local TTS: Piper / macOS say)
 * 5. Merge video + audio (ffmpeg)
 * 6. Generate burnt-in captions (whisper.cpp + ffmpeg)
 * 7. Generate + overlay background music (ACE-Step + ffmpeg)
 * 8. Save final video to disk
 */
export async function viralShortWorkflow(
  topic: string,
  options?: ViralShortOptions,
): Promise<ViralShortResult> {
  const opts = {
    numScenes: 1,
    withVoice: false,
    withCaptions: false,
    withMusic: false,
    musicGenre: "cinematic",
    musicVolume: 0.15,
    videoProvider: "fal" as const,
    ...options,
  };

  logger.info("🚀 Starting viral short workflow", {
    topic,
    scenes: opts.numScenes,
    voice: opts.withVoice,
    captions: opts.withCaptions,
    music: opts.withMusic,
    videoProvider: opts.videoProvider,
  });

  // Step 1: Generate idea
  logger.step(1, 8, "Generating content idea...");
  const idea = await generateIdea(opts.niche ?? "Cyberpunk India");

  logger.info("Idea generated", {
    title: idea.title,
    niche: idea.niche,
    hook: idea.hook,
  });

  // Step 2: Generate cinematic prompt via storyboard + scenes
  logger.step(2, 8, "Generating scenes and cinematic prompts...");
  const scenes = await generateScenes(topic, opts.numScenes);

  // Step 3: Generate video(s)
  logger.step(3, 8, `Generating video (${opts.videoProvider})...`);
  const firstScene = scenes[0];
  if (!firstScene) {
    throw new Error("No scenes generated");
  }
  const prompt = firstScene.prompt;

  const videoUrl = opts.videoProvider === "openrouter"
    ? (await generateVideoOpenRouter({ prompt, duration: 10, aspectRatio: "9:16" })).videoUrl
    : await generateVideo(prompt);

  logger.info("Video generated", { videoUrl });

  // Step 4: Generate voiceover (optional)
  let mergedPath: string | undefined;
  if (opts.withVoice) {
    logger.step(4, 8, "Generating voiceover (local TTS)...");
    const voiceoverScript = `Hook: ${idea.hook}. ${idea.description}`;
    const voiceAudioPath = path.join(
      process.cwd(),
      "output",
      `voice-${Date.now()}.mp3`,
    );
    const voiceResult = await generateVoiceLocal(voiceoverScript, voiceAudioPath);
    logger.info("Voiceover generated", { engine: voiceResult.engine, voice: voiceResult.voice });

    // Step 5: Merge video + audio
    logger.step(5, 8, "Merging video and audio...");
    mergedPath = path.join(
      process.cwd(),
      "output",
      `viral-merged-${Date.now()}.mp4`,
    );

    mergedPath = await downloadAndMerge({
      videoUrl,
      audioUrl: voiceAudioPath,  // local file path from local TTS
      outputPath: mergedPath,
    });

    logger.info("Video + audio merged", { mergedPath });
  }

  // Determine the working video path for subsequent steps
  let workingVideoPath: string;

  if (mergedPath) {
    workingVideoPath = mergedPath;
  } else {
    // Download the raw video first so we can process it locally
    logger.info("Downloading raw video for processing...");
    const downloadPath = path.join(
      process.cwd(),
      "output",
      `viral-raw-${Date.now()}.mp4`,
    );
    workingVideoPath = await saveVideo(videoUrl, path.basename(downloadPath));
    // saveVideo saves into output/ with just the filename, reconstruct path
    workingVideoPath = path.join(
      process.cwd(),
      "output",
      path.basename(downloadPath),
    );
  }

  // Step 6: Generate burnt-in captions (optional)
  let captionedPath: string | undefined;
  if (opts.withCaptions) {
    logger.step(6, 8, "Generating burnt-in captions...");
    captionedPath = path.join(
      process.cwd(),
      "output",
      `viral-captioned-${Date.now()}.mp4`,
    );

    const captionResult = await generateCaptions(
      workingVideoPath,
      captionedPath,
      { style: "phrase" },
    );

    captionedPath = captionResult.outputPath;
    workingVideoPath = captionedPath; // Chain: captions → music

    logger.info("Captions generated", {
      captionedPath,
      transcript: captionResult.transcript.slice(0, 100),
    });
  }

  // Step 7: Generate + overlay background music (optional, ACE-Step local)
  let musicPath: string | undefined;
  if (opts.withMusic) {
    logger.step(7, 8, "Generating music with ACE-Step and overlaying...");
    musicPath = path.join(
      process.cwd(),
      "output",
      `viral-final-${Date.now()}.mp4`,
    );

    musicPath = await generateAndOverlayMusicAceStep(
      workingVideoPath,
      musicPath,
      { genre: opts.musicGenre, duration: 30 },
      opts.musicVolume,
    );

    logger.info("Background music added", { musicPath, genre: opts.musicGenre });
  }

  // Step 8: Save final video
  logger.step(8, 8, "Saving final video...");

  const finalVideoPath = musicPath ?? captionedPath ?? workingVideoPath;

  // If we already have a local file, just note it
  let finalPath: string;

  if (musicPath || captionedPath) {
    // Already saved locally
    finalPath = finalVideoPath;
  } else {
    // Save the video URL to disk
    finalPath = await saveVideo(videoUrl, `viral-final-${Date.now()}.mp4`);
  }

  logger.info("✅ Workflow complete!", {
    finalPath,
    captioned: opts.withCaptions,
    music: opts.withMusic,
    scenesGenerated: scenes.length,
  });

  return {
    idea: idea.title,
    prompt,
    videoUrl,
    finalPath,
    mergedPath,
    captionedPath,
    musicPath,
  };
}
