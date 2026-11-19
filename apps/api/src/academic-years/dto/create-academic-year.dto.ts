import { z } from 'zod';

export const createAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: 'End date must be later than start date',
    path: ['endDate'],
  });

export type CreateAcademicYearDto = z.infer<typeof createAcademicYearSchema>;
