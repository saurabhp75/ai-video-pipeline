// generateVideo.ts

import { fal } from '../providers/fal.js'

export async function generateVideo(prompt: string) {
  const result = await fal.subscribe(
    'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
    {
      input: {
        prompt,
        duration: '10',
        aspect_ratio: '9:16',
        negative_prompt:
          'blurry, distorted, low quality, ugly faces, watermark',
        cfg_scale: 0.5
      },
      logs: true,
      onQueueUpdate(update: unknown) {
        console.log(update)
      }
    }
  )

  return result.data.video.url
}
