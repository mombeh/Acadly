import type { SchoolClass } from './class';
import type { Subject } from './subject';

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  coefficient: string | number;
  class: SchoolClass;
  subject: Subject;
}

export interface CreateClassSubjectInput {
  subjectId: string;
  coefficient: number;
}

export interface UpdateClassSubjectInput {
  coefficient: number;
}
