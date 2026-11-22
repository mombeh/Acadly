import type { ClassSubject } from './class-subject';
import type { Student } from './student';

export type MarkSequence = 'SEQUENCE_1' | 'SEQUENCE_2' | 'SEQUENCE_3';

export interface RosterMark {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  markId: string | null;
  score: string | number | null;
}

export interface BulkMarkEntry {
  studentId: string;
  score: number;
}

export interface BulkMarksInput {
  sequence: MarkSequence;
  marks: BulkMarkEntry[];
}

export interface Mark {
  id: string;
  studentId: string;
  classSubjectId: string;
  sequence: MarkSequence;
  score: string | number;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  classSubject?: ClassSubject;
}
