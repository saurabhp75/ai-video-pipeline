---
name: ai-video-captions
description: 'Generate burnt-in captions for videos using local whisper.cpp. Use when adding subtitles, TikTok/Reels-style word-by-word captions, or accessibility captions to short-form video content. Runs entirely locally — no API keys required.'
argument-hint: "[videoPath] [outputPath]"
---

# AI Video Captions

Generate burnt-in captions for short-form videos using local **whisper.cpp** for transcription and **FFmpeg** for subtitle burn-in. Runs entirely offline — no API keys or network calls for transcription.

## How It Works

1. **Extract audio** from video (FFmpeg → 16kHz mono WAV)
2. **Transcribe** with whisper.cpp (`--output-json-full` for word-level timestamps)
3. **Generate ASS subtitle file** with TikTok-style formatting
4. **Burn subtitles** into video with FFmpeg

## Prerequisites

```bash
# 1. Install ffmpeg-full (for libass subtitle rendering)
brew install ffmpeg-full

# 2. Build whisper.cpp (if not already done)
cd /Users/saurabh/dev/projects/whisper.cpp
cmake -B build && cmake --build build -j

# 3. Download a model
bash models/download-ggml-model.sh base.en
```

Default paths (override with env vars):
- Binary: `/Users/saurabh/dev/projects/whisper.cpp/build/bin/whisper-cli` (`WHISPER_CPP_BINARY`)
- Model: `/Users/saurabh/dev/projects/whisper.cpp/models/ggml-base.en.bin` (`WHISPER_CPP_MODEL`)

No API keys required for transcription. Completely local & private.

## Usage

```bash
# From CLI (via npx ts-node)
cd ai-video-pipeline && npx ts-node -e "
import { generateCaptions } from './src/skills/generateCaptions.js';
const result = await generateCaptions('./output/video.mp4', './output/captioned.mp4');
console.log(result.transcript);
"

# As part of the pipeline
cd ai-video-pipeline && npx ts-node src/index.ts "Mumbai cyberpunk" 1 --captions

# With custom model (multilingual)
cd ai-video-pipeline && npx ts-node -e "
import { generateCaptions } from './src/skills/generateCaptions.js';
const result = await generateCaptions('./output/video.mp4', './output/captioned.mp4', {
  modelPath: '/Users/saurabh/dev/projects/whisper.cpp/models/ggml-small.bin',
  language: 'en',
});
"
```

## Programmatic Usage

```typescript
import { generateCaptions } from "./src/skills/generateCaptions.js";

const result = await generateCaptions(
  "./output/video.mp4",
  "./output/captioned.mp4",
  {
    style: "phrase",         // "word" or "phrase" (2-3 word groups)
    fontSize: 12,            // Font size for captions
    fontColor: "white",      // Caption text color
    language: "en",          // Force language (or auto-detect)
    threads: 4,              // CPU threads for whisper.cpp
  }
);

console.log("Transcript:", result.transcript);
console.log("Output:", result.outputPath);
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `style` | `"word" \| "phrase"` | `"phrase"` | Word-by-word or phrase-grouped captions |
| `fontSize` | `number` | `12` | Caption font size |
| `fontColor` | `string` | `"white"` | Caption text color |
| `outlineColor` | `string` | `"black@0.6"` | Background/outline color |
| `modelPath` | `string` | `ggml-base.en.bin` | Path to whisper.cpp model |
| `binaryPath` | `string` | `build/bin/whisper-cli` | Path to whisper-cli binary |
| `language` | `string` | auto-detect | Force language (e.g., "en", "hi", "ja") |
| `threads` | `number` | `4` | CPU threads for transcription |

## Model Recommendations

| Model | Size | Speed | Accuracy | Use Case |
|---|---|---|---|---|
| `ggml-tiny.en.bin` | 75MB | Fastest | Lowest | Quick tests |
| `ggml-base.en.bin` | 148MB | Fast | Good | English short-form (default) |
| `ggml-small.en.bin` | 488MB | Medium | Better | Higher accuracy English |
| `ggml-medium.en.bin` | 1.5GB | Slower | Great | Near-production quality |
| `ggml-base.bin` | 148MB | Fast | Good | Multilingual (auto-detect) |

Download: `cd whisper.cpp && bash models/download-ggml-model.sh base.en`

## Notes

- **No API keys required** — transcription runs entirely on your machine
- whisper.cpp uses Apple Silicon GPU acceleration (CoreML) automatically on macOS
- English-only models (`.en`) are faster and more accurate for English content
- Multilingual models (no `.en`) auto-detect language
- Audio is extracted as 16kHz mono WAV for optimal whisper.cpp performance
- Captions are positioned at the bottom center of the video

## References

- Source: [src/skills/generateCaptions.ts](../src/skills/generateCaptions.ts)
- whisper.cpp: https://github.com/ggerganov/whisper.cpp
