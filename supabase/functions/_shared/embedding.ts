// Shared embedding helpers. Uses Supabase's built-in gte-small model
// (384 dimensions, English) — no external API key needed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export const EMBEDDING_MODEL = "gte-small";
export const EMBEDDING_DIMENSIONS = 384;

const session = new Supabase.ai.Session(EMBEDDING_MODEL);

export async function embed(text: string): Promise<number[]> {
  const output = await session.run(text, { mean_pool: true, normalize: true });
  return output as number[];
}

// Embed the English side only; the Bikol text is what gets shown to the AI.
export function exampleEmbeddingText(example: {
  topic: string;
  student_question?: string | null;
  english_concept: string;
}): string {
  return [
    `Topic: ${example.topic}`,
    example.student_question ? `Question: ${example.student_question}` : null,
    `Concept: ${example.english_concept}`,
  ].filter(Boolean).join("\n");
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
