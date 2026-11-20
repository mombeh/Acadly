import type { AcademicYear } from './academic-year';

export interface SchoolClass {
  id: string;
  name: string;
  academicYearId: string;
  createdAt: string;
  academicYear?: AcademicYear;
}

export interface CreateClassInput {
  name: string;
  academicYearId: string;
}

export type UpdateClassInput = Partial<CreateClassInput>;
