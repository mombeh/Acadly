import { z } from 'zod';

export const coefficientSchema = z.coerce
  .number()
  .finite()
  .positive('Coefficient must be greater than zero')
  .max(999.99, 'Coefficient must not exceed 999.99');

export const createClassSubjectSchema = z.object({
  subjectId: z.uuid('Subject ID must be a valid UUID'),
  coefficient: coefficientSchema,
});

export type CreateClassSubjectDto = z.infer<typeof createClassSubjectSchema>;
