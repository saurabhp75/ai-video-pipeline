import { viralShortWorkflow } from "./workflows/viralShortWorkflow.js";

/** Extract value for a CLI flag that takes an argument (e.g., --niche cyberpunk). */
function getFlag(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	if (idx === -1) return undefined;
	const val = process.argv[idx + 1];
	return val && !val.startsWith("--") ? val : undefined;
}

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

	// Content niche
	const niche = getFlag("--niche");

	// Music options
	const musicGenre = getFlag("--music-genre") ?? "cinematic";

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
		niche,
	});

	console.log();
	console.log("=".repeat(60));
	console.log("  RESULT");
	console.log("=".repeat(60));
	console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
