import { mergeVideoAndAudio } from "../utils/ffmpeg.js";
import { copyFile } from "fs/promises";

export interface MergeInput {
	/** URL or local path to the video file */
	videoUrl: string;
	/** URL or local path to the audio file */
	audioUrl: string;
	/** Output path for the merged video */
	outputPath: string;
}

function isURL(str: string): boolean {
	return str.startsWith("http://") || str.startsWith("https://");
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
		// Get video (download from URL or copy local file)
		if (isURL(input.videoUrl)) {
			console.log(`Downloading video from: ${input.videoUrl}`);
			const videoResponse = await fetch(input.videoUrl);
			await fs.writeFile(
				videoPath,
				Buffer.from(await videoResponse.arrayBuffer()),
			);
		} else {
			console.log(`Copying local video: ${input.videoUrl}`);
			await copyFile(input.videoUrl, videoPath);
		}

		// Get audio (download from URL or copy local file)
		if (isURL(input.audioUrl)) {
			console.log(`Downloading audio from: ${input.audioUrl}`);
			const audioResponse = await fetch(input.audioUrl);
			await fs.writeFile(
				audioPath,
				Buffer.from(await audioResponse.arrayBuffer()),
			);
		} else {
			console.log(`Copying local audio: ${input.audioUrl}`);
			await copyFile(input.audioUrl, audioPath);
		}

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
