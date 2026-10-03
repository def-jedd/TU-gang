// POST /functions/v1/retrieve-examples   (apikey: <secret key>)
// Called by the Express backend, never by the mobile app.
//
// Body:
// {
//   "question": "Why do we have earthquakes?",
//   "topic": null,                 // NFC topic card, optional
//   "difficulty": "simple",        // preference, optional
//   "style": "ate_kuya",           // preference, optional
//   "match_count": 3,              // 1-10, default 3
//   "reviewed_only": true,         // default true
//   "min_similarity": 0.75         // optional
// }
//
// Response: { retrieval_mode, examples: [{ ..., match_type, score }] }
// match_type "fallback" rows are style references only, not factual grounding.
import { withSupabase } from "npm:@supabase/server@1";
import { embed, json } from "../_shared/embedding.ts";

const DIFFICULTIES = ["very_simple", "simple", "normal"];
const STYLES = ["teacher", "friend", "ate_kuya"];

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body must be valid JSON" }, 400);
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!question && !topic) {
      return json({ error: "question or topic is required" }, 400);
    }
    if (question.length > 1000 || topic.length > 100) {
      return json({ error: "question or topic is too long" }, 400);
    }
    const difficulty = DIFFICULTIES.includes(body.difficulty as string)
      ? (body.difficulty as string)
      : null;
    const style = STYLES.includes(body.style as string) ? (body.style as string) : null;

    let queryEmbedding: number[] | null = null;
    const embedText = question || topic;
    try {
      queryEmbedding = await embed(embedText);
    } catch (error) {
      console.error("embedding failed, using keyword-only retrieval", error);
    }

    const { data, error } = await ctx.supabaseAdmin.rpc("match_tutoring_examples", {
      query_text: embedText,
      query_embedding: queryEmbedding,
      filter_topic: topic || null,
      preferred_difficulty: difficulty,
      preferred_style: style,
      match_count: typeof body.match_count === "number" ? body.match_count : 3,
      reviewed_only: body.reviewed_only !== false,
      ...(typeof body.min_similarity === "number"
        ? { min_similarity: body.min_similarity }
        : {}),
    });
    if (error) return json({ error: error.message }, 500);

    return json({
      retrieval_mode: queryEmbedding ? "semantic+keyword" : "keyword_only",
      examples: data ?? [],
    });
  }),
};
