import { viralShortWorkflow } from "./workflows/viralShortWorkflow.js";

async function main() {
  const topic =
    process.argv[2] ??
    "Indian cyberpunk street food market in monsoon with cinematic camera motion";

  const numScenes = parseInt(process.argv[3] ?? "1", 10);

  // Feature flags
  const withVoice = process.argv.includes("--voice");
  const withCaptions = process.argv.includes("--captions");
  const withMusic = process.argv.includes("--music");

  // Video provider
  const useOpenRouter = process.argv.includes("--openrouter");

  // Music options
  const musicGenreIdx = process.argv.indexOf("--music-genre");
  const musicGenre =
    musicGenreIdx !== -1 ? process.argv[musicGenreIdx + 1] : "cinematic";

  console.log("=".repeat(60));
  console.log("  AI Video Pipeline");
  console.log("=".repeat(60));
  console.log();

  const result = await viralShortWorkflow(topic, {
    numScenes,
    withVoice,
    withCaptions,
    withMusic,
    musicGenre,
    musicVolume: 0.15,
    videoProvider: useOpenRouter ? "openrouter" : "fal",
  });

  console.log();
  console.log("=".repeat(60));
  console.log("  RESULT");
  console.log("=".repeat(60));
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
