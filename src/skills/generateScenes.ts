import {
	generateStoryboard,
	type StoryboardScene,
} from "./generateStoryboard.js";
import { generateVideoPrompt } from "./generatePrompt.js";

export interface SceneVideo {
	sceneNumber: number;
	camera: string;
	prompt: string;
	videoUrl?: string;
}

/**
 * Generates a full storyboard, then enhances each scene's prompt for video generation.
 * Returns an array of scenes ready to feed into generateVideo().
 */
export async function generateScenes(
	topic: string,
	numScenes: number = 3,
): Promise<SceneVideo[]> {
	console.log(`Generating storyboard for topic: "${topic}"`);

	const storyboard = await generateStoryboard(topic, numScenes);

	console.log(`\nStoryboard generated with ${storyboard.length} scenes.\n`);

	const scenes: SceneVideo[] = [];

	for (const scene of storyboard) {
		console.log(`--- Scene ${scene.scene} ---`);
		console.log(`Camera: ${scene.camera}`);
		console.log(`Transition: ${scene.transition}`);

		// Enhance the raw prompt into a fully cinematic AI video prompt
		const enhancedPrompt = await generateVideoPrompt(
			`${scene.prompt}. Camera: ${scene.camera}. Duration: ${scene.duration}. Transition: ${scene.transition}.`,
		);

		console.log(`Prompt: ${enhancedPrompt}\n`);

		scenes.push({
			sceneNumber: scene.scene,
			camera: scene.camera,
			prompt: enhancedPrompt ?? scene.prompt,
		});
	}

	return scenes;
}
