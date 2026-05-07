import { getModel, complete } from "@mariozechner/pi-ai";

const SYSTEM_PROMPT = `You are an elite viral short-form video creator.
Generate cinematic prompts for AI video models.
Focus on:
- motion
- cinematic camera movement
- viral aesthetics
- emotional hooks
- realism
- high retention`;

export async function generateVideoPrompt(topic: string) {
  const model = getModel("openrouter", "moonshotai/kimi-k2.6");

  const context = {
    systemPrompt: SYSTEM_PROMPT,
    messages: [
      {
        role: "user" as const,
        content: `Create a viral cinematic AI video prompt about: ${topic}`,
      },
    ],
  };

  const response = await complete(model, context, {
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  for (const block of response.content) {
    if (block.type === "text") {
      return block.text;
    }
  }

  throw new Error("No text content in model response");
}
