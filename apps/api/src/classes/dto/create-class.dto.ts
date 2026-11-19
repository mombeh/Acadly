import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  academicYearId: z.uuid('Academic year ID must be a valid UUID'),
});

export type CreateClassDto = z.infer<typeof createClassSchema>;
