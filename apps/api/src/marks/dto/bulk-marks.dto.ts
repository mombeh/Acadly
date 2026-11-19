import { z } from 'zod';

export const sequenceSchema = z.enum([
  'SEQUENCE_1',
  'SEQUENCE_2',
  'SEQUENCE_3',
]);

export type MarkSequence = z.infer<typeof sequenceSchema>;

export const scoreSchema = z.coerce
  .number()
  .finite()
  .min(0, 'Score must be between 0 and 20')
  .max(20, 'Score must be between 0 and 20');

export const bulkMarksSchema = z.object({
  sequence: sequenceSchema,
  marks: z
    .array(
      z.object({
        studentId: z.uuid('Student ID must be a valid UUID'),
        score: scoreSchema,
      }),
    )
    .min(1, 'At least one mark is required'),
});

export type BulkMarksDto = z.infer<typeof bulkMarksSchema>;
