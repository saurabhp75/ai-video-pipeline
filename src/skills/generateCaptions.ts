/**
 * generateCaptions.ts
 *
 * Generates burnt-in captions for short-form videos using:
 * 1. Local whisper.cpp for transcription (word-level timestamps via --output-json-full)
 * 2. FFmpeg subtitles filter for burning captions into the video
 *
 * Produces TikTok/Reels/Shorts style phrase-grouped captions
 * optimized for high retention and accessibility.
 *
 * whisper.cpp paths:
 *   Binary:  /Users/saurabh/dev/projects/whisper.cpp/build/bin/whisper-cli
 *   Model:   /Users/saurabh/dev/projects/whisper.cpp/models/ggml-base.en.bin
 *   (override with WHISPER_CPP_BINARY and WHISPER_CPP_MODEL env vars)
 */

import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { logger } from "../utils/logger.js";

// ─── Types ───

export interface CaptionSegment {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface CaptionResult {
  /** Path to the video with burnt-in captions */
  outputPath: string;
  /** Full transcription text */
  transcript: string;
  /** Word-level segments with timestamps */
  segments: CaptionSegment[];
}

export interface CaptionOptions {
  /** Font size for captions (default: 12) */
  fontSize?: number;
  /** Font color (default: white) */
  fontColor?: string;
  /** Background/outline color (default: black@0.6) */
  outlineColor?: string;
  /** Caption style: "word" (word-by-word) or "phrase" (2-3 word chunks) */
  style?: "word" | "phrase";
  /** whisper.cpp model path (default: WHISPER_CPP_MODEL env or ggml-base.en.bin) */
  modelPath?: string;
  /** whisper.cpp binary path (default: WHISPER_CPP_BINARY env or build/bin/whisper-cli) */
  binaryPath?: string;
  /** Language override (default: "en", auto-detect otherwise) */
  language?: string;
  /** Number of threads for whisper.cpp (default: 4) */
  threads?: number;
}

// ─── Defaults ───

const WHISPER_CPP_DIR = "/Users/saurabh/dev/projects/whisper.cpp";

const DEFAULT_OPTIONS: Required<Omit<CaptionOptions, "language">> & { language: string | undefined } = {
  fontSize: 12,
  fontColor: "white",
  outlineColor: "black@0.6",
  style: "phrase",
  modelPath:
    process.env.WHISPER_CPP_MODEL ??
    join(WHISPER_CPP_DIR, "models", "ggml-base.en.bin"),
  binaryPath:
    process.env.WHISPER_CPP_BINARY ??
    join(WHISPER_CPP_DIR, "build", "bin", "whisper-cli"),
  language: undefined,
  threads: 4,
};

// ─── whisper.cpp JSON output types ───

interface WhisperToken {
  text: string;
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  id: number;
  p: number;
  t_dtw: number;
}

interface WhisperSegment {
  timestamps: { from: string; to: string };
  offsets: { from: number; to: number };
  text: string;
  tokens: WhisperToken[];
}

interface WhisperOutput {
  transcription: WhisperSegment[];
  result: { language: string };
}

// ─── whisper.cpp transcription ───

/**
 * Run whisper.cpp locally and parse word-level token timestamps
 * from the --output-json-full format.
 */
async function transcribeWithWhisperCpp(
  audioPath: string,
  opts: {
    binaryPath: string;
    modelPath: string;
    language?: string;
    threads: number;
  },
): Promise<CaptionSegment[]> {
  const { spawn } = await import("child_process");
  const { existsSync } = await import("fs");

  // Verify binary exists
  if (!existsSync(opts.binaryPath)) {
    throw new Error(
      `whisper.cpp binary not found at: ${opts.binaryPath}\n` +
      `Set WHISPER_CPP_BINARY env var or build whisper.cpp:\n` +
      `  cd ${WHISPER_CPP_DIR} && cmake -B build && cmake --build build`,
    );
  }

  // Verify model exists
  if (!existsSync(opts.modelPath)) {
    throw new Error(
      `Whisper model not found at: ${opts.modelPath}\n` +
      `Set WHISPER_CPP_MODEL env var or download a model:\n` +
      `  cd ${WHISPER_CPP_DIR} && bash models/download-ggml-model.sh base.en`,
    );
  }

  // Create temp output directory
  const tmpDir = await mkdtemp(join(tmpdir(), "whisper-cpp-"));
  const outputBase = join(tmpDir, "transcript");

  // Build whisper-cli args
  const args: string[] = [
    "-m", opts.modelPath,
    "-f", audioPath,
    "-ojf",                    // --output-json-full (word-level tokens)
    "-of", outputBase,         // output file base name
    "-t", String(opts.threads),
    "--no-prints",             // suppress console output
  ];

  if (opts.language) {
    args.push("-l", opts.language);
  }

  logger.info("Running whisper.cpp transcription...", {
    binary: opts.binaryPath,
    model: opts.modelPath,
    threads: opts.threads,
    language: opts.language ?? "auto",
  });

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(opts.binaryPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let stdout = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number) => {
      if (code === 0) {
        // Extract progress info from stderr (whisper.cpp prints progress there)
        const progressLines = stderr
          .split("\n")
          .filter((l) => l.includes("%") || l.includes("ms"))
          .slice(-3);
        if (progressLines.length > 0) {
          logger.debug("whisper.cpp progress", { lastLines: progressLines });
        }
        resolve();
      } else {
        reject(
          new Error(
            `whisper.cpp failed with code ${code}\nstderr: ${stderr.slice(-1000)}`,
          ),
        );
      }
    });

    proc.on("error", reject);
  });

  // Read the JSON output
  const jsonPath = `${outputBase}.json`;
  const jsonContent = await readFile(jsonPath, "utf-8");
  const output = JSON.parse(jsonContent) as WhisperOutput;

  logger.info("whisper.cpp transcription complete", {
    language: output.result.language,
    segments: output.transcription.length,
  });

  // Extract word-level segments from token data
  const segments = extractWordSegments(output);

  // Cleanup temp files
  try {
    await rm(tmpDir, { recursive: true, force: true });
  } catch {
    // Best effort
  }

  return segments;
}

/**
 * Extract word-level segments from whisper.cpp JSON output.
 *
 * Uses per-token timestamps from --output-json-full for precise word timing.
 * Filters out special tokens (silence, begin/end markers, music tags).
 */
function extractWordSegments(output: WhisperOutput): CaptionSegment[] {
  const segments: CaptionSegment[] = [];

  // Special tokens to skip
  const skipTokens = new Set([
    "[_BEG_]",
    "[_TT_",
    "",
    " (",
    ")",
  ]);

  for (const seg of output.transcription) {
    for (const token of seg.tokens) {
      const text = token.text.trim();

      // Skip special tokens and empty text
      if (!text || text.startsWith("[_")) continue;

      // Skip punctuation-only tokens (they get merged with the previous word)
      if (/^[.,!?;:\-–—'"()[\]{}]+$/.test(text)) continue;

      // Skip music/sound effect markers like "(upbeat music)" or "[music]"
      if (/^[[(].*[\])]$/.test(text)) continue;

      // Convert millisecond offsets to seconds
      const start = token.offsets.from / 1000;
      const end = token.offsets.to / 1000;

      // Skip tokens with zero or negative duration
      if (end <= start) continue;

      segments.push({
        text: text.toUpperCase(),
        start,
        end,
      });
    }
  }

  return segments;
}

// ─── SRT generation ───

function wordSegmentsToSRT(
  segments: CaptionSegment[],
  style: "word" | "phrase",
): string {
  if (style === "word") {
    return segments
      .map((seg, i) => {
        const index = i + 1;
        const startTime = secondsToSRTTime(seg.start);
        const endTime = secondsToSRTTime(seg.end);
        return `${index}\n${startTime} --> ${endTime}\n${seg.text}\n`;
      })
      .join("\n");
  }

  // "phrase" style: group 2-3 words together
  const phraseSegments: CaptionSegment[] = [];
  const groupSize = 3;

  for (let i = 0; i < segments.length; i += groupSize) {
    const group = segments.slice(i, i + groupSize);
    if (group.length === 0) continue;

    const firstWord = group[0]!;
    const lastWord = group[group.length - 1]!;

    phraseSegments.push({
      text: group.map((w) => w.text).join(" "),
      start: firstWord.start,
      end: lastWord.end,
    });
  }

  return phraseSegments
    .map((seg, i) => {
      const index = i + 1;
      const startTime = secondsToSRTTime(seg.start);
      const endTime = secondsToSRTTime(seg.end);
      return `${index}\n${startTime} --> ${endTime}\n${seg.text}\n`;
    })
    .join("\n");
}

function secondsToSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

// ─── ASS subtitle style ───

function generateASSStyle(options: Required<Omit<CaptionOptions, "modelPath" | "binaryPath" | "language" | "threads">>): string {
  return `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,${options.fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,3,1,2,50,50,100,1
Style: Highlight,Montserrat,${options.fontSize + 2},&H0000FFFF,&H000000FF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,3,1,2,50,50,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`.trim();
}

function wordSegmentsToASS(
  segments: CaptionSegment[],
  style: "word" | "phrase",
  options: Required<Omit<CaptionOptions, "modelPath" | "binaryPath" | "language" | "threads">>,
): string {
  const header = generateASSStyle(options);

  if (style === "word") {
    const events = segments
      .map(
        (seg) =>
          `Dialogue: 0,${secondsToASSTime(seg.start)},${secondsToASSTime(seg.end)},Default,,0,0,0,,${seg.text}`,
      )
      .join("\n");
    return `${header}\n${events}`;
  }

  // "phrase" style: group words
  const groupSize = 3;
  const events: string[] = [];

  for (let i = 0; i < segments.length; i += groupSize) {
    const group = segments.slice(i, i + groupSize);
    if (group.length === 0) continue;

    const firstWord = group[0]!;
    const lastWord = group[group.length - 1]!;
    const text = group.map((w) => w.text).join(" ");

    events.push(
      `Dialogue: 0,${secondsToASSTime(firstWord.start)},${secondsToASSTime(lastWord.end)},Default,,0,0,0,,${text}`,
    );
  }

  return `${header}\n${events.join("\n")}`;
}

function secondsToASSTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

// ─── FFmpeg path selection ───

/**
 * Find the best ffmpeg binary:
 * 1. WHISPER_CPP_FFMPEG env var (explicit override)
 * 2. ffmpeg-full from Homebrew (has libass, libfreetype for subtitles/drawtext)
 * 3. System ffmpeg (fallback)
 */
/**
 * Resolve ffmpeg binary path.
 * Uses ffmpeg-full (with libass/libfreetype for subtitle rendering) when available,
 * falls back to system ffmpeg.
 */
function getFfmpegPath(): string {
  return process.env.WHISPER_CPP_FFMPEG ?? "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg";
}

// ─── FFmpeg subtitle burn-in ───

async function burnSubtitlesWithFFmpeg(
  videoPath: string,
  subtitlePath: string,
  outputPath: string,
): Promise<void> {
  const { spawn } = await import("child_process");

  return new Promise((resolve, reject) => {
    logger.info("Burning subtitles into video...");

    // Use ASS subtitles directly — the ASS file already contains styling
    // Avoid force_style with complex paths to prevent FFmpeg parsing errors
    const args = [
      "-i", videoPath,
      "-vf", `ass=${subtitlePath}`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "copy",
      "-y",
      outputPath,
    ];

    const ffmpegBin = getFfmpegPath();
    logger.debug("Using ffmpeg binary", { path: ffmpegBin });

    const ffmpegProc = spawn(ffmpegBin, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    ffmpegProc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpegProc.on("close", (code: number) => {
      if (code === 0) {
        logger.info("Subtitles burnt into video successfully");
        resolve();
      } else {
        reject(
          new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`),
        );
      }
    });

    ffmpegProc.on("error", reject);
  });
}

// ─── Main function ───

/**
 * Generate burnt-in captions for a video using local whisper.cpp.
 *
 * Workflow:
 * 1. Extract audio from video (FFmpeg → 16kHz mono WAV)
 * 2. Transcribe with whisper.cpp (--output-json-full for word-level timestamps)
 * 3. Generate ASS subtitle file with TikTok-style formatting
 * 4. Burn subtitles into video with FFmpeg
 *
 * No API keys required — runs entirely locally.
 *
 * @param videoPath - Path to the input video file
 * @param outputPath - Path for the output video with burnt-in captions
 * @param options - Caption styling and behavior options
 * @returns CaptionResult with output path, transcript, and word segments
 *
 * @example
 * ```typescript
 * const result = await generateCaptions(
 *   "./output/video.mp4",
 *   "./output/captioned.mp4",
 *   { style: "phrase" }
 * );
 * console.log("Transcript:", result.transcript);
 * ```
 */
export async function generateCaptions(
  videoPath: string,
  outputPath: string,
  options: CaptionOptions = {},
): Promise<CaptionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { spawn } = await import("child_process");
  const { existsSync } = await import("fs");

  // Create temp directory
  const tmpDir = await mkdtemp(join(tmpdir(), "ai-video-captions-"));
  const audioPath = join(tmpDir, "audio.wav"); // WAV for whisper.cpp compatibility
  const subtitlePath = join(tmpDir, "subtitles.ass");

  try {
    // Step 1: Extract audio from video → 16kHz mono WAV
    // whisper.cpp works best with WAV input
    logger.info("Extracting audio from video...");
    await new Promise<void>((resolve, reject) => {
      const ffmpegBin = getFfmpegPath();
      const ffmpegProc = spawn(ffmpegBin, [
        "-i", videoPath,
        "-vn",                    // no video
        "-acodec", "pcm_s16le",   // PCM 16-bit WAV
        "-ar", "16000",           // 16kHz (whisper.cpp default)
        "-ac", "1",               // mono
        "-y",
        audioPath,
      ], { stdio: ["ignore", "pipe", "pipe"] });

      let stderr = "";
      ffmpegProc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      ffmpegProc.on("close", (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg audio extraction failed with code ${code}: ${stderr.slice(-300)}`));
      });
      ffmpegProc.on("error", reject);
    });

    // Verify audio file was created
    if (!existsSync(audioPath)) {
      throw new Error("Audio extraction failed: output file not created");
    }

    // Step 2: Transcribe with whisper.cpp (local, no API key needed)
    const segments = await transcribeWithWhisperCpp(audioPath, {
      binaryPath: opts.binaryPath,
      modelPath: opts.modelPath,
      language: opts.language,
      threads: opts.threads,
    });

    if (segments.length === 0) {
      throw new Error(
        "No speech detected in the video. " +
        "The audio may be silent, music-only, or in a language not supported by the current model. " +
        "For multilingual audio, use a multilingual model (ggml-base.bin instead of ggml-base.en.bin).",
      );
    }

    const transcript = segments.map((s) => s.text).join(" ");

    // Step 3: Generate ASS subtitle file
    const styleOpts = {
      fontSize: opts.fontSize,
      fontColor: opts.fontColor,
      outlineColor: opts.outlineColor,
      style: opts.style,
    } as Required<Omit<CaptionOptions, "modelPath" | "binaryPath" | "language" | "threads">>;

    const assContent = wordSegmentsToASS(segments, opts.style, styleOpts);
    await writeFile(subtitlePath, assContent, "utf-8");

    // Step 4: Burn subtitles into video
    await burnSubtitlesWithFFmpeg(videoPath, subtitlePath, outputPath);

    return {
      outputPath,
      transcript,
      segments,
    };
  } finally {
    // Cleanup temp files
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  }
}

/**
 * Run whisper.cpp transcription on an audio file and return word segments.
 * Useful when you only need the transcript (no video burn-in).
 *
 * @param audioPath - Path to WAV or MP3 audio file
 * @param options - Transcription options
 * @returns Transcript text and word-level segments with timestamps
 */
export async function generateCaptionsFromAudio(
  audioPath: string,
  options: CaptionOptions = {},
): Promise<Omit<CaptionResult, "outputPath">> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const segments = await transcribeWithWhisperCpp(audioPath, {
    binaryPath: opts.binaryPath,
    modelPath: opts.modelPath,
    language: opts.language,
    threads: opts.threads,
  });

  if (segments.length === 0) {
    throw new Error("No speech detected in the audio");
  }

  const transcript = segments.map((s) => s.text).join(" ");

  return {
    transcript,
    segments,
  };
}
