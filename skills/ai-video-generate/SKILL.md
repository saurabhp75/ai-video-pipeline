---
name: ai-video-generate
description: 'Generate AI videos using fal.ai Kling Video API. Use when creating videos from text prompts, generating short-form video content, or calling the Kling video generation pipeline. Supports text-to-video generation.'
argument-hint: "[prompt]"
---

# AI Video Generator

Generate AI videos using fal.ai's Kling Video 2.5 Turbo Pro model. Produces 10-second vertical (9:16) videos optimized for Instagram Reels, TikTok, and YouTube Shorts.

## Prerequisites

Requires `FAL_KEY` in `.env`. Get one at https://fal.ai

## Default Parameters

- Model: `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`
- Duration: 10 seconds
- Aspect ratio: 9:16 (vertical)
- CFG scale: 0.5

## Programmatic Usage

```typescript
import { generateVideo } from "./src/skills/generateVideo.js";

const videoUrl = await generateVideo(
  "A lone monk walking through neon-lit Varanasi streets during monsoon, cinematic tracking shot, volumetric lighting"
);
console.log("Video URL:", videoUrl);
```

## Testing from CLI

```bash
cd ai-video-pipeline && npx ts-node -e "
import { generateVideo } from './src/skills/generateVideo.js';
generateVideo('Cinematic drone shot of Mumbai skyline at sunset, golden hour lighting').then(url => console.log(url));
"
```

## Notes

- Video generation can take 1-5 minutes depending on queue
- Progress updates stream to console via `onQueueUpdate`
- Returns a direct video URL (valid for a limited time)
- Save the video locally with `ai-video-merge` or `ai-video-pipeline` skills

## References

- Source: [src/skills/generateVideo.ts](../src/skills/generateVideo.ts)
- fal.ai docs: https://fal.ai/docs
