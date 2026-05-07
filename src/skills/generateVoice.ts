// generateVoice.ts

import { fal } from '../providers/fal'

export async function generateVoice(text: string) {
  const result = await fal.subscribe(
    'fal-ai/kling-video/v1/tts',
    {
      input: {
        text,
        voice: 'tara'
      }
    }
  )

  return result.data.audio.url
}
