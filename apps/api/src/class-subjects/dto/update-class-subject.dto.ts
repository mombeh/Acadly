import { z } from 'zod';
import { coefficientSchema } from './create-class-subject.dto.js';

export const updateClassSubjectSchema = z.object({
  coefficient: coefficientSchema,
});

export type UpdateClassSubjectDto = z.infer<typeof updateClassSubjectSchema>;
