import { z } from 'zod';

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  code: z.string().trim().min(1, 'Code is required').optional(),
});

export type UpdateSubjectDto = z.infer<typeof updateSubjectSchema>;
