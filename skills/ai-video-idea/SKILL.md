---
name: ai-video-idea
description: 'Generate viral short-form video ideas using AI. Use when brainstorming video content, researching trending niches, or needing creative hooks for social media videos. Supports batch idea generation.'
argument-hint: "[niche] [count]"
---

# AI Video Idea Generator

Generate viral short-form video ideas optimized for Instagram, TikTok, and YouTube Shorts using the Opencode Go LLM pipeline.

## Trending Niches

- Indian mythology cinematics
- Cyberpunk India
- Historical alternate reality
- Horror POV
- Spiritual + philosophical shorts
- Motivational edits
- Fake movie trailers
- AI luxury lifestyle
- AI podcast clips
- Tech future concepts

## Programmatic Usage

The skill code is at `src/skills/generateIdea.ts`. Import and use:

```typescript
import { generateIdea, generateBatchIdeas } from "./src/skills/generateIdea.js";

// Single idea (random niche)
const idea = await generateIdea();

// Specific niche
const idea = await generateIdea("Cyberpunk India", "instagram");

// Batch generation
const ideas = await generateBatchIdeas(5, "Horror POV");
```

Each idea returns:
- `title` — catchy video title
- `niche` — content category
- `hook` — first 2-second attention grabber
- `description` — 2-3 sentence concept
- `visualStyle` — cinematic direction
- `targetPlatform` — platform optimization
- `estimatedDuration` — runtime

## Testing from CLI

```bash
cd ai-video-pipeline && npx ts-node -e "
import { generateIdea } from './src/skills/generateIdea.js';
generateIdea().then(i => console.log(JSON.stringify(i, null, 2)));
"
```

## References

- Source: [src/skills/generateIdea.ts](../src/skills/generateIdea.ts)
- Prompt templates: [src/utils/prompts.ts](../src/utils/prompts.ts)
