import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().min(1, 'Code is required'),
});

export type CreateSubjectDto = z.infer<typeof createSubjectSchema>;
