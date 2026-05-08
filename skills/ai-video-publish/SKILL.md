---
name: ai-video-publish
description: 'Publish videos to YouTube (Shorts or regular). Use when uploading videos to YouTube, publishing content to social media, scheduling posts, or auto-publishing generated videos.'
argument-hint: "[videoPath] [title] [--public | --private]"
---

# AI Video Publisher

Upload videos to YouTube using the YouTube Data API v3. Supports YouTube Shorts, scheduled publishing, custom thumbnails, and privacy controls.

## Prerequisites

### Option A: Service Account (Recommended for Automation)
1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Create a service account
3. Add the following env vars to `.env`:
   ```
   YOUTUBE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   YOUTUBE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
   ```

### Option B: OAuth Interactive (First Run)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Desktop application)
3. Download JSON and save as `youtube-credentials.json` in project root
4. First upload will open a browser for authentication

## Usage

```bash
# As part of the pipeline (upload + all generation)
cd ai-video-pipeline && npx ts-node src/index.ts "Mumbai cyberpunk" 1 --voice --captions --music --publish

# Publish with public visibility
npx ts-node src/index.ts "Mumbai cyberpunk" 1 --publish --public

# Custom title
npx ts-node src/index.ts "Mumbai cyberpunk" 1 --publish --youtube-title "My Custom Title"
```

## Programmatic Usage

```typescript
import { publishToYouTube, publishShort } from "./src/skills/publishToYouTube.js";

// Upload a YouTube Short
const result = await publishShort("./output/video.mp4", {
  title: "Mumbai Cyberpunk at Night 🌃",
  description: "Cinematic AI-generated short exploring...",
  tags: ["cyberpunk", "mumbai", "ai", "shorts"],
});

console.log(result.url); // https://youtube.com/watch?v=...

// Upload as regular video with scheduled publishing
const result2 = await publishToYouTube("./output/video.mp4", {
  title: "Full Video Title",
  privacyStatus: "private",
  scheduledPublishAt: "2026-05-10T12:00:00Z",
  thumbnailPath: "./thumbnail.jpg",
});

// Batch upload
import { publishBatch } from "./src/skills/publishToYouTube.js";

const results = await publishBatch([
  { path: "./output/video1.mp4", options: { title: "Video 1" } },
  { path: "./output/video2.mp4", options: { title: "Video 2" } },
]);
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | required | Video title (auto-appends #Shorts for Shorts) |
| `description` | `string` | `""` | Video description |
| `tags` | `string[]` | `[]` | Tags/keywords |
| `privacyStatus` | `"private" \| "unlisted" \| "public"` | `"private"` | Video privacy |
| `isShort` | `boolean` | `false` | Upload as YouTube Short |
| `madeForKids` | `boolean` | `false` | Made for kids |
| `scheduledPublishAt` | `string` | none | ISO 8601 date for scheduling |
| `thumbnailPath` | `string` | none | Custom thumbnail image |
| `categoryId` | `string` | `"22"` | YouTube category ID |

## Notes

- First upload requires OAuth authentication (browser)
- Service accounts work for automation/CI without browser interaction
- YouTube API quota limit: 10,000 units/day (upload = 1,600 units)
- Videos >15 minutes require phone verification (not applicable for Shorts)
- Shorts auto-detect vertical aspect ratios (9:16)

## References

- Source: [src/skills/publishToYouTube.ts](../src/skills/publishToYouTube.ts)
- YouTube Data API: https://developers.google.com/youtube/v3
- Quota limits: https://developers.google.com/youtube/v3/getting-started#quota
