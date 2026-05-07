import * as fs from "fs/promises";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "output");

export async function saveVideo(
  videoUrl: string,
  filename: string,
): Promise<string> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`Downloading video to: ${outputPath}`);

  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  console.log(`Video saved: ${outputPath} (${buffer.length} bytes)`);

  return outputPath;
}

export { OUTPUT_DIR };
