# AI Video Pipeline

This project is an AI-powered viral short-form video generation pipeline. It uses Pi Coding Agent skills for orchestration and TypeScript for programmatic access.

## Stack

- **@mariozechner/pi-ai** + **Opencode Go** (DeepSeek V4 Pro) — text generation
- **fal.ai** + **Kling Video 2.5 Turbo Pro** — video generation
- **FFmpeg** (fluent-ffmpeg + ffmpeg-static) — post-processing
- **pnpm** — package manager
- **TypeScript** with `module: NodeNext`, `type: module`
- **Node.js** — runtime

## Environment Variables

Required:
- `FAL_KEY` — fal.ai API key (https://fal.ai)
- `OPENCODE_API_KEY` — Opencode Go API key

Set in `.env` (copy from `.env.example`).

## Commands

```bash
# Install dependencies
pnpm install

# Type-check
npx tsc --noEmit

# Run the full pipeline
npx ts-node src/index.ts [topic] [numScenes] [--voice]

# Run single skills (programmatic)
npx ts-node -e "import { generateIdea } from './src/skills/generateIdea.js'; generateIdea().then(i => console.log(i));"
```

## Pi Skills

This project registers as a Pi package (`"pi-package"` keyword, `pi.skills` in package.json). Six Pi skills in `skills/` expose the pipeline to Pi Coding Agent:

| Skill | CLI equivalent |
|---|---|
| `ai-video-pipeline` | `npx ts-node src/index.ts` |
| `ai-video-idea` | `import { generateIdea }` |
| `ai-video-prompt` | `import { generateVideoPrompt }` |
| `ai-video-generate` | `import { generateVideo }` |
| `ai-video-voice` | `import { generateVoice }` |
| `ai-video-merge` | `import { downloadAndMerge }` |

See `skills/<name>/SKILL.md` for each skill's full instructions.

## Pipeline Flow

```
Idea Generation (LLM) → Storyboard + Scene Prompts (LLM) → Video Generation (Kling) → Voiceover (optional, Kling TTS) → Merge (ffmpeg) → Captions (optional, local whisper.cpp + ffmpeg) → Music (optional, Suno + ffmpeg) → Publish (optional, YouTube API) → Save to Disk
```

## Code Conventions

- All imports use `.js` extensions (required by `moduleResolution: NodeNext`)
- AI models are accessed via `@mariozechner/pi-ai`'s `getModel()` + `complete()`
- Messages passed to `complete()` must include `timestamp: Date.now()`
- fal.ai client is pre-configured in `src/providers/fal.ts` and imported by skills
- Logging goes through `src/utils/logger.ts` (structured, level-filtered)
- Prompt templates and constants live in `src/utils/prompts.ts`
- Generated videos save to `output/` directory

## Key Files

| File | Purpose |
|---|---|
| `src/index.ts` | CLI entry point |
| `src/workflows/viralShortWorkflow.ts` | Full pipeline orchestrator |
| `src/skills/generateIdea.ts` | LLM-based viral idea generator |
| `src/skills/generatePrompt.ts` | Cinematic prompt generator |
| `src/skills/generateStoryboard.ts` | Scene-by-scene storyboard |
| `src/skills/generateScenes.ts` | Storyboard → enhanced prompts |
| `src/skills/generateVideo.ts` | Kling video generation |
| `src/skills/generateVoice.ts` | Kling TTS voiceover |
| `src/skills/mergeAssets.ts` | Download + merge video/audio |
| `src/skills/generateCaptions.ts` | Local whisper.cpp transcripts + burnt-in captions |
| `src/skills/generateMusic.ts` | Suno AI music generation + ffmpeg overlay |
| `src/skills/publishToYouTube.ts` | YouTube Data API v3 publishing |
| `src/skills/upload.ts` | Save video to disk |
| `src/providers/fal.ts` | fal.ai client config |
| `src/utils/logger.ts` | Structured logging |
| `src/utils/ffmpeg.ts` | FFmpeg merge helper |
| `src/utils/prompts.ts` | Prompt templates & constants |
| `skills/` | Pi Coding Agent skills |
