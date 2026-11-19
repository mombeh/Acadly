import { z } from 'zod';

export const createStudentSchema = z.object({
  studentNumber: z.string().trim().min(1, 'Student number is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  classId: z.uuid('Class ID must be a valid UUID'),
});

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
