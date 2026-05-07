---
name: ai-video-prompt
description: 'Generate cinematic AI video prompts optimized for Kling, Veo, and other video generation models. Use when creating prompts for AI video generation, enhancing basic ideas into cinematic descriptions, or building prompt templates.'
argument-hint: "[topic]"
---

# AI Video Prompt Generator

Converts any topic into a cinematic AI video prompt optimized for video generation models (Kling, Veo, Seedance, etc.).

## Prompt Structure

Generated prompts follow this structure:
```
[subject] [action] [environment] [camera movement] [lighting] [mood] [style] [quality]
```

## Programmatic Usage

```typescript
import { generateVideoPrompt } from "./src/skills/generatePrompt.js";

const prompt = await generateVideoPrompt("Cyberpunk Delhi monsoon");
console.log(prompt);
```

## Testing from CLI

```bash
cd ai-video-pipeline && npx ts-node -e "
import { generateVideoPrompt } from './src/skills/generatePrompt.js';
generateVideoPrompt('Indian street food at night').then(p => console.log(p));
"
```

## References

- Source: [src/skills/generatePrompt.ts](../src/skills/generatePrompt.ts)
- Prompt templates: [src/utils/prompts.ts](../src/utils/prompts.ts)
