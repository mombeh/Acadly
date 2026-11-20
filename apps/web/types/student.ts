import type { SchoolClass } from './class';

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
  class: SchoolClass;
}

export interface CreateStudentInput {
  studentNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;
