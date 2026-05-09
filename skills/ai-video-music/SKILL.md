---
name: ai-video-music
description: 'Generate AI background music with ACE-Step 1.5 (local, open-source) and overlay it onto videos. Use when adding background music, soundtracks, or audio atmosphere to short-form video content. Runs entirely locally — no API keys, no subscriptions.'
argument-hint: "[genre] [videoPath?]"
---

# AI Video Music (ACE-Step 1.5)

Generate AI background music using **ACE-Step 1.5** — an open-source music foundation model with quality between Suno v4.5 and v5. Runs locally on your machine via an API server.

## How It Works

1. **ACE-Step API server** runs persistently on `localhost:8001` — models loaded once, reused across calls
2. **Submit** a generation task with a genre/prompt via `POST /release_task`
3. **Poll** for completion via `POST /query_result` every 5s
4. **Download** the generated MP3 via `GET /v1/audio`
5. **Overlay** onto video with FFmpeg

## Prerequisites

```bash
# 1. Clone and install ACE-Step (one-time)
cd /Users/saurabh/dev/projects
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync

# 2. Download models (~10GB total, one-time)
huggingface-cli download ACE-Step/Ace-Step1.5 --local-dir ./checkpoints
huggingface-cli download ACE-Step/acestep-5Hz-lm-0.6B --local-dir ./checkpoints/acestep-5Hz-lm-0.6B

# 3. Start the API server (keep this running in a dedicated terminal)
uv run acestep-api
```

No API keys required. 100% local, 100% free.

## Usage

```bash
# As part of the pipeline (server must be running)
cd ai-video-pipeline && npx tsx src/index.ts "Mumbai cyberpunk" 1 --music --music-genre cinematic

# Programmatic: generate and overlay in one step
cd ai-video-pipeline && npx tsx -e "
import { generateAndOverlayMusicAceStep } from './src/skills/generateMusicAceStep.js';
(async () => {
  const output = await generateAndOverlayMusicAceStep(
    './output/video.mp4',
    './output/with-music.mp4',
    { genre: 'cyberpunk', duration: 30 }
  );
  console.log('Output:', output);
})();
"
```

## Programmatic Usage

```typescript
import {
  generateMusicAceStep,
  overlayMusic,
  generateAndOverlayMusicAceStep,
} from "./src/skills/generateMusicAceStep.js";

// Option A: Generate and overlay in one call
const outputPath = await generateAndOverlayMusicAceStep(
  "./output/video.mp4",
  "./output/with-music.mp4",
  { genre: "cinematic", duration: 30 },
  0.12, // music volume (low background)
);

// Option B: Generate separately
const music = await generateMusicAceStep({
  genre: "lofi",
  duration: 30,
  timeout: 180, // max wait in seconds
});

// Overlay onto multiple videos
const video2 = await overlayMusic({
  videoPath: "./output/video2.mp4",
  musicPath: music.musicPath,
  outputPath: "./output/video2-with-music.mp4",
  musicVolume: 0.15,
});
```

## Genre Options

| Genre | Description |
|---|---|
| `cinematic` | Epic orchestral, Hans Zimmer style |
| `lofi` | Chill lofi hip hop, relaxed vibes |
| `orchestra` | Grand orchestral, John Williams style |
| `ambient` | Atmospheric pads, Brian Eno style |
| `cyberpunk` | Dark synthwave, Blade Runner style |
| `motivational` | Uplifting piano + strings |
| `horror` | Tense thriller soundtrack |
| `action` | High-energy percussion, aggressive synths |
| `spiritual` | Meditative, Indian classical influences |
| `retro` | 80s retro synthwave |
| `upbeat` | Upbeat electronic pop instrumental |
| `piano` | Beautiful solo piano, contemporary classical |

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `genre` | `string` | `"cinematic"` | Music genre/style |
| `prompt` | `string` | auto | Custom prompt (overrides genre) |
| `duration` | `number` | `30` | Music duration in seconds |
| `instrumental` | `boolean` | `true` | Generate instrumental only |
| `timeout` | `number` | `180` | Max wait time (seconds) |
| `pollInterval` | `number` | `5` | Status check interval (seconds) |
| `musicVolume` | `number` | `0.12` | Background music volume (0-1) |
| `mixWithOriginal` | `boolean` | `true` | Mix with existing audio or replace |

## Performance (M2 Pro 16GB)

| Stage | Time |
|---|---|
| Cold start (first run) | ~130s (model loading) |
| Warm generation (30s audio) | ~X seconds |
| FFmpeg overlay | ~1-2s |

## Notes

- **No API keys, no subscriptions** — 100% free and local
- Quality: between Suno v4.5 and v5 (commercial-grade)
- Server must be running: `cd ACE-Step-1.5 && uv run acestep-api`
- Cold start ~130s on M2 Pro (model loading), subsequent calls are fast (models stay in memory)
- Old Suno API integration preserved in `src/skills/generateMusic.ts`

## References

- Source: [src/skills/generateMusicAceStep.ts](../src/skills/generateMusicAceStep.ts)
- ACE-Step: https://github.com/ACE-Step/ACE-Step-1.5
- Legacy Suno module: [src/skills/generateMusic.ts](../src/skills/generateMusic.ts)
