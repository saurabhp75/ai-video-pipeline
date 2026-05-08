---
name: ai-video-voice
description: 'Generate AI voiceover/audio using local TTS (Piper neural TTS or macOS say) or fal.ai Kling TTS as fallback. Use when adding narration to videos, generating voiceovers for short-form content, or creating text-to-speech audio assets.'
argument-hint: "[text for voiceover] [--engine say|piper|auto]"
---

# AI Voiceover Generator

Generate text-to-speech voiceovers using the best available local engine, with Kling API as fallback.

## Engines (auto-selected by default)

| Engine | Quality | Speed | Setup | API Key |
|---|---|---|---|---|
| **Piper TTS** | Excellent (neural) | ~0.5s | `pip3 install piper-tts` + download model | None |
| **macOS say** | Good | Instant | Built into macOS | None |
| **Kling API** | Good | ~2-5s | `FAL_KEY` in `.env` | fal.ai |

## Prerequisites

Zero setup for macOS — `say` is built in. For best quality:

```bash
# Install Piper TTS (neural, best quality)
pip3 install piper-tts --break-system-packages

# Download a voice model
mkdir -p /Users/saurabh/dev/projects/piper-voices
cd /Users/saurabh/dev/projects/piper-voices
curl -LO "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx"
curl -LO "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json"
```

## Programmatic Usage

```typescript
import { generateVoiceLocal } from "./src/skills/generateVoiceLocal.js";

// Auto-select best available engine
const result = await generateVoiceLocal(
  "Welcome to the future of Indian cyberpunk.",
  "./output/voiceover.mp3"
);
console.log(result.engine);  // "piper" or "say" or "kling-api"

// Force specific engine
const piperResult = await generateVoiceLocal(
  "Neural TTS voiceover.",
  "./output/voice.mp3",
  { engine: "piper" }
);

// macOS say with custom voice
const sayResult = await generateVoiceLocal(
  "Built-in macOS voice.",
  "./output/voice.mp3",
  { engine: "say", sayVoice: "Samantha", sayRate: 180 }
);
```

## Testing from CLI

```bash
cd ai-video-pipeline && npx tsx -e "
import { generateVoiceLocal } from './src/skills/generateVoiceLocal.js';
(async () => {
  const r = await generateVoiceLocal('Hello world!', '/tmp/test.mp3');
  console.log(r.engine, r.voice, r.audioPath);
})();
"
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `engine` | `"say" \| "piper" \| "auto"` | `"auto"` | TTS engine to use |
| `sayVoice` | `string` | `"Samantha"` | macOS voice name |
| `sayRate` | `number` | `180` | Speech rate (wpm) |
| `piperModel` | `string` | auto | Path to Piper .onnx model |
| `piperConfig` | `string` | auto | Path to Piper model config |
| `format` | `"wav" \| "mp3"` | `"mp3"` | Output audio format |

## Available macOS Voices

| Voice | Style |
|---|---|
| `Samantha` | Female, US English (best quality) |
| `Karen` | Female, Australian English |
| `Daniel` | Male, UK English |
| `Alex` | Male, US English |

List all: `say -v '?'`

## Notes

- **Zero API keys needed** — runs entirely on your machine with Piper or macOS say
- Kling API only used as fallback when no local engine is available
- Piper models are ~50MB, download once and reuse
- Audio output is mono MP3 at 44.1kHz, optimized for video overlay

## References

- Source: [src/skills/generateVoiceLocal.ts](../src/skills/generateVoiceLocal.ts)
- Piper TTS: https://github.com/rhasspy/piper
- Voice models: https://huggingface.co/rhasspy/piper-voices
