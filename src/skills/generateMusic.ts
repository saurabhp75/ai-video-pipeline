/**
 * generateMusic.ts
 *
 * Generates AI background music using the Suno API and overlays it onto videos.
 *
 * Two modes:
 * 1. GENERATE: Creates original music via Suno API based on a text prompt
 * 2. OVERLAY: Mixes existing music/audio with a video using FFmpeg
 *
 * Suno API ref: https://suno.com (REST API via API key)
 */

import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { logger } from "../utils/logger.js";

// ─── Types ───

export interface MusicOptions {
	/** Text prompt describing the desired music style/mood */
	prompt?: string;
	/** Whether to generate instrumental only (default: true for background music) */
	instrumental?: boolean;
	/** Genre tag (e.g., "cinematic", "lofi", "orchestral") */
	genre?: string;
	/** Duration hint in seconds */
	duration?: number;
	/** Suno model version */
	model?: string;
}

export interface MusicResult {
	/** URL to the generated music audio */
	musicUrl: string;
	/** Local path to the downloaded music file */
	musicPath: string;
	/** The prompt used for generation */
	prompt: string;
	/** Genre */
	genre: string;
}

export interface MusicOverlayInput {
	/** Path or URL of the video */
	videoPath: string;
	/** Path or URL of the music audio */
	musicPath: string;
	/** Output path for the combined video */
	outputPath: string;
	/** Music volume relative to video audio (0.0 = silent, 1.0 = full) */
	musicVolume?: number;
	/** Whether to mix with existing video audio or replace it entirely */
	mixWithOriginal?: boolean;
}

// ─── Default prompts by genre ───

const GENRE_PROMPTS: Record<string, string> = {
	cinematic:
		"Epic cinematic orchestral music with dramatic builds, sweeping strings, and powerful percussion. Hans Zimmer style. Instrumental.",
	lofi: "Chill lofi hip hop beats, relaxed, study vibes, warm vinyl crackle, smooth jazz chords. Instrumental.",
	orchestra:
		"Grand orchestral music, emotional strings and brass, cinematic crescendos. John Williams style. Instrumental.",
	ambient:
		"Atmospheric ambient music, ethereal pads, slow evolving textures, peaceful and meditative. Brian Eno style. Instrumental.",
	cyberpunk:
		"Dark cyberpunk synthwave, driving bass, neon-drenched pads, futuristic arpeggios. Blade Runner 2049 style. Instrumental.",
	motivational:
		"Uplifting motivational music, inspiring piano and strings, building energy, triumphant finale. Instrumental.",
	horror:
		"Tense horror soundtrack, creepy strings, dark drones, sudden string stabs. Instrumental.",
	action:
		"High-energy action music, fast percussion, aggressive synths, driving rhythm. Instrumental.",
	spiritual:
		"Meditative spiritual music, Indian classical influences, sitar, tabla, ambient drones, peaceful. Instrumental.",
	retro:
		"80s retro synthwave, nostalgic analog synths, driving drum machine, neon vibes. Instrumental.",
};

// ─── Suno API client ───

interface SunoGenerateResponse {
	id: string;
	clips: Array<{
		id: string;
		audio_url: string;
		status: "submitted" | "streaming" | "complete" | "error";
		title: string;
	}>;
}

interface SunoClipStatusResponse {
	id: string;
	audio_url: string;
	status: "submitted" | "streaming" | "complete" | "error";
	title: string;
}

class SunoClient {
	private apiKey: string;
	private baseUrl = "https://api.suno.ai/v1";

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(
				`Suno API error (${response.status}): ${body.slice(0, 500)}`,
			);
		}

		return response.json() as Promise<T>;
	}

	async generate(params: {
		prompt: string;
		instrumental?: boolean;
		model?: string;
	}): Promise<SunoGenerateResponse> {
		return this.request<SunoGenerateResponse>("/generate", {
			method: "POST",
			body: JSON.stringify({
				prompt: params.prompt,
				make_instrumental: params.instrumental ?? true,
				model: params.model ?? "chirp-v3.5",
			}),
		});
	}

	async getClipStatus(clipId: string): Promise<SunoClipStatusResponse> {
		return this.request<SunoClipStatusResponse>(`/clips/${clipId}`);
	}

	async waitForClip(
		clipId: string,
		maxRetries = 60,
		delayMs = 5000,
	): Promise<string> {
		for (let i = 0; i < maxRetries; i++) {
			const clip = await this.getClipStatus(clipId);

			if (clip.status === "complete") {
				logger.info("Music generation complete", { clipId, title: clip.title });
				return clip.audio_url;
			}

			if (clip.status === "error") {
				throw new Error(`Music generation failed for clip ${clipId}`);
			}

			logger.debug(`Waiting for music generation... (${i + 1}/${maxRetries})`);

			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}

		throw new Error(`Timed out waiting for music generation (clip: ${clipId})`);
	}
}
// ─── Music generation ───

/**
 * Generate background music via Suno API.
 *
 * @param options - Music generation options
 * @returns MusicResult with URL and local path to the music file
 */
export async function generateMusic(
	options: MusicOptions = {},
): Promise<MusicResult> {
	const apiKey = process.env.SUNO_API_KEY;
	if (!apiKey) {
		throw new Error(
			"SUNO_API_KEY environment variable is required. Get one at https://suno.com",
		);
	}

	const genre = options.genre ?? "cinematic";
	const prompt =
		options.prompt ?? GENRE_PROMPTS[genre] ?? GENRE_PROMPTS["cinematic"]!;

	logger.info("Generating music with Suno API...", { genre, prompt });

	const client = new SunoClient(apiKey);

	// Step 1: Submit generation request
	const generateResult = await client.generate({
		prompt,
		instrumental: options.instrumental ?? true,
		model: options.model ?? "chirp-v3.5",
	});

	if (!generateResult.clips?.[0]) {
		throw new Error("No clips returned from Suno generation");
	}

	const clipId = generateResult.clips[0].id;

	// Step 2: Poll until complete
	const musicUrl = await client.waitForClip(clipId);

	// Step 3: Download to local temp file (and cache for reuse)
	const tmpDir = await mkdtemp(join(tmpdir(), "ai-video-music-"));
	const musicPath = join(tmpDir, `${genre}-${Date.now()}.mp3`);

	logger.info("Downloading generated music...");
	const response = await fetch(musicUrl);
	const buffer = Buffer.from(await response.arrayBuffer());
	await writeFile(musicPath, buffer);

	logger.info("Music saved", { musicPath, sizeBytes: buffer.length });

	return {
		musicUrl,
		musicPath,
		prompt,
		genre,
	};
}

/**
 * Generate music with a custom prompt (bypasses genre defaults).
 */
export async function generateMusicFromPrompt(
	prompt: string,
	instrumental = true,
): Promise<MusicResult> {
	return generateMusic({ prompt, instrumental });
}

// ─── Music overlay ───

/**
 * Overlay background music onto a video using FFmpeg.
 *
 * This mixes the music with the existing video audio (ducking the music
 * so it sits in the background).
 *
 * @param input - Video path, music path, output path, and mixing options
 * @returns Path to the output video with music overlay
 */
export async function overlayMusic(input: MusicOverlayInput): Promise<string> {
	const { spawn } = await import("child_process");
	const musicVol = input.musicVolume ?? 0.15; // Default: quiet background music

	logger.info("Overlaying background music onto video...", {
		videoPath: input.videoPath,
		musicPath: input.musicPath,
		musicVolume: musicVol,
	});

	// Build FFmpeg arguments for mixing music with video audio
	const args = ["-i", input.videoPath, "-i", input.musicPath];

	// Audio filter: mix original audio with ducked music, match video duration
	if (input.mixWithOriginal ?? true) {
		args.push(
			"-filter_complex",
			`[1:a]volume=${musicVol}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
		);
	} else {
		args.push(
			"-filter_complex",
			`[1:a]volume=${musicVol}[music];[music]atrim=duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${input.videoPath})[aout]`,
		);
	}

	args.push(
		"-map",
		"0:v",
		"-map",
		"[aout]",
		"-c:v",
		"copy",
		"-c:a",
		"aac",
		"-b:a",
		"192k",
		"-shortest",
		"-y",
		input.outputPath,
	);

	return new Promise((resolve, reject) => {
		const ffmpegProc = spawn("ffmpeg", args, {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stderr = "";

		ffmpegProc.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		ffmpegProc.on("close", (code: number) => {
			if (code === 0) {
				logger.info("Music overlay complete", { output: input.outputPath });
				resolve(input.outputPath);
			} else {
				reject(
					new Error(
						`FFmpeg music overlay failed with code ${code}: ${stderr.slice(-500)}`,
					),
				);
			}
		});

		ffmpegProc.on("error", reject);
	});
}

/**
 * Generate and overlay music on a video in a single step.
 *
 * This is the most convenient way to add music — it handles generation,
 * downloading, and overlay in one call.
 *
 * @param videoPath - Path to the video file
 * @param outputPath - Path for the output video with music
 * @param options - Music generation options (genre, prompt, etc.)
 * @param musicVolume - Volume of background music (0.0-1.0, default: 0.15)
 * @returns Path to the output video with music overlay
 */
export async function generateAndOverlayMusic(
	videoPath: string,
	outputPath: string,
	options: MusicOptions = {},
	musicVolume = 0.15,
): Promise<string> {
	const music = await generateMusic(options);

	try {
		const result = await overlayMusic({
			videoPath,
			musicPath: music.musicPath,
			outputPath,
			musicVolume,
		});

		return result;
	} finally {
		// Cleanup temp music file
		try {
			const dir = music.musicPath.split("/").slice(0, -1).join("/");
			await rm(dir, { recursive: true, force: true });
		} catch {
			// Best effort
		}
	}
}

// ─── Music catalog (for rapid reuse without regeneration) ───

/**
 * Pre-generated genre music catalog.
 *
 * Once you've generated music for common genres, store the URLs here
 * to avoid regenerating every time. The pipeline checks this first.
 */
export const MUSIC_CATALOG: Record<string, string> = {
	// Populate with generated music URLs after first runs
	// "cinematic": "https://cdn.suno.ai/...",
	// "lofi": "https://cdn.suno.ai/...",
};
