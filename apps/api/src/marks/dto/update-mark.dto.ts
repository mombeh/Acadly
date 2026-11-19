import { z } from 'zod';
import { scoreSchema } from './bulk-marks.dto.js';

export const updateMarkSchema = z.object({
  score: scoreSchema,
});

export type UpdateMarkDto = z.infer<typeof updateMarkSchema>;
