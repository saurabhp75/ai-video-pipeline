# AI Video Pipeline

AI-powered viral short-form video generation pipeline using:
- **@mariozechner/pi-ai** + **Opencode Go** (DeepSeek V4 Pro) for text generation
- **fal.ai** + **Kling Video** for video generation
- **FFmpeg** for post-processing

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required keys:
- `FAL_KEY` — fal.ai API key (get one at https://fal.ai)
- `OPENCODE_API_KEY` — Opencode Go API key

## Usage

### Pi Coding Agent Skills

Import as a Pi package or use skills directly with `/skill:ai-video-*` commands:

```bash
# Install as Pi package
pi install ./ai-video-pipeline

# Or use skills inline
/skill:ai-video-pipeline "Mumbai cyberpunk" 3 --voice
/skill:ai-video-idea "Cyberpunk India"
/skill:ai-video-prompt "Indian street food at night"
/skill:ai-video-generate "Cinematic drone shot of..."
/skill:ai-video-voice "Hook: Discover the future..."
/skill:ai-video-merge
```

Available Pi skills:

| Skill | Description | Arguments |
|---|---|---|
| `ai-video-pipeline` | Full end-to-end pipeline (idea → video → save) | `[topic] [numScenes] [--voice]` |
| `ai-video-idea` | Generate viral video ideas | `[niche] [count]` |
| `ai-video-prompt` | Generate cinematic AI video prompts | `[topic]` |
| `ai-video-generate` | Generate video via fal.ai Kling | `[prompt]` |
| `ai-video-voice` | Generate TTS voiceover | `[text for voiceover]` |
| `ai-video-merge` | Merge video + audio with ffmpeg | `[videoPath] [audioPath] [outputPath]` |

### CLI

```bash
npx ts-node src/index.ts [topic] [numScenes] [--voice]
```

| Argument | Required | Default | Description |
|---|---|---|---|
| `topic` | No | `"Indian cyberpunk street food market in monsoon with cinematic camera motion"` | The video topic or idea to generate |
| `numScenes` | No | `1` | Number of scenes in the storyboard (1–5 recommended) |
| `--voice` | No | off | Enable TTS voiceover generation and video+audio merging |

**Examples:**

```bash
# Quick single-scene video (defaults)
npx ts-node src/index.ts

# Custom topic, single scene
npx ts-node src/index.ts "Mumbai cyberpunk monsoon at night"

# Multi-scene with voiceover
npx ts-node src/index.ts "Ancient Varanasi meets cyberpunk" 3 --voice

# Multi-scene without voiceover
npx ts-node src/index.ts "AI-generated luxury lifestyle" 5
```

### Programmatic API

```typescript
import { viralShortWorkflow } from "./src/workflows/viralShortWorkflow.js";

const result = await viralShortWorkflow(
  "Cyberpunk Delhi street market in monsoon",
  { numScenes: 3, withVoice: true, niche: "Cyberpunk India" }
);
```

`viralShortWorkflow` accepts three options in its second argument:

| Option | Type | Default | Description |
|---|---|---|---|
| `numScenes` | `number` | `1` | Number of storyboard scenes to generate |
| `withVoice` | `boolean` | `false` | Whether to generate a TTS voiceover and merge with video |
| `niche` | `string` | `"Cyberpunk India"` | Content niche override (see prompts.ts for the full list) |

## Pipeline

```
Idea Generation (LLM)
  → Storyboard + Scene Prompts (LLM)
  → Video Generation (fal.ai Kling)
  → Voiceover (optional, fal.ai Kling TTS)
  → Merge Video + Audio (ffmpeg)
  → Save to Disk
```

## Project Structure

```
ai-video-pipeline/
├── skills/                  # Pi Coding Agent skills (SKILL.md files)
│   ├── ai-video-pipeline/   # Full pipeline orchestrator
│   ├── ai-video-idea/       # Viral idea generator
│   ├── ai-video-prompt/     # Cinematic prompt generator
│   ├── ai-video-generate/   # Video generation via Kling
│   ├── ai-video-voice/      # TTS voiceover generation
│   └── ai-video-merge/      # Video + audio merging
├── src/
│   ├── skills/              # Individual pipeline skills (TypeScript)
│   │   ├── generateIdea.ts        # LLM-based viral idea generation
│   │   ├── generatePrompt.ts      # Cinematic prompt generation
│   │   ├── generateStoryboard.ts  # Scene-by-scene storyboard
│   │   ├── generateScenes.ts      # Full scene prompt pipeline
│   │   ├── generateVideo.ts       # fal.ai Kling video generation
│   │   ├── generateVoice.ts       # Kling TTS voiceover
│   │   ├── mergeAssets.ts         # Video + audio merging
│   │   └── upload.ts              # Save to local disk
│   ├── providers/
│   │   └── fal.ts                 # fal.ai client config
│   ├── utils/
│   │   ├── logger.ts              # Structured logging
│   │   ├── ffmpeg.ts              # FFmpeg helpers
│   │   └── prompts.ts             # Prompt templates & constants
│   ├── workflows/
│   │   └── viralShortWorkflow.ts  # Full pipeline orchestrator
│   └── index.ts                   # Entry point
├── .env
├── .env.example
├── .gitignore
├── .npmrc
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```
