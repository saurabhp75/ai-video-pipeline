---
name: ai-video-pipeline
description: 'Generate viral short-form AI videos. Use when the user wants to create AI-generated videos, viral shorts, video content for Instagram/TikTok/YouTube, or run the full video generation pipeline (idea → storyboard → video → voiceover → merge → save).'
argument-hint: "[topic] [numScenes] [--voice]"
---

# AI Video Pipeline

End-to-end AI video generation pipeline using Opencode Go (DeepSeek V4 Pro) for text generation and fal.ai (Kling Video) for video generation.

## Setup

Make sure dependencies are installed and environment variables are set:

```bash
cd ai-video-pipeline && pnpm install
```

Check that `.env` contains:
- `FAL_KEY` — fal.ai API key
- `OPENCODE_API_KEY` — Opencode Go API key

## Quick Start

Run the full pipeline with defaults:

```bash
cd ai-video-pipeline && npx ts-node src/index.ts
```

## Command Line Arguments

| Argument | Required | Default | Description |
|---|---|---|---|
| `topic` | No | "Indian cyberpunk street food market in monsoon with cinematic camera motion" | Video topic |
| `numScenes` | No | `1` | Number of scenes (1–5) |
| `--voice` | No | off | Enable TTS voiceover + ffmpeg merge |

## Examples

```bash
# Quick single-scene video
npx ts-node src/index.ts

# Custom topic
npx ts-node src/index.ts "Mumbai cyberpunk monsoon at night"

# Multi-scene with voiceover
npx ts-node src/index.ts "Ancient Varanasi meets cyberpunk" 3 --voice
```

## Pipeline Steps

The workflow executes these steps in order:

1. **Idea Generation** — LLM generates a trending viral video idea
2. **Storyboard + Scenes** — Breaks idea into cinematic scenes with camera directions
3. **Video Generation** — Calls fal.ai Kling API for each scene
4. **Voiceover** (optional) — Generates TTS audio
5. **Merge** (optional) — Combines video + audio with ffmpeg
6. **Save** — Downloads final video to `output/` directory

## Troubleshooting

- If fal.ai returns errors, check `FAL_KEY` in `.env`
- If text generation fails, check `OPENCODE_API_KEY` in `.env`
- Videos save to `output/viral-<timestamp>.mp4`

## References

- Source code: [src/](../src/)
- Workflow orchestrator: [src/workflows/viralShortWorkflow.ts](../src/workflows/viralShortWorkflow.ts)
- README: [README.md](../README.md)
