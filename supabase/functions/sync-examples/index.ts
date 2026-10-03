// POST /functions/v1/sync-examples   (apikey: <secret key>)
// Body: { "examples"?: Example[], "force"?: boolean }
//
// 1. Upserts examples (the data/bikol_examples.json array) if provided.
// 2. Embeds every row that has no embedding yet (or all rows if force=true).
import { withSupabase } from "npm:@supabase/server@1";
import {
  embed,
  EMBEDDING_MODEL,
  exampleEmbeddingText,
  json,
} from "../_shared/embedding.ts";

const WRITABLE_FIELDS = [
  "id",
  "topic",
  "subject",
  "difficulty",
  "style",
  "student_question",
  "bikol_question",
  "english_concept",
  "ai_draft_bikol",
  "native_corrected_bikol",
  "bikol_example",
  "review_status",
  "region_label",
  "review_notes",
  "source_label",
] as const;

type ExampleInput = Record<string, unknown>;

function pickWritable(example: ExampleInput, index: number) {
  for (const field of ["id", "topic", "english_concept"]) {
    if (typeof example[field] !== "string" || !(example[field] as string).trim()) {
      throw new Error(`examples[${index}].${field} must be a non-empty string`);
    }
  }
  const row: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (field in example) row[field] = example[field];
  }
  return row;
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);

    let body: { examples?: ExampleInput[]; force?: boolean } = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return json({ error: "Body must be valid JSON" }, 400);
    }

    const db = ctx.supabaseAdmin;
    let upserted = 0;

    if (body.examples !== undefined) {
      if (!Array.isArray(body.examples)) {
        return json({ error: "examples must be an array" }, 400);
      }
      let rows;
      try {
        rows = body.examples.map(pickWritable);
      } catch (error) {
        return json({ error: (error as Error).message }, 400);
      }
      if (rows.length > 0) {
        const { error } = await db.from("tutoring_examples").upsert(rows);
        if (error) return json({ error: error.message }, 400);
        upserted = rows.length;
      }
    }

    let query = db
      .from("tutoring_examples")
      .select("id, topic, student_question, english_concept");
    if (!body.force) query = query.is("embedding", null);
    const { data: pending, error: selectError } = await query;
    if (selectError) return json({ error: selectError.message }, 500);

    const failed: Array<{ id: string; error: string }> = [];
    let embedded = 0;
    for (const row of pending ?? []) {
      try {
        const embedding = await embed(exampleEmbeddingText(row));
        const { error } = await db
          .from("tutoring_examples")
          .update({ embedding, embedding_model: EMBEDDING_MODEL })
          .eq("id", row.id);
        if (error) throw new Error(error.message);
        embedded++;
      } catch (error) {
        failed.push({ id: row.id, error: (error as Error).message });
      }
    }

    return json({ upserted, embedded, failed, model: EMBEDDING_MODEL });
  }),
};
