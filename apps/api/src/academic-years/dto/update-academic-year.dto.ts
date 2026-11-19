import { z } from 'zod';

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (value) =>
      value.startDate === undefined ||
      value.endDate === undefined ||
      value.endDate > value.startDate,
    {
      message: 'End date must be later than start date',
      path: ['endDate'],
    },
  );

export type UpdateAcademicYearDto = z.infer<typeof updateAcademicYearSchema>;
