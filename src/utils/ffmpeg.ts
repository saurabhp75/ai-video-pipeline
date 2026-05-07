// ffmpeg.ts

import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'

ffmpeg.setFfmpegPath(ffmpegPath!)

export async function mergeVideoAndAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions('-shortest')
      .save(outputPath)
      .on('end', resolve)
      .on('error', reject)
  })
}
