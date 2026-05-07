---
name: ai-video-voice
description: 'Generate AI voiceover/audio using fal.ai Kling TTS. Use when adding narration to videos, generating voiceovers for short-form content, or creating text-to-speech audio assets.'
argument-hint: "[text for voiceover]"
---

# AI Voiceover Generator

Generate text-to-speech voiceovers using fal.ai's Kling TTS API. Designed for short-form video narration.

## Prerequisites

Requires `FAL_KEY` in `.env`.

## Programmatic Usage

```typescript
import { generateVoice } from "./src/skills/generateVoice.js";

const audioUrl = await generateVoice(
  "Welcome to the future of Indian cyberpunk. Where ancient traditions meet neon-lit streets."
);
console.log("Audio URL:", audioUrl);
```

## Testing from CLI

```bash
cd ai-video-pipeline && npx ts-node -e "
import { generateVoice } from './src/skills/generateVoice.js';
generateVoice('In the heart of Mumbai, a new world awakens.').then(url => console.log(url));
"
```

## Notes

- Default voice: `calm_story1` (calm storytelling voice, English)
- Override by editing `voice_id` in `src/skills/generateVoice.ts`
- Available voices include English, Chinese, and character voices
- Returns a direct audio URL

## References

- Source: [src/skills/generateVoice.ts](../src/skills/generateVoice.ts)
