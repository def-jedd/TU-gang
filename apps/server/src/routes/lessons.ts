import { Router } from 'express';
import { z } from 'zod';
import { DIFFICULTIES } from '../types/tutor.js';
import { getLesson } from '../services/lessons.js';

export const lessonsRouter = Router();

const lessonSchema = z.object({
  lesson_id: z.string().regex(/^g[1-9]-[a-z_]+-w\d{1,2}-\d{1,3}$/),
  language: z.enum(['bikol_daet', 'tagalog', 'english']).default('bikol_daet'),
  difficulty: z.enum(DIFFICULTIES).default('simple'),
});

// POST { lesson_id, language, difficulty } -> ILAW lesson + exam (see services/lessons.ts)
lessonsRouter.post('/', async (req, res) => {
  const parsed = lessonSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Send { lesson_id, language, difficulty }' });
    return;
  }
  const { lesson_id, language, difficulty } = parsed.data;
  res.json(await getLesson(lesson_id, language, difficulty));
});
