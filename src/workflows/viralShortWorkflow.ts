// viralShortWorkflow.ts

import { generateVideoPrompt } from '../skills/generatePrompt'
import { generateVideo } from '../skills/generateVideo'

export async function viralShortWorkflow(topic: string) {
  console.log('Generating cinematic prompt...')

  const prompt = await generateVideoPrompt(topic)

  console.log('\nPROMPT:\n')
  console.log(prompt)

  console.log('\nGenerating video...')

  const videoUrl = await generateVideo(prompt!)

  console.log('\nGenerated Video:')
  console.log(videoUrl)

  return {
    prompt,
    videoUrl
  }
}
