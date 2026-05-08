---
name: ai-video-music
description: 'Generate AI background music with Suno and overlay it onto videos. Use when adding background music, soundtracks, or audio atmosphere to short-form video content.'
argument-hint: "[genre] [videoPath?]"
---

# AI Video Music

Generate AI background music using the Suno API and overlay it onto videos with FFmpeg audio mixing.

## How It Works

1. **Generate music** via Suno API (text-to-music with genre prompt)
2. **Download** generated music locally
3. **Overlay** onto video with FFmpeg (ducked background audio)

## Prerequisites

Requires `SUNO_API_KEY` in `.env` (get one at https://suno.com).

## Usage

```bash
# As part of the pipeline
cd ai-video-pipeline && npx ts-node src/index.ts "Mumbai cyberpunk" 1 --music --music-genre cinematic

# Programmatic: generate and overlay in one step
cd ai-video-pipeline && npx ts-node -e "
import { generateAndOverlayMusic } from './src/skills/generateMusic.js';
const output = await generateAndOverlayMusic('./output/video.mp4', './output/with-music.mp4', { genre: 'cyberpunk' });
console.log(output);
"
```

## Programmatic Usage

```typescript
import { generateMusic, overlayMusic, generateAndOverlayMusic } from "./src/skills/generateMusic.js";

// Option A: Generate and overlay in one call
const outputPath = await generateAndOverlayMusic(
  "./output/video.mp4",
  "./output/with-music.mp4",
  { genre: "cinematic" },
  0.15  // music volume (0.15 = quiet background)
);

// Option B: Generate separately (cache for reuse)
const music = await generateMusic({ genre: "lofi" });
const outputPath2 = await overlayMusic({
  videoPath: "./output/video.mp4",
  musicPath: music.musicPath,
  outputPath: "./output/with-music.mp4",
  musicVolume: 0.2,
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

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `genre` | `string` | `"cinematic"` | Music genre/style |
| `prompt` | `string` | auto | Custom Suno prompt (overrides genre) |
| `instrumental` | `boolean` | `true` | Generate instrumental only |
| `musicVolume` | `number` | `0.15` | Background music volume (0-1) |
| `mixWithOriginal` | `boolean` | `true` | Mix with existing audio or replace |

## Notes

- Music generation takes 30-60 seconds (Suno API polling)
- Generated music is ~30 seconds (Suno default), looped/re-trimmed by FFmpeg
- Cache generated music URLs in `MUSIC_CATALOG` to avoid regeneration costs
- Suno API pricing: included in subscription tiers

## References

- Source: [src/skills/generateMusic.ts](../src/skills/generateMusic.ts)
- Suno API: https://suno.com
