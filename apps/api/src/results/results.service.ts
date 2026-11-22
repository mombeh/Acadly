import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type MarkSequence = 'SEQUENCE_1' | 'SEQUENCE_2' | 'SEQUENCE_3';

const sequences: MarkSequence[] = ['SEQUENCE_1', 'SEQUENCE_2', 'SEQUENCE_3'];

interface RawStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  marks: Array<{
    id: string;
    classSubjectId: string;
    sequence: string;
    score: Prisma.Decimal | null;
  }>;
}

interface RawAssignment {
  id: string;
  subjectId: string;
  coefficient: Prisma.Decimal;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  coefficient: number;
  sequence1: number | null;
  sequence2: number | null;
  sequence3: number | null;
  subjectAverage: number | null;
  isComplete: boolean;
}

export interface ClassStudentResult {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  subjectResults: SubjectResult[];
  generalAverage: number | null;
  isComplete: boolean;
  rank: number | null;
  performanceComment: string | null;
}

export interface ClassResult {
  classId: string;
  className: string;
  academicYear: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  } | null;
  students: ClassStudentResult[];
}

export interface StudentReport {
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    classId: string;
  };
  class: {
    id: string;
    name: string;
    academicYearId: string;
  };
  academicYear: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  } | null;
  subjectResults: SubjectResult[];
  generalAverage: number | null;
  isComplete: boolean;
  classRank: number | null;
  performanceComment: string | null;
}

interface ComputedStudent {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  subjectResults: SubjectResult[];
  generalAverage: number | null;
  generalAverageDecimal: Prisma.Decimal | null;
  isComplete: boolean;
  rank: number | null;
}

function toDisplay(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }
  return Number(value.toFixed(2));
}

function performanceComment(average: number): string {
  if (average >= 16) {
    return 'Excellent';
  }
  if (average >= 14) {
    return 'Very Good';
  }
  if (average >= 12) {
    return 'Good';
  }
  if (average >= 10) {
    return 'Fair';
  }
  return 'Needs Improvement';
}

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getClassResults(classId: string): Promise<ClassResult> {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        academicYear: true,
        students: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          include: { marks: true },
        },
        classSubjects: {
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }

    const assignments: RawAssignment[] = classRecord.classSubjects.map(
      (assignment) => ({
        id: assignment.id,
        subjectId: assignment.subjectId,
        coefficient: assignment.coefficient,
        subject: {
          id: assignment.subject.id,
          name: assignment.subject.name,
          code: assignment.subject.code,
        },
      }),
    );

    const students: RawStudent[] = classRecord.students.map((student) => ({
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      marks: student.marks.map((mark) => ({
        id: mark.id,
        classSubjectId: mark.classSubjectId,
        sequence: mark.sequence as MarkSequence,
        score: mark.score,
      })),
    }));

    const computed = students.map((student) =>
      this.computeStudentResult(student, assignments),
    );
    this.assignRanks(computed);

    const ordered = [...computed].sort((a, b) => {
      if (a.isComplete && b.isComplete) {
        return (a.rank ?? 0) - (b.rank ?? 0);
      }
      if (a.isComplete) {
        return -1;
      }
      if (b.isComplete) {
        return 1;
      }
      return 0;
    });

    return {
      classId: classRecord.id,
      className: classRecord.name,
      academicYear: classRecord.academicYear
        ? {
            id: classRecord.academicYear.id,
            name: classRecord.academicYear.name,
            startDate: classRecord.academicYear.startDate,
            endDate: classRecord.academicYear.endDate,
            isActive: classRecord.academicYear.isActive,
          }
        : null,
      students: ordered.map((student) => ({
        studentId: student.studentId,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        subjectResults: student.subjectResults,
        generalAverage: student.generalAverage,
        isComplete: student.isComplete,
        rank: student.rank,
        performanceComment: student.isComplete
          ? performanceComment(student.generalAverage!)
          : null,
      })),
    };
  }

  async getStudentReport(studentId: string): Promise<StudentReport> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { include: { academicYear: true } } },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    const classResult = await this.getClassResults(student.classId);
    const studentResult = classResult.students.find(
      (entry) => entry.studentId === studentId,
    );

    if (!studentResult) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        classId: student.classId,
      },
      class: {
        id: student.class.id,
        name: student.class.name,
        academicYearId: student.class.academicYearId,
      },
      academicYear: classResult.academicYear,
      subjectResults: studentResult.subjectResults,
      generalAverage: studentResult.generalAverage,
      isComplete: studentResult.isComplete,
      classRank: studentResult.rank,
      performanceComment: studentResult.isComplete
        ? performanceComment(studentResult.generalAverage!)
        : null,
    };
  }

  private computeStudentResult(
    student: RawStudent,
    assignments: RawAssignment[],
  ): ComputedStudent {
    const subjectResults: SubjectResult[] = [];
    let allComplete = true;
    let weightedSum = new Prisma.Decimal(0);
    let coefficientSum = new Prisma.Decimal(0);

    for (const assignment of assignments) {
      const marksBySequence = new Map<MarkSequence, Prisma.Decimal | null>();
      for (const sequence of sequences) {
        marksBySequence.set(sequence, null);
      }

      for (const mark of student.marks) {
        if (mark.classSubjectId === assignment.id) {
          marksBySequence.set(mark.sequence as MarkSequence, mark.score);
        }
      }

      const sequence1 = marksBySequence.get('SEQUENCE_1') ?? null;
      const sequence2 = marksBySequence.get('SEQUENCE_2') ?? null;
      const sequence3 = marksBySequence.get('SEQUENCE_3') ?? null;

      const isComplete =
        sequence1 !== null && sequence2 !== null && sequence3 !== null;

      let subjectAverage: number | null = null;
      let subjectAverageDecimal: Prisma.Decimal | null = null;

      if (isComplete) {
        subjectAverageDecimal = sequence1!
          .add(sequence2!)
          .add(sequence3!)
          .div(new Prisma.Decimal(3));
        subjectAverage = toDisplay(subjectAverageDecimal);
      }

      if (!isComplete) {
        allComplete = false;
      }

      subjectResults.push({
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        subjectCode: assignment.subject.code,
        coefficient: toDisplay(assignment.coefficient)!,
        sequence1: toDisplay(sequence1),
        sequence2: toDisplay(sequence2),
        sequence3: toDisplay(sequence3),
        subjectAverage,
        isComplete,
      });

      if (isComplete && subjectAverageDecimal) {
        weightedSum = weightedSum.add(
          subjectAverageDecimal.mul(assignment.coefficient),
        );
        coefficientSum = coefficientSum.add(assignment.coefficient);
      }
    }

    let generalAverage: number | null = null;
    let generalAverageDecimal: Prisma.Decimal | null = null;
    let isComplete = false;

    if (assignments.length > 0 && allComplete) {
      generalAverageDecimal = weightedSum.div(coefficientSum);
      generalAverage = toDisplay(generalAverageDecimal);
      isComplete = true;
    }

    return {
      studentId: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      subjectResults,
      generalAverage,
      generalAverageDecimal,
      isComplete,
      rank: null,
    };
  }

  private assignRanks(students: ComputedStudent[]): void {
    const complete = students.filter((student) => student.isComplete);

    complete.sort((a, b) =>
      b.generalAverageDecimal!.cmp(a.generalAverageDecimal!),
    );

    let rank = 0;
    for (let i = 0; i < complete.length; i++) {
      if (
        i === 0 ||
        complete[i].generalAverageDecimal!.cmp(
          complete[i - 1].generalAverageDecimal!,
        ) !== 0
      ) {
        rank = i + 1;
      }
      complete[i].rank = rank;
    }
  }
}
