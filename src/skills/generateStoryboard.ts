import { getModel, complete } from "@mariozechner/pi-ai";

export interface StoryboardScene {
  scene: number;
  camera: string;
  prompt: string;
  duration: string;
  transition: string;
}

export async function generateStoryboard(
  topic: string,
  numScenes: number = 3,
): Promise<StoryboardScene[]> {
  const model = getModel("opencode-go", "deepseek-v4-pro");

  const response = await complete(
    model,
    {
      systemPrompt: `You are a professional storyboard artist and cinematographer for viral short-form videos.
You break down ideas into cinematic scenes optimized for AI video generation models.
Each scene must include precise camera direction and a prompt suitable for an AI video model.
Focus on: viral hook in first 2 seconds, fast pacing, dramatic transitions.`,
      messages: [
        {
          role: "user" as const,
          content: `Create a ${numScenes}-scene storyboard for a viral short about: "${topic}"

Return a JSON array with this exact structure (no markdown, no wrapper text):
[
  {
    "scene": 1,
    "camera": "extreme close-up, fast zoom",
    "prompt": "detailed AI video generation prompt for this exact scene",
    "duration": "3s",
    "transition": "whip pan"
  }
]

Requirements:
- Scene 1 must hook viewers in 2 seconds
- Each prompt must be cinematic and self-contained (subject + action + environment + camera + lighting + mood + style)
- Duration: first scene 2-3s, middle scenes 3-4s, last scene 2-3s
- Transitions: use cinematic transitions (whip pan, match cut, dolly zoom, etc.)`,
          timestamp: Date.now(),
        },
      ],
    },
    { apiKey: process.env.OPENCODE_API_KEY },
  );

  for (const block of response.content) {
    if (block.type === "text") {
      // Parse the JSON response, handling possible markdown wrapping
      const jsonMatch = block.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  }

  throw new Error("Failed to generate storyboard");
}
