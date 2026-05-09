import { generateIdea } from "../skills/generateIdea.js";
import { generateScenes } from "../skills/generateScenes.js";
import { generateVideo } from "../skills/generateVideo.js";
import { generateVoiceLocal } from "../skills/generateVoiceLocal.js";
import { generateCaptions } from "../skills/generateCaptions.js";
import { generateAndOverlayMusicAceStep } from "../skills/generateMusicAceStep.js";
import { downloadAndMerge } from "../skills/mergeAssets.js";
import { saveVideo } from "../skills/upload.js";
import { publishToYouTube } from "../skills/publishToYouTube.js";
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
  youtubeUrl?: string;
}

export interface ViralShortOptions {
  /** Number of scenes in the storyboard (default: 1) */
  numScenes?: number;
  /** Enable TTS voiceover + merge */
  withVoice?: boolean;
  /** Enable auto-captions (Whisper + FFmpeg burn-in) */
  withCaptions?: boolean;
  /** Enable background music (Suno generation + overlay) */
  withMusic?: boolean;
  /** Music genre (default: "cinematic") */
  musicGenre?: string;
  /** Music volume relative to video audio (0-1, default: 0.15) */
  musicVolume?: number;
  /** Publish to YouTube after generation */
  publishToYoutube?: boolean;
  /** YouTube video title */
  youtubeTitle?: string;
  /** YouTube privacy status */
  youtubePrivacy?: "private" | "unlisted" | "public";
  /** Content niche for idea generation */
  niche?: string;
}

/**
 * Full viral short pipeline:
 * 1. Generate trending video idea (LLM)
 * 2. Generate storyboard + scene prompts (LLM)
 * 3. Generate video (fal.ai Kling)
 * 4. Generate voiceover (fal.ai Kling TTS)
 * 5. Merge video + audio (ffmpeg)
 * 6. Generate burnt-in captions (Whisper + ffmpeg)
 * 7. Generate + overlay background music (Suno + ffmpeg)
 * 8. Publish to YouTube
 * 9. Save final video to disk
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
    publishToYoutube: false,
    youtubePrivacy: "private" as const,
    ...options,
  };

  logger.info("🚀 Starting viral short workflow", {
    topic,
    scenes: opts.numScenes,
    voice: opts.withVoice,
    captions: opts.withCaptions,
    music: opts.withMusic,
    publish: opts.publishToYoutube,
  });

  // Step 1: Generate idea
  logger.step(1, 9, "Generating content idea...");
  const idea = await generateIdea(opts.niche ?? "Cyberpunk India");

  logger.info("Idea generated", {
    title: idea.title,
    niche: idea.niche,
    hook: idea.hook,
  });

  // Step 2: Generate cinematic prompt via storyboard + scenes
  logger.step(2, 9, "Generating scenes and cinematic prompts...");
  const scenes = await generateScenes(topic, opts.numScenes);

  // Step 3: Generate video(s)
  // For now, generate first scene. Multi-scene support can stitch scenes together.
  logger.step(3, 9, "Generating video...");
  const firstScene = scenes[0];
  if (!firstScene) {
    throw new Error("No scenes generated");
  }
  const prompt = firstScene.prompt;
  const videoUrl = await generateVideo(prompt);

  logger.info("Video generated", { videoUrl });

  // Step 4: Generate voiceover (optional)
  let mergedPath: string | undefined;
  if (opts.withVoice) {
    logger.step(4, 9, "Generating voiceover (local TTS)...");
    const voiceoverScript = `Hook: ${idea.hook}. ${idea.description}`;
    const voiceAudioPath = path.join(
      process.cwd(),
      "output",
      `voice-${Date.now()}.mp3`,
    );
    const voiceResult = await generateVoiceLocal(voiceoverScript, voiceAudioPath);
    logger.info("Voiceover generated", { engine: voiceResult.engine, voice: voiceResult.voice });

    // Step 5: Merge video + audio
    logger.step(5, 9, "Merging video and audio...");
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
    logger.step(6, 9, "Generating burnt-in captions...");
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
    logger.step(7, 9, "Generating music with ACE-Step and overlaying...");
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

  // Step 8: Publish to YouTube (optional)
  let youtubeUrl: string | undefined;
  if (opts.publishToYoutube) {
    logger.step(8, 9, "Publishing to YouTube...");

    const finalVideoPath = musicPath ?? captionedPath ?? workingVideoPath;

    try {
      const youtubeResult = await publishToYouTube(finalVideoPath, {
        title: opts.youtubeTitle ?? `${idea.title} #Shorts`,
        description: `${idea.hook}\n\n${idea.description}\n\n#AI #Viral #Shorts`,
        tags: [
          idea.niche,
          "Shorts",
          "Viral",
          "AI Generated",
          "AI Video",
        ].filter(Boolean),
        privacyStatus: opts.youtubePrivacy,
        isShort: true,
      });

      youtubeUrl = youtubeResult.url;
      logger.info("✅ Published to YouTube!", { youtubeUrl });
    } catch (err) {
      logger.warn("YouTube publishing failed (continuing)", {
        error: String(err),
      });
    }
  }

  // Step 9: Save final video
  logger.step(9, 9, "Saving final video...");

  const finalVideoPath = musicPath ?? captionedPath ?? workingVideoPath;
  const finalName = `viral-final-${Date.now()}.mp4`;

  // If we already have a local file, just note it
  let finalPath: string;

  if (musicPath || captionedPath) {
    // Already saved locally
    finalPath = finalVideoPath;
  } else {
    // Save the video URL to disk
    finalPath = await saveVideo(videoUrl, finalName);
  }

  logger.info("✅ Workflow complete!", {
    finalPath,
    youtubeUrl,
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
    youtubeUrl,
  };
}
