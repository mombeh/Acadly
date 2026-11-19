import { z } from 'zod';

export const updateStudentSchema = z.object({
  studentNumber: z
    .string()
    .trim()
    .min(1, 'Student number is required')
    .optional(),
  firstName: z.string().trim().min(1, 'First name is required').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').optional(),
  classId: z.uuid('Class ID must be a valid UUID').optional(),
});

export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
