/**
 * generateMusicAceStep.ts
 *
 * Generates AI background music using ACE-Step 1.5 (local, open-source).
 *
 * ACE-Step runs as a persistent API server on localhost:8001.
 * This module submits generation tasks, polls for completion,
 * downloads the resulting audio, and overlays it onto videos with FFmpeg.
 *
 * Quality: between Suno v4.5 and v5 — commercial-grade, open-source, local.
 *
 * Start the server (keep running in a terminal):
 *   cd /Users/saurabh/dev/projects/ACE-Step-1.5 && uv run acestep-api
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { logger } from "../utils/logger.js";

// ─── Types ───

export interface AceStepMusicOptions {
	/** Text description of the desired music (e.g., "cinematic orchestral") */
	prompt?: string;
	/** Genre tag (maps to a curated prompt) */
	genre?: string;
	/** Duration in seconds (default: 30) */
	duration?: number;
	/** API server URL (default: http://localhost:8001) */
	apiUrl?: string;
	/** Whether to generate instrumental only */
	instrumental?: boolean;
	/** Max wait time in seconds (default: 300) */
	timeout?: number;
	/** Polling interval in seconds (default: 5) */
	pollInterval?: number;
}

export interface AceStepMusicResult {
	/** Path to the downloaded music file */
	musicPath: string;
	/** The prompt used for generation */
	prompt: string;
	/** Genre or style */
	genre: string;
	/** Duration in seconds */
	duration: number;
	/** Generation time in seconds */
	generationTime: number;
}

export interface MusicOverlayInput {
	/** Path to the video file */
	videoPath: string;
	/** Path to the music audio file */
	musicPath: string;
	/** Output path for the combined video */
	outputPath: string;
	/** Music volume relative to video audio (0.0 = silent, 1.0 = full) */
	musicVolume?: number;
	/** Whether to mix with existing video audio or replace entirely */
	mixWithOriginal?: boolean;
}

// ─── Genre prompts ───

const GENRE_PROMPTS: Record<string, string> = {
	cinematic:
		"epic cinematic orchestral music, sweeping strings, powerful brass, dramatic builds, Hans Zimmer style, instrumental",
	lofi: "chill lofi hip hop beats, relaxed study music, warm vinyl crackle, smooth jazz chords, instrumental",
	orchestra:
		"grand orchestral music, emotional strings, dramatic brass section, John Williams style, instrumental",
	ambient:
		"atmospheric ambient music, ethereal pads, slow evolving textures, peaceful and meditative, Brian Eno style, instrumental",
	cyberpunk:
		"dark cyberpunk synthwave, driving bass, neon-drenched pads, futuristic arpeggios, Blade Runner 2049 style, instrumental",
	motivational:
		"uplifting motivational music, inspiring piano and strings, building energy, triumphant finale, instrumental",
	horror:
		"tense horror soundtrack, creepy strings, dark drones, sudden string stabs, thriller, instrumental",
	action:
		"high-energy action music, fast percussion, aggressive synths, driving rhythm, intense, instrumental",
	spiritual:
		"meditative spiritual music, Indian classical influences, sitar, tabla, ambient drones, peaceful, instrumental",
	retro:
		"80s retro synthwave, nostalgic analog synths, driving drum machine, neon vibes, vaporwave, instrumental",
	upbeat:
		"upbeat electronic pop instrumental, energetic beats, catchy synth melodies, positive vibes",
	piano:
		"beautiful solo piano, emotional and melancholic, soft dynamics, contemporary classical, instrumental",
	// ─── India-specific genres ───
	bollywood:
		"vibrant Bollywood film music, dholak rhythms, shehnai melodies, energetic orchestral arrangements, Indian percussion, instrumental",
	carnatic:
		"South Indian Carnatic classical music, veena, mridangam, devotional raga, complex talas, meditative, instrumental",
	hindustani:
		"North Indian Hindustani classical music, sarod, tabla, alap jor jhala, raga exploration, contemplative, instrumental",
	bhajan:
		"devotional bhajan music, harmonium, manjira cymbals, call-and-response melody, spiritual atmosphere, instrumental",
	folk_punjabi:
		"Punjabi folk music, tumbi, dhol beats, high-energy bhangra rhythms, celebratory, instrumental",
	folk_rajasthani:
		"Rajasthani folk music, kamaicha strings, khartal percussion, desert melodies, Manganiyar style, instrumental",
	indie_indian:
		"Indian indie fusion, contemporary production with traditional elements, sitar or tabla accents, modern beats, instrumental",
	sufi: "Sufi qawwali style, harmonium drones, rhythmic hand claps, spiritual ecstasy, building intensity, instrumental",
	indian_classical_fusion:
		"Indian classical fusion, tanpura drones, electronic synths, tabla over modern beats, ambient textures, instrumental",
};

// ─── ACE-Step API client ───

interface AceStepTaskResponse {
	data: {
		task_id: string;
		status: string;
		queue_position?: number;
	};
	code: number;
	error: string | null;
}

interface AceStepTaskResult {
	data: {
		results: Record<
			string,
			{
				status: number; // 0=queued, 1=done, 2=failed
				audio_url?: string;
				duration?: number;
				error?: string;
			}
		>;
	};
}

class AceStepClient {
	private apiUrl: string;

	constructor(apiUrl: string) {
		this.apiUrl = apiUrl.replace(/\/$/, "");
	}

	private async request<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.apiUrl}${path}`;
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(
				`ACE-Step API error (${response.status}): ${body.slice(0, 300)}`,
			);
		}

		return response.json() as Promise<T>;
	}

	/** Submit a music generation task. Uses sample_mode for natural language descriptions. */
	async submitTask(params: {
		prompt: string;
		duration: number;
		thinking?: boolean;
	}): Promise<string> {
		const response = await this.request<AceStepTaskResponse>("/release_task", {
			method: "POST",
			body: JSON.stringify({
				sample_mode: true,
				sample_query: params.prompt,
				audio_duration: params.duration,
				batch_size: 1,
				thinking: params.thinking ?? false,
				audio_format: "mp3",
			}),
		});

		if (response.error) {
			throw new Error(`ACE-Step task submission failed: ${response.error}`);
		}

		return response.data.task_id;
	}

	/** Query task status. Returns null if task not found (expired). */
	async queryTask(
		taskId: string,
	): Promise<{ status: number; audioUrl?: string } | null> {
		const response = await this.request<AceStepTaskResult>("/query_result", {
			method: "POST",
			body: JSON.stringify({ task_ids: [taskId] }),
		});

		const result = response.data.results[taskId];
		if (!result) return null;

		return { status: result.status, audioUrl: result.audio_url };
	}

	/** Download audio from the server's audio endpoint. */
	async downloadAudio(audioPath: string, outputPath: string): Promise<void> {
		const url = `${this.apiUrl}${audioPath}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(
				`Failed to download audio: ${response.status} ${response.statusText}`,
			);
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		await writeFile(outputPath, buffer);
		logger.info("Music downloaded", {
			path: outputPath,
			sizeKB: (buffer.length / 1024).toFixed(1),
		});
	}

	/** Health check — verify server is running and models are loaded. */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.request<{
				data: { status: string; models_initialized: boolean };
			}>("/health");
			return response.data.models_initialized === true;
		} catch {
			return false;
		}
	}
}

// ─── Music generation ───

/**
 * Generate background music via ACE-Step API server.
 *
 * The server must be running in a terminal:
 *   cd /Users/saurabh/dev/projects/ACE-Step-1.5 && uv run acestep-api
 *
 * @param options - Music generation options
 * @returns AceStepMusicResult with local path to the music file
 */
export async function generateMusicAceStep(
	options: AceStepMusicOptions = {},
): Promise<AceStepMusicResult> {
	const opts = {
		genre: "cinematic",
		duration: 30,
		apiUrl: "http://localhost:8001",
		instrumental: true,
		timeout: 300,
		pollInterval: 5,
		...options,
	};

	const genre = opts.genre;
	const prompt =
		opts.prompt ?? GENRE_PROMPTS[genre] ?? GENRE_PROMPTS["cinematic"]!;

	const finalPrompt =
		opts.instrumental && !prompt.toLowerCase().includes("instrumental")
			? `${prompt}, instrumental`
			: prompt;

	logger.info("Generating music with ACE-Step...", {
		genre,
		duration: opts.duration,
		prompt: finalPrompt.slice(0, 80),
	});

	const client = new AceStepClient(opts.apiUrl);

	// Verify server is up
	const healthy = await client.healthCheck();
	if (!healthy) {
		throw new Error(
			"ACE-Step API server is not running or models not initialized.\n" +
				"Start it: cd /Users/saurabh/dev/projects/ACE-Step-1.5 && uv run acestep-api",
		);
	}

	const startTime = Date.now();

	// Submit generation task
	const taskId = await client.submitTask({
		prompt: finalPrompt,
		duration: opts.duration,
		thinking: false, // DiT-only for instrumentals — faster, still high quality
	});

	logger.info("Music task submitted", { taskId });

	// Poll until complete
	const deadline = Date.now() + opts.timeout * 1000;

	while (Date.now() < deadline) {
		await new Promise((resolve) =>
			setTimeout(resolve, opts.pollInterval * 1000),
		);

		const result = await client.queryTask(taskId);

		if (!result) {
			throw new Error(`Task ${taskId} not found — may have expired from queue`);
		}

		if (result.status === 1) {
			const elapsed = (Date.now() - startTime) / 1000;
			logger.info("Music generation complete", {
				taskId,
				elapsed: `${elapsed.toFixed(0)}s`,
			});

			if (!result.audioUrl) {
				throw new Error("Task completed but no audio URL returned");
			}

			const outputDir = join(process.cwd(), "output");
			await mkdir(outputDir, { recursive: true });

			const musicPath = join(outputDir, `music-${genre}-${Date.now()}.mp3`);
			await client.downloadAudio(result.audioUrl, musicPath);

			return {
				musicPath,
				prompt: finalPrompt,
				genre,
				duration: opts.duration,
				generationTime: elapsed,
			};
		}

		if (result.status === 2) {
			throw new Error(`Music generation failed for task ${taskId}`);
		}

		// status === 0: still running
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
		logger.debug(`Waiting for music... (${elapsed}s)`);
	}

	throw new Error(
		`Music generation timed out after ${opts.timeout}s for task ${taskId}`,
	);
}

// ─── Music overlay ───

/**
 * Overlay background music onto a video using FFmpeg.
 */
export async function overlayMusic(input: MusicOverlayInput): Promise<string> {
	const { spawn } = await import("child_process");
	const musicVol = input.musicVolume ?? 0.12;
	const ffmpegBin = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";

	logger.info("Overlaying background music onto video...", {
		musicVolume: musicVol,
	});

	const args = ["-i", input.videoPath, "-i", input.musicPath];

	if (input.mixWithOriginal ?? true) {
		args.push(
			"-filter_complex",
			`[1:a]volume=${musicVol}[music];[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
		);
	} else {
		args.push(
			"-filter_complex",
			`[1:a]volume=${musicVol},atrim=duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${input.videoPath})[aout]`,
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
		const proc = spawn(ffmpegBin, args, {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stderr = "";
		proc.stderr.on("data", (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on("close", (code: number) => {
			if (code === 0) {
				logger.info("Music overlay complete", { output: input.outputPath });
				resolve(input.outputPath);
			} else {
				reject(
					new Error(
						`FFmpeg overlay failed with code ${code}: ${stderr.slice(-300)}`,
					),
				);
			}
		});

		proc.on("error", reject);
	});
}

/**
 * Generate and overlay music on a video in a single step.
 */
export async function generateAndOverlayMusicAceStep(
	videoPath: string,
	outputPath: string,
	options: AceStepMusicOptions = {},
	musicVolume = 0.12,
): Promise<string> {
	const music = await generateMusicAceStep(options);

	try {
		return await overlayMusic({
			videoPath,
			musicPath: music.musicPath,
			outputPath,
			musicVolume,
		});
	} catch (err) {
		// Overlay failed but music file may be useful — keep it
		throw err;
	}
}
