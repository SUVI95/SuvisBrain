/**
 * Zod schemas for request validation
 */
import { z } from 'zod';

export const authSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().max(256).optional(),
});

export const sessionSchema = z.object({
  sdp: z.string().min(1, 'Missing SDP offer'),
  learner_id: z.string().uuid().optional(),
  mode: z.enum(['yki', 'regular']).optional().default('regular'),
  dashboard_mode: z.string().max(64).optional(),
  review_words: z.array(z.union([z.string(), z.object({ word: z.string(), translation_hint: z.string().optional() })])).optional().default([]),
  focusTopics: z.array(z.string()).optional().default([]),
});

export function parseOr400(schema, data, res) {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, error: null };
  const msg = result.error.errors?.map((e) => e.message).join('; ') || 'Invalid input';
  return { data: null, error: { status: 400, message: msg } };
}
