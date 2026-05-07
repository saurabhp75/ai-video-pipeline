import { generateIdea } from "../skills/generateIdea.js";
import { generateScenes } from "../skills/generateScenes.js";
import { generateVideo } from "../skills/generateVideo.js";
import { generateVoice } from "../skills/generateVoice.js";
import { downloadAndMerge } from "../skills/mergeAssets.js";
import { saveVideo } from "../skills/upload.js";
import { logger } from "../utils/logger.js";

export interface ViralShortResult {
  idea: string;
  prompt: string;
  videoUrl: string;
  finalPath?: string;
  mergedPath?: string;
}

/**
 * Full viral short pipeline:
 * 1. Generate a trending video idea (LLM)
 * 2. Generate storyboard + enhanced scene prompts (LLM)
 * 3. Generate video for each scene (fal.ai Kling)
 * 4. Generate voiceover (fal.ai Kling TTS)
 * 5. Merge video + audio (ffmpeg)
 * 6. Save to local disk
 */
export async function viralShortWorkflow(
  topic: string,
  options?: {
    numScenes?: number;
    withVoice?: boolean;
    niche?: string;
  },
): Promise<ViralShortResult> {
  const numScenes = options?.numScenes ?? 1;
  const withVoice = options?.withVoice ?? false;

  logger.info("🚀 Starting viral short workflow");
  logger.info(`Topic: "${topic}" | Scenes: ${numScenes} | Voice: ${withVoice}`);

  // Step 1: Generate idea (optional — if topic is already an idea, this validates it)
  logger.step(1, 6, "Generating content idea...");
  const idea = await generateIdea(options?.niche ?? "Cyberpunk India");

  logger.info("Idea generated", {
    title: idea.title,
    niche: idea.niche,
    hook: idea.hook,
  });

  // Step 2: Generate cinematic prompt via storyboard + scenes
  logger.step(2, 6, "Generating scenes and cinematic prompts...");
  const scenes = await generateScenes(topic, numScenes);

  // Step 3: Generate video for first scene (can loop for multi-scene)
  logger.step(3, 6, "Generating video...");
  const firstScene = scenes[0];
  if (!firstScene) {
    throw new Error("No scenes generated");
  }
  const prompt = firstScene.prompt;
  const videoUrl = await generateVideo(prompt);

  logger.info("Video generated", { videoUrl });

  // Step 4: Generate voiceover (optional)
  let mergedPath: string | undefined;
  if (withVoice) {
    logger.step(4, 6, "Generating voiceover...");
    const voiceoverScript = `Hook: ${idea.hook}. ${idea.description}`;
    const audioUrl = await generateVoice(voiceoverScript);

    // Step 5: Merge video + audio
    logger.step(5, 6, "Merging video and audio...");
    const outputPath = `${process.cwd()}/output/viral-${Date.now()}.mp4`;

    mergedPath = await downloadAndMerge({
      videoUrl,
      audioUrl,
      outputPath,
    });

    logger.info("Video + audio merged", { mergedPath });
  }

  // Step 6: Save final video
  logger.step(6, 6, "Saving final video...");
  const finalPath = await saveVideo(
    videoUrl,
    `viral-${Date.now()}.mp4`,
  );

  logger.info("✅ Workflow complete!", {
    finalPath,
    mergedPath,
    scenesGenerated: scenes.length,
  });

  return {
    idea: idea.title,
    prompt,
    videoUrl,
    finalPath,
    mergedPath,
  };
}
