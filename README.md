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

```bash
npx ts-node src/index.ts
```

Or import the workflow directly:

```typescript
import { viralShortWorkflow } from "./src/workflows/viralShortWorkflow.js";

const result = await viralShortWorkflow(
  "Cyberpunk Delhi street market in monsoon",
  { numScenes: 3, withVoice: true }
);
```

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
src/
├── skills/          # Individual pipeline skills
│   ├── generateIdea.ts        # LLM-based viral idea generation
│   ├── generatePrompt.ts      # Cinematic prompt generation
│   ├── generateStoryboard.ts  # Scene-by-scene storyboard
│   ├── generateScenes.ts      # Full scene prompt pipeline
│   ├── generateVideo.ts       # fal.ai Kling video generation
│   ├── generateVoice.ts       # Kling TTS voiceover
│   ├── mergeAssets.ts         # Video + audio merging
│   └── upload.ts              # Save to local disk
├── providers/
│   └── fal.ts                 # fal.ai client config
├── utils/
│   ├── logger.ts              # Structured logging
│   ├── ffmpeg.ts              # FFmpeg helpers
│   └── prompts.ts             # Prompt templates & constants
├── workflows/
│   └── viralShortWorkflow.ts  # Full pipeline orchestrator
└── index.ts                   # Entry point
```
