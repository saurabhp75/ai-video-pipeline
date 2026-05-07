import { mergeVideoAndAudio } from "../utils/ffmpeg.js";

export interface MergeInput {
  videoUrl: string;
  audioUrl: string;
  outputPath: string;
}

export async function downloadAndMerge(input: MergeInput): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");

  // Create temp directory for downloads
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-video-"));
  const videoPath = path.join(tmpDir, "video.mp4");
  const audioPath = path.join(tmpDir, "audio.mp3");

  try {
    // Download video
    console.log(`Downloading video from: ${input.videoUrl}`);
    const videoResponse = await fetch(input.videoUrl);
    await fs.writeFile(videoPath, Buffer.from(await videoResponse.arrayBuffer()));

    // Download audio
    console.log(`Downloading audio from: ${input.audioUrl}`);
    const audioResponse = await fetch(input.audioUrl);
    await fs.writeFile(audioPath, Buffer.from(await audioResponse.arrayBuffer()));

    // Merge
    console.log(`Merging video + audio to: ${input.outputPath}`);
    await mergeVideoAndAudio(videoPath, audioPath, input.outputPath);

    console.log(`Merge complete: ${input.outputPath}`);
    return input.outputPath;
  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  }
}
