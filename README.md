# AI Video Pipeline

AI-powered viral short-form video generation pipeline with end-to-end automation.

```
Idea → Script → Video → Voiceover → Captions → Music → Publish 📤
```

## Stack

- **@mariozechner/pi-ai** + **Opencode Go** (DeepSeek V4 Pro) for text generation
- **fal.ai** + **Kling Video 2.5 Turbo Pro** for video generation
- **whisper.cpp** (local) for auto-captions — no API keys, runs offline
- **Suno API** for AI-generated background music
- **YouTube Data API v3** for auto-publishing
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

Optional keys (for enhanced features):
- `SUNO_API_KEY` — Suno API key (for background music)
- `YOUTUBE_CLIENT_EMAIL` + `YOUTUBE_PRIVATE_KEY` — YouTube service account (for publishing)

## Usage

### CLI

```bash
npx ts-node src/index.ts [topic] [numScenes] [flags]
```

| Argument | Required | Default | Description |
|---|---|---|---|
| `topic` | No | Indian cyberpunk... | Video topic or idea |
| `numScenes` | No | `1` | Number of scenes (1–5 recommended) |

| Flag | Description |
|---|---|
| `--voice` | Enable TTS voiceover + merge |
| `--captions` | Generate burnt-in captions (Whisper) |
| `--music` | Generate + overlay background music (Suno) |
| `--music-genre <genre>` | Music genre (default: cinematic) |
| `--publish` | Publish to YouTube |
| `--public` | Make YouTube video public |
| `--youtube-title <title>` | Custom YouTube title |

**Examples:**

```bash
# Quick single-scene video (defaults)
npx ts-node src/index.ts

# With voiceover
npx ts-node src/index.ts "Mumbai cyberpunk monsoon" 1 --voice

# Full production: voiceover + captions + music
npx ts-node src/index.ts "Ancient Varanasi meets cyberpunk" 1 --voice --captions --music

# Full automation: generate + publish to YouTube
npx ts-node src/index.ts "Neon Tokyo night market" 1 --voice --captions --music --publish --public
```

### Pi Coding Agent Skills

```bash
# Run full pipeline
/skill:ai-video-pipeline "Mumbai cyberpunk" 1 --voice --captions --music --publish

# Individual skills
/skill:ai-video-idea "Cyberpunk India"
/skill:ai-video-prompt "Indian street food at night"
/skill:ai-video-generate "Cinematic drone shot of..."
/skill:ai-video-voice "Hook: Discover the future..."
/skill:ai-video-captions "./output/video.mp4" "./output/captioned.mp4"
/skill:ai-video-music "cyberpunk" "./output/video.mp4"
/skill:ai-video-publish "./output/video.mp4" "My Video Title" --public
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
    publishToYoutube: true,
    youtubePrivacy: "public",
  }
);

console.log(result.youtubeUrl); // https://youtube.com/watch?v=...
```

## Pipeline

```
┌──────────┬───────────┬───────────┬───────────┬────────────┐
│ DISCOVER │  CREATE   │ ENHANCE   │  PUBLISH  │   SAVE     │
├──────────┼───────────┼───────────┼───────────┼────────────┤
│ LLM Idea │ LLM Script│ Captions  │ YouTube   │ output/    │
│ → Hook   │ → Scenes  │ Music     │ Shorts    │ viral-*.mp4│
│ → Niche  │ Kling Vid │ Voiceover │ (private/ │            │
│          │ fal.ai    │ FFmpeg    │  public)  │            │
└──────────┴───────────┴───────────┴───────────┴────────────┘
```

## Project Structure

```
ai-video-pipeline/
├── skills/                    # Pi Coding Agent skills (SKILL.md files)
│   ├── ai-video-pipeline/     # Full pipeline orchestrator
│   ├── ai-video-idea/         # Viral idea generator
│   ├── ai-video-prompt/       # Cinematic prompt generator
│   ├── ai-video-generate/     # Video generation via Kling
│   ├── ai-video-voice/        # TTS voiceover generation
│   ├── ai-video-merge/        # Video + audio merging
│   ├── ai-video-captions/     # Auto-captions (Whisper + FFmpeg)
│   ├── ai-video-music/        # Background music (Suno + FFmpeg)
│   └── ai-video-publish/      # YouTube publishing
├── src/
│   ├── skills/
│   │   ├── generateIdea.ts          # LLM-based viral idea generation
│   │   ├── generatePrompt.ts        # Cinematic prompt generation
│   │   ├── generateStoryboard.ts    # Scene-by-scene storyboard
│   │   ├── generateScenes.ts        # Full scene prompt pipeline
│   │   ├── generateVideo.ts         # fal.ai Kling video generation
│   │   ├── generateVoice.ts         # Kling TTS voiceover
│   │   ├── generateCaptions.ts      # Whisper + FFmpeg captions
│   │   ├── generateMusic.ts         # Suno API + FFmpeg music
│   │   ├── publishToYouTube.ts      # YouTube Data API publishing
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
- [x] TTS voiceover (Kling TTS)
- [x] Auto-captions (Whisper + FFmpeg)
- [x] Background music (Suno + FFmpeg)
- [x] YouTube publishing (YouTube Data API)
- [ ] TikTok publishing
- [ ] Instagram Reels publishing
- [ ] Trend scraping (YouTube/TikTok trending APIs)
- [ ] Batch generation (content calendar)
- [ ] Performance analytics → idea feedback loop
- [ ] Thumbnail generation
- [ ] Multi-scene video stitching
