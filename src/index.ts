import { viralShortWorkflow } from "./workflows/viralShortWorkflow.js";

async function main() {
  const topic =
    process.argv[2] ??
    "Indian cyberpunk street food market in monsoon with cinematic camera motion";

  const numScenes = parseInt(process.argv[3] ?? "1", 10);
  const withVoice = process.argv.includes("--voice");

  console.log("=".repeat(60));
  console.log("  AI Video Pipeline");
  console.log("=".repeat(60));
  console.log();

  const result = await viralShortWorkflow(topic, { numScenes, withVoice });

  console.log();
  console.log("=".repeat(60));
  console.log("  RESULT");
  console.log("=".repeat(60));
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
