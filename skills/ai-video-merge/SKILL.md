---
name: ai-video-merge
description: 'Merge video and audio files using ffmpeg. Use when combining AI-generated video with voiceover audio, post-processing video assets, or exporting final videos with synchronized audio tracks.'
argument-hint: "[videoPath] [audioPath] [outputPath]"
---

# AI Video Merger

Merge video and audio assets using ffmpeg. Can merge local files or download from URLs.

## Programmatic Usage

### FFmpeg Utility (local files)

```typescript
import { mergeVideoAndAudio } from "./src/utils/ffmpeg.js";

await mergeVideoAndAudio(
  "output/video.mp4",
  "output/audio.mp3",
  "output/final.mp4"
);
```

### Download + Merge (remote URLs)

```typescript
import { downloadAndMerge } from "./src/skills/mergeAssets.js";

const outputPath = await downloadAndMerge({
  videoUrl: "https://fal.ai/generated-video.mp4",
  audioUrl: "https://fal.ai/generated-audio.mp3",
  outputPath: "output/final.mp4",
});
console.log("Merged video:", outputPath);
```

## Testing from CLI

```bash
# Test FFmpeg merge (requires local files)
cd ai-video-pipeline && npx ts-node -e "
import { mergeVideoAndAudio } from './src/utils/ffmpeg.js';
await mergeVideoAndAudio('video.mp4', 'audio.mp3', 'output.mp4');
console.log('Done');
"
```

## Notes

- Uses `fluent-ffmpeg` with `ffmpeg-static` (no system ffmpeg required)
- Applies `-shortest` flag: output matches shortest input
- `downloadAndMerge` automatically cleans up temp files
- Overwrites existing output files

## References

- Merge skill: [src/skills/mergeAssets.ts](../src/skills/mergeAssets.ts)
- FFmpeg utility: [src/utils/ffmpeg.ts](../src/utils/ffmpeg.ts)
- Saver: [src/skills/upload.ts](../src/skills/upload.ts)
