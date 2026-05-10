// generateVoice.ts

import { fal } from "../providers/fal.js";

export async function generateVoice(text: string) {
	const result = await fal.subscribe("fal-ai/kling-video/v1/tts", {
		input: {
			text,
			voice_id: "calm_story1" as const,
		},
	});

	return result.data.audio.url;
}
