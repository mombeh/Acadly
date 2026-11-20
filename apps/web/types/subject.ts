import type { SchoolClass } from './class';

export interface SubjectClassAssignment {
  id: string;
  classId: string;
  subjectId: string;
  coefficient: string | number;
  class: SchoolClass;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  classSubjects?: SubjectClassAssignment[];
}

export interface CreateSubjectInput {
  name: string;
  code: string;
}

export type UpdateSubjectInput = Partial<CreateSubjectInput>;
