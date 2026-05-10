/**
 * generateVideoOpenRouter.ts
 *
 * Generates AI videos using OpenRouter's video API (asynchronous).
 *
 * Supported models include Kling v3 Pro, Veo 3.1, Wan 2.7, and more.
 * Uses the same OPENROUTER_API_KEY for both text generation and video.
 *
 * Flow: POST /api/v1/videos → poll GET /api/v1/videos/{id} → download content
 */

import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { logger } from "../utils/logger.js";

// ─── Types ───

export interface OpenRouterVideoOptions {
	/** Model slug (default: "kuaishou/kling-v3-pro") */
	model?: string;
	/** Text prompt describing the video */
	prompt: string;
	/** Duration in seconds (model-dependent, default: 10) */
	duration?: number;
	/** Resolution (e.g., "720p", "1080p") */
	resolution?: string;
	/** Aspect ratio (default: "9:16" for shorts) */
	aspectRatio?: string;
	/** Whether to generate audio (default: true) */
	generateAudio?: boolean;
	/** Seed for deterministic generation */
	seed?: number;
	/** Max wait time in seconds (default: 600) */
	timeout?: number;
	/** Polling interval in seconds (default: 15) */
	pollInterval?: number;
	/** Output directory (default: ./output) */
	outputDir?: string;
}

export interface OpenRouterVideoResult {
	/** Local path to the downloaded video */
	videoPath: string;
	/** Direct video URL from OpenRouter */
	videoUrl: string;
	/** Model used */
	model: string;
	/** Job ID */
	jobId: string;
	/** Generation cost in USD */
	cost?: number;
	/** Generation time in seconds */
	generationTime: number;
}

// ─── API client ───

interface VideoJobSubmit {
	id: string;
	polling_url: string;
	status: string;
}

interface VideoJobStatus {
	id: string;
	status:
		| "pending"
		| "in_progress"
		| "completed"
		| "failed"
		| "cancelled"
		| "expired";
	unsigned_urls?: string[];
	usage?: { cost: number; is_byok: boolean };
	error?: string;
}

class OpenRouterVideoClient {
	private apiKey: string;
	private baseUrl = "https://openrouter.ai/api/v1";

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async request<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${path}`;
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
				`OpenRouter video API error (${response.status}): ${body.slice(0, 500)}`,
			);
		}

		return response.json() as Promise<T>;
	}

	/** Submit a video generation job. Returns job ID. */
	async submit(params: {
		model: string;
		prompt: string;
		duration?: number;
		resolution?: string;
		aspectRatio?: string;
		generateAudio?: boolean;
		seed?: number;
	}): Promise<VideoJobSubmit> {
		const body: Record<string, unknown> = {
			model: params.model,
			prompt: params.prompt,
		};

		if (params.duration) body.duration = params.duration;
		if (params.resolution) body.resolution = params.resolution;
		if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
		if (params.generateAudio !== undefined)
			body.generate_audio = params.generateAudio;
		if (params.seed !== undefined) body.seed = params.seed;

		return this.request<VideoJobSubmit>("/videos", {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	/** Poll job status until terminal state. */
	async poll(jobId: string): Promise<VideoJobStatus> {
		return this.request<VideoJobStatus>(`/videos/${jobId}`);
	}

	/** Download generated video content. */
	async download(jobId: string, index = 0): Promise<ArrayBuffer> {
		const url = `${this.baseUrl}/videos/${jobId}/content?index=${index}`;
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${this.apiKey}` },
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(
				`Video download failed (${response.status}): ${body.slice(0, 300)}`,
			);
		}

		return response.arrayBuffer();
	}
}

// ─── Default models ───

/** Model presets optimized for short-form vertical video */
export const OPENROUTER_VIDEO_MODELS = {
	/** Kling v3 Pro — best balanced quality/cost for shorts */
	klingPro: "kuaishou/kling-v3-pro",
	/** Kling v3 Standard — cheaper, good for iteration */
	klingStandard: "kuaishou/kling-v3-std",
	/** Veo 3.1 — highest quality, more expensive */
	veoFast: "google/veo-3.1-fast",
	/** Wan 2.7 — open-source, good quality */
	wan: "alibaba/wan-2.7",
} as const;

// ─── Main function ───

/**
 * Generate a video using OpenRouter's video API.
 *
 * @param options - Video generation options
 * @returns OpenRouterVideoResult with local path and metadata
 */
export async function generateVideoOpenRouter(
	options: OpenRouterVideoOptions,
): Promise<OpenRouterVideoResult> {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error(
			"OPENROUTER_API_KEY environment variable is required.\n" +
				"Get one at: https://openrouter.ai/keys",
		);
	}

	const opts = {
		model: "kuaishou/kling-v3-pro",
		duration: 10,
		aspectRatio: "9:16",
		generateAudio: true,
		timeout: 600,
		pollInterval: 15,
		outputDir: join(process.cwd(), "output"),
		...options,
	};

	logger.info("Generating video with OpenRouter...", {
		model: opts.model,
		duration: opts.duration,
		aspect: opts.aspectRatio,
		prompt: opts.prompt.slice(0, 100),
	});

	const client = new OpenRouterVideoClient(apiKey);
	const startTime = Date.now();

	// Step 1: Submit
	const job = await client.submit({
		model: opts.model,
		prompt: opts.prompt,
		duration: opts.duration,
		aspectRatio: opts.aspectRatio,
		generateAudio: opts.generateAudio,
		seed: opts.seed,
	});

	logger.info("Video job submitted", {
		jobId: job.id,
		initialStatus: job.status,
	});

	// Step 2: Poll until complete
	const deadline = Date.now() + opts.timeout * 1000;

	while (Date.now() < deadline) {
		await new Promise((resolve) =>
			setTimeout(resolve, opts.pollInterval * 1000),
		);

		const status = await client.poll(job.id);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

		logger.debug(`Video job status: ${status.status} (${elapsed}s)`);

		if (status.status === "completed") {
			if (!status.unsigned_urls?.length) {
				throw new Error("Video job completed but no URLs returned");
			}

			// Step 3: Download
			logger.info("Video generation complete, downloading...");
			const videoBuffer = await client.download(job.id, 0);

			await mkdir(opts.outputDir, { recursive: true });
			const videoPath = join(opts.outputDir, `video-or-${Date.now()}.mp4`);
			await writeFile(videoPath, Buffer.from(videoBuffer));

			const genTime = (Date.now() - startTime) / 1000;
			logger.info("Video saved", {
				path: videoPath,
				sizeKB: (videoBuffer.byteLength / 1024).toFixed(1),
				cost: status.usage?.cost,
				time: `${genTime.toFixed(0)}s`,
			});

			return {
				videoPath,
				videoUrl: status.unsigned_urls[0]!,
				model: opts.model,
				jobId: job.id,
				cost: status.usage?.cost,
				generationTime: genTime,
			};
		}

		if (
			status.status === "failed" ||
			status.status === "cancelled" ||
			status.status === "expired"
		) {
			throw new Error(
				`Video generation ${status.status}: ${status.error ?? "Unknown error"}`,
			);
		}

		// pending or in_progress — keep polling
	}

	throw new Error(
		`Video generation timed out after ${opts.timeout}s for job ${job.id}`,
	);
}
