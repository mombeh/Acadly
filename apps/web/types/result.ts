export type MarkSequence = 'SEQUENCE_1' | 'SEQUENCE_2' | 'SEQUENCE_3';

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  coefficient: number | string;
  sequence1: number | string | null;
  sequence2: number | string | null;
  sequence3: number | string | null;
  subjectAverage: number | string | null;
  isComplete: boolean;
}

export interface ClassStudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  subjectResults: SubjectResult[];
  generalAverage: number | string | null;
  isComplete: boolean;
  rank: number | null;
  performanceComment: string | null;
}

export interface ClassAcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ClassResult {
  classId: string;
  className: string;
  academicYear: ClassAcademicYear | null;
  students: ClassStudentResult[];
}

export interface StudentReportStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
}

export interface StudentReportClass {
  id: string;
  name: string;
  academicYearId: string;
}

export interface StudentReport {
  student: StudentReportStudent;
  class: StudentReportClass;
  academicYear: ClassAcademicYear | null;
  subjectResults: SubjectResult[];
  generalAverage: number | string | null;
  isComplete: boolean;
  classRank: number | null;
  performanceComment: string | null;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export function formatScore(value: number | string | null | undefined): string {
  const number = toNumber(value);
  if (number === null) {
    return '—';
  }
  return number.toFixed(2);
}

export function formatAverage(
  value: number | string | null | undefined,
): string {
  return formatScore(value);
}

export function formatRank(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return String(value);
}
