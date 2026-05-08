/**
 * generateVoiceLocal.ts
 *
 * Local text-to-speech voiceover generation using two engines:
 * 1. macOS `say` — built-in, zero setup, good quality, instant
 * 2. Piper TTS — neural TTS, excellent quality, fast CPU inference
 *
 * Falls back to Kling TTS API (fal.ai) if neither local engine is available
 * and FAL_KEY is set.
 *
 * No API keys required for local TTS.
 */

import { spawn } from "child_process";
import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { logger } from "../utils/logger.js";

// ─── Types ───

export type TTSEngine = "say" | "piper" | "auto";

export interface VoiceOptions {
  /** TTS engine to use (default: "auto" — tries Piper, then macOS say, then Kling API) */
  engine?: TTSEngine;
  /** Voice name for macOS `say` (default: "Samantha") */
  sayVoice?: string;
  /** Piper model path (default: auto-detected) */
  piperModel?: string;
  /** Piper model config path */
  piperConfig?: string;
  /** Speech rate for `say` (words per minute, default: 180) */
  sayRate?: number;
  /** Output format (default: "mp3") */
  format?: "wav" | "mp3";
}

export interface VoiceResult {
  /** Path to the generated audio file */
  audioPath: string;
  /** URL if using Kling API fallback */
  audioUrl?: string;
  /** Engine used for generation */
  engine: string;
  /** Voice name used */
  voice: string;
}

// ─── Recommended voices ───

/**
 * macOS `say` voices ranked by quality for short-form content.
 * Samantha and Karen are the best-sounding English voices.
 */
const MACOS_VOICES: Record<string, string> = {
  female: "Samantha", // Best overall female voice
  male: "Daniel",     // Best male voice (UK English)
  female_alt: "Karen",// Good alternative female
  male_alt: "Alex",   // Default male voice
} as const;

/**
 * Piper models — neural TTS voices.
 * en_US-lessac-medium: female voice, medium quality, ~50MB model
 */
const PIPER_VOICES = {
  female: {
    model: "/Users/saurabh/dev/projects/piper-voices/en_US-lessac-medium.onnx",
    config: "/Users/saurabh/dev/projects/piper-voices/en_US-lessac-medium.onnx.json",
    name: "Lessac (female, US English)",
  },
  // Add more models as you download them:
  // male: { model: "...", config: "...", name: "Ryan (male, US English)" },
};

// ─── Engine detection ───

let cachedAvailable: { say: boolean; piper: boolean } | null = null;

async function detectAvailableEngines(): Promise<{ say: boolean; piper: boolean }> {
  if (cachedAvailable) return cachedAvailable;

  const { existsSync } = await import("fs");

  cachedAvailable = {
    say: process.platform === "darwin", // macOS only
    piper: existsSync(
      process.env.PIPER_BINARY ?? "/opt/homebrew/bin/piper",
    ),
  };

  return cachedAvailable;
}

// ─── macOS `say` TTS ───

async function generateWithSay(
  text: string,
  outputPath: string,
  voice: string,
  rate: number,
  format: "wav" | "mp3",
): Promise<void> {
  logger.info("Generating voiceover with macOS say...", { voice, rate });

  // macOS say outputs AIFF, which we convert to mp3/wav with ffmpeg
  const aiffPath = outputPath.replace(/\.(mp3|wav)$/, ".aiff");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("say", [
      "-v", voice,
      "-r", String(rate),
      "-o", aiffPath.replace(/\.aiff$/, ""), // say appends .aiff automatically
      text,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`say failed with code ${code}: ${stderr}`));
    });

    proc.on("error", reject);
  });

  // Convert AIFF to desired format using ffmpeg
  if (format === "mp3") {
    await convertAudio(aiffPath, outputPath);
    await rm(aiffPath, { force: true });
  } else {
    // For WAV, just convert AIFF to WAV
    await convertAudio(aiffPath, outputPath);
    await rm(aiffPath, { force: true });
  }
}

// ─── Piper TTS ───

async function generateWithPiper(
  text: string,
  outputPath: string,
  modelPath: string,
  configPath: string | undefined,
  format: "wav" | "mp3",
): Promise<void> {
  const piperBin = process.env.PIPER_BINARY ?? "/opt/homebrew/bin/piper";

  logger.info("Generating voiceover with Piper TTS...", { model: modelPath });

  const args: string[] = [
    "-m", modelPath,
    "-f", outputPath.replace(/\.mp3$/, ".wav"), // Piper outputs WAV
  ];

  if (configPath) {
    args.push("-c", configPath);
  }

  // Write text to temp file and feed to piper
  const tmpDir = await mkdtemp(join(tmpdir(), "piper-tts-"));
  const textFile = join(tmpDir, "input.txt");

  try {
    await writeFile(textFile, text, "utf-8");
    args.push("-i", textFile);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(piperBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      proc.on("close", (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`Piper failed with code ${code}: ${stderr.slice(-300)}`));
      });

      proc.on("error", reject);
    });

    // Convert WAV to MP3 if needed
    const wavPath = outputPath.replace(/\.mp3$/, ".wav");
    if (format === "mp3") {
      await convertAudio(wavPath, outputPath);
      await rm(wavPath, { force: true });
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── Kling TTS API (fallback) ───

async function generateWithKlingAPI(
  text: string,
  outputPath: string,
): Promise<string> {
  logger.info("Generating voiceover with Kling API (fallback)...");

  try {
    const { generateVoice } = await import("./generateVoice.js");
    const url = await generateVoice(text);

    // Download the audio
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    logger.info("Kling voiceover downloaded", { size: buffer.length });

    return url;
  } catch (err) {
    throw new Error(
      `Kling API fallback failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ─── Audio conversion utility ───

async function convertAudio(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const ffmpegBin = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";

  // Determine codec from extension
  const ext = outputPath.split(".").pop()?.toLowerCase();
  const audioCodec = ext === "mp3" ? "libmp3lame" : "pcm_s16le";

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      "-i", inputPath,
      "-acodec", audioCodec,
      "-ar", ext === "mp3" ? "44100" : "22050",
      "-ac", "1",
      "-y",
      outputPath,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`Audio conversion failed: ${stderr.slice(-200)}`));
    });

    proc.on("error", reject);
  });
}

// ─── Main function ───

/**
 * Generate TTS voiceover using the best available local engine.
 *
 * Priority:
 * 1. Piper TTS (neural, best quality) — if installed
 * 2. macOS `say` (built-in, good quality) — always available on Mac
 * 3. Kling TTS API (fal.ai) — if FAL_KEY is set
 *
 * @param text - The text to convert to speech
 * @param outputPath - Path for the output audio file (.mp3 or .wav)
 * @param options - Voice and engine configuration
 * @returns VoiceResult with path, engine used, and voice name
 *
 * @example
 * ```typescript
 * const result = await generateVoiceLocal(
 *   "Welcome to the future of AI content.",
 *   "./output/voiceover.mp3",
 * );
 * console.log(result.audioPath);
 * ```
 */
export async function generateVoiceLocal(
  text: string,
  outputPath: string,
  options: VoiceOptions = {},
): Promise<VoiceResult> {
  const engines = await detectAvailableEngines();
  const format = options.format ?? "mp3";
  const engine: TTSEngine = options.engine ?? "auto";

  // ─── Piper (best quality, explicit or auto) ───
  if (engine === "piper" || (engine === "auto" && engines.piper)) {
    const piperModel =
      options.piperModel ?? PIPER_VOICES.female.model;
    const piperConfig =
      options.piperConfig ?? PIPER_VOICES.female.config;

    const { existsSync } = await import("fs");
    if (existsSync(piperModel)) {
      await generateWithPiper(text, outputPath, piperModel, piperConfig, format);
      return {
        audioPath: outputPath,
        engine: "piper",
        voice: PIPER_VOICES.female.name,
      };
    }

    logger.warn("Piper model not found, falling back to macOS say", {
      model: piperModel,
    });
    // Fall through to say below
  }

  // ─── macOS say (built-in) — always available on macOS
  if (engine === "say" || (engine === "auto" && process.platform === "darwin")) {
    const voice: string = options.sayVoice ?? (MACOS_VOICES as Record<string, string>).female!;
    const rate = options.sayRate ?? 180;

    await generateWithSay(text, outputPath, voice, rate, format);
    return {
      audioPath: outputPath,
      engine: "say",
      voice,
    };
  }

  // ─── Kling API (fallback) ───
  if (process.env.FAL_KEY) {
    logger.warn("No local TTS available, falling back to Kling API");
    const url = await generateWithKlingAPI(text, outputPath);
    return {
      audioPath: outputPath,
      audioUrl: url,
      engine: "kling-api",
      voice: "calm_story1",
    };
  }

  throw new Error(
    "No TTS engine available. Install Piper TTS (brew install piper) or set FAL_KEY for Kling API fallback.",
  );
}

/**
 * Convenience function: generate voiceover with the best local engine
 * and return the audio path. Throws if nothing works.
 */
export async function speak(text: string, outputPath?: string): Promise<string> {
  const path =
    outputPath ??
    join(process.cwd(), "output", `voice-${Date.now()}.mp3`);

  const result = await generateVoiceLocal(text, path);
  return result.audioPath;
}
