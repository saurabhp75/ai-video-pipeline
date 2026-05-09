# AI Video Pipeline

AI-powered viral short-form video generation pipeline with end-to-end automation.

```
Idea → Script → Video → Voiceover → Captions → Music → Save 📤
```

## Stack

- **@mariozechner/pi-ai** + **Opencode Go** (DeepSeek V4 Pro) for text generation
- **fal.ai** + **Kling Video 2.5 Turbo Pro** for video generation
- **whisper.cpp** (local) for auto-captions — no API keys, runs offline
- **ACE-Step 1.5** (local) for background music — open-source, commercial-grade quality
- **macOS `say` / Piper TTS** (local) for voiceover — no API keys
- **FFmpeg** for post-processing
- **pnpm** — package manager
- **TypeScript** with `module: NodeNext`, `type: module`

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required keys:
- `FAL_KEY` — fal.ai API key (https://fal.ai)
- `OPENCODE_API_KEY` — Opencode Go API key

## Usage

### CLI

```bash
npx tsx src/index.ts [topic] [numScenes] [flags]
```

| Argument | Required | Default | Description |
|---|---|---|---|
| `topic` | No | Indian cyberpunk... | Video topic or idea |
| `numScenes` | No | `1` | Number of scenes (1–5 recommended) |

| Flag | Description |
|---|---|
| `--voice` | Enable TTS voiceover + merge |
| `--captions` | Generate burnt-in captions (whisper.cpp) |
| `--music` | Generate + overlay background music (ACE-Step) |
| `--music-genre <genre>` | Music genre (default: cinematic) |

**Examples:**

```bash
# Quick single-scene video (defaults)
npx tsx src/index.ts

# With voiceover
npx tsx src/index.ts "Mumbai cyberpunk monsoon" 1 --voice

# Full production: voiceover + captions
npx tsx src/index.ts "Ancient Varanasi meets cyberpunk" 1 --voice --captions

# Full production + music (requires ACE-Step server running)
npx tsx src/index.ts "Neon Tokyo night market" 1 --voice --captions --music --music-genre cyberpunk
```

### Pi Coding Agent Skills

```bash
# Run full pipeline
/skill:ai-video-pipeline "Mumbai cyberpunk" 1 --voice --captions --music

# Individual skills
/skill:ai-video-idea "Cyberpunk India"
/skill:ai-video-prompt "Indian street food at night"
/skill:ai-video-generate "Cinematic drone shot of..."
/skill:ai-video-voice "Hook: Discover the future..."
/skill:ai-video-captions "./output/video.mp4" "./output/captioned.mp4"
/skill:ai-video-music "cyberpunk" "./output/video.mp4"
/skill:ai-video-merge
```

### Programmatic API

```typescript
import { viralShortWorkflow } from "./src/workflows/viralShortWorkflow.js";

const result = await viralShortWorkflow(
  "Cyberpunk Delhi street market in monsoon",
  {
    numScenes: 1,
    withVoice: true,
    withCaptions: true,
    withMusic: true,
    musicGenre: "cyberpunk",
  }
);

console.log(result.finalPath); // ./output/viral-final-1712345678.mp4
```

## Pipeline

```
┌──────────┬───────────┬───────────┬────────────┐
│  CREATE  │  ENHANCE  │  PRODUCE  │   SAVE     │
├──────────┼───────────┼───────────┼────────────┤
│ LLM Idea │ Captions  │ Voiceover │ output/    │
│ → Script │ Music     │ FFmpeg    │ viral-*.mp4│
│ Kling Vid│ whisper   │ ACE-Step  │            │
│ fal.ai   │ .cpp      │ local TTS │            │
└──────────┴───────────┴───────────┴────────────┘
```

## Project Structure

```
ai-video-pipeline/
├── skills/                    # Pi Coding Agent skills (SKILL.md files)
│   ├── ai-video-pipeline/     # Full pipeline orchestrator
│   ├── ai-video-idea/         # Viral idea generator
│   ├── ai-video-prompt/       # Cinematic prompt generator
│   ├── ai-video-generate/     # Video generation via Kling
│   ├── ai-video-voice/        # Local TTS voiceover (Piper / macOS say)
│   ├── ai-video-merge/        # Video + audio merging
│   ├── ai-video-captions/     # Auto-captions (whisper.cpp + FFmpeg)
│   ├── ai-video-music/        # Background music (ACE-Step + FFmpeg)
│   └── ai-video-publish/      # YouTube publishing (standalone, not in pipeline)
├── src/
│   ├── skills/
│   │   ├── generateIdea.ts          # LLM-based viral idea generation
│   │   ├── generatePrompt.ts        # Cinematic prompt generation
│   │   ├── generateStoryboard.ts    # Scene-by-scene storyboard
│   │   ├── generateScenes.ts        # Full scene prompt pipeline
│   │   ├── generateVideo.ts         # fal.ai Kling video generation
│   │   ├── generateVoiceLocal.ts    # Local TTS (Piper / macOS say)
│   │   ├── generateVoice.ts         # Kling TTS (legacy fallback)
│   │   ├── generateCaptions.ts      # whisper.cpp + FFmpeg captions
│   │   ├── generateMusicAceStep.ts  # ACE-Step 1.5 + FFmpeg music
│   │   ├── generateMusic.ts         # Suno API music (legacy)
│   │   ├── publishToYouTube.ts      # YouTube Data API (standalone)
│   │   ├── mergeAssets.ts           # Video + audio merging
│   │   └── upload.ts                # Save to local disk
│   ├── providers/
│   │   └── fal.ts                   # fal.ai client config
│   ├── utils/
│   │   ├── logger.ts                # Structured logging
│   │   ├── ffmpeg.ts                # FFmpeg helpers
│   │   └── prompts.ts               # Prompt templates & constants
│   ├── workflows/
│   │   └── viralShortWorkflow.ts    # Full pipeline orchestrator
│   └── index.ts                     # CLI entry point
├── .env.example
├── package.json
└── tsconfig.json
```

## Roadmap

- [x] Idea generation (LLM)
- [x] Video generation (fal.ai Kling)
- [x] TTS voiceover (local Piper / macOS say)
- [x] Auto-captions (local whisper.cpp + FFmpeg)
- [x] Background music (local ACE-Step 1.5 + FFmpeg)
- [x] YouTube publishing (standalone module)
- [ ] TikTok publishing
- [ ] Instagram Reels publishing
- [ ] Trend scraping (YouTube/TikTok trending APIs)
- [ ] Batch generation (content calendar)
- [ ] Performance analytics → idea feedback loop
- [ ] Thumbnail generation
- [ ] Multi-scene video stitching
