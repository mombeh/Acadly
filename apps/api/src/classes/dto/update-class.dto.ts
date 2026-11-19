import { z } from 'zod';

export const updateClassSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  academicYearId: z.uuid('Academic year ID must be a valid UUID').optional(),
});

export type UpdateClassDto = z.infer<typeof updateClassSchema>;
