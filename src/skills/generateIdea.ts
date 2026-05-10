import { getModel, complete } from "@mariozechner/pi-ai";

export interface VideoIdea {
	title: string;
	niche: string;
	hook: string;
	description: string;
	visualStyle: string;
	targetPlatform: "instagram" | "youtube" | "tiktok" | "threads";
	estimatedDuration: string;
}

const TRENDING_NICHES = [
	"Indian mythology cinematics",
	"Cyberpunk India",
	"Historical alternate reality",
	"Horror POV",
	"Spiritual + philosophical shorts",
	"Motivational edits",
	"Fake movie trailers",
	"AI luxury lifestyle",
	"AI podcast clips",
	"Tech future concepts",
];

function randomNiche(): string {
	return TRENDING_NICHES[Math.floor(Math.random() * TRENDING_NICHES.length)]!;
}

export async function generateIdea(
	niche?: string,
	platform: "instagram" | "youtube" | "tiktok" | "threads" = "instagram",
): Promise<VideoIdea> {
	const targetNiche = niche ?? randomNiche();
	const model = getModel("opencode-go", "deepseek-v4-pro");

	const response = await complete(
		model,
		{
			systemPrompt: `You are a viral content strategist specializing in short-form video.
You understand platform algorithms, trending formats, and what makes content shareable.
Generate creative, specific video ideas optimized for the given platform.
Focus on: hooks that stop the scroll, emotional payoff, shareability.`,
			messages: [
				{
					role: "user" as const,
					content: `Generate a viral short-form video idea for:
Platform: ${platform}
Niche: ${targetNiche}

Return a JSON object with this exact structure (no markdown, no wrapper text):
{
  "title": "catchy video title",
  "niche": "${targetNiche}",
  "hook": "first 2-second hook text",
  "description": "2-3 sentence description of the video concept",
  "visualStyle": "cinematic style, camera movements, aesthetic",
  "targetPlatform": "${platform}",
  "estimatedDuration": "10s"
}

Make it creative, specific, and actionable.`,
					timestamp: Date.now(),
				},
			],
		},
		{ apiKey: process.env.OPENCODE_API_KEY },
	);

	for (const block of response.content) {
		if (block.type === "text") {
			const jsonMatch = block.text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				return JSON.parse(jsonMatch[0]);
			}
		}
	}

	throw new Error("Failed to generate video idea");
}

export async function generateBatchIdeas(
	count: number = 5,
	niche?: string,
): Promise<VideoIdea[]> {
	const ideas: VideoIdea[] = [];
	for (let i = 0; i < count; i++) {
		console.log(`Generating idea ${i + 1}/${count}...`);
		const idea = await generateIdea(niche);
		ideas.push(idea);
	}
	return ideas;
}
