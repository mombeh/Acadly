import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResultsService } from './results.service.js';

const createPrismaMock = () => ({
  class: {
    findUnique: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
  },
});

const classId = 'a0f4a0f4-0000-4000-8000-000000000001';
const academicYearId = 'b0f4a0f4-0000-4000-8000-000000000002';
const subjectMathId = 'c0f4a0f4-0000-4000-8000-000000000003';
const subjectEngId = 'd0f4a0f4-0000-4000-8000-000000000004';
const csMathId = 'e0f4a0f4-0000-4000-8000-000000000005';
const csEngId = 'f0f4a0f4-0000-4000-8000-000000000006';
const studentId1 = '10f4a0f4-0000-4000-8000-000000000010';
const studentId2 = '11f4a0f4-0000-4000-8000-000000000011';
const studentId3 = '12f4a0f4-0000-4000-8000-000000000012';
const studentId4 = '13f4a0f4-0000-4000-8000-000000000013';

function mark({
  classSubjectId,
  sequence,
  score,
}: {
  classSubjectId: string;
  sequence: 'SEQUENCE_1' | 'SEQUENCE_2' | 'SEQUENCE_3';
  score: number | null;
}) {
  return {
    id: 'mark-id',
    studentId: 'student-id',
    classSubjectId,
    sequence,
    score: score === null ? null : new Prisma.Decimal(score),
  };
}

function buildClassRecord({
  students,
  assignments,
}: {
  students: Array<{
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    marks: Array<{
      classSubjectId: string;
      sequence: 'SEQUENCE_1' | 'SEQUENCE_2' | 'SEQUENCE_3';
      score: number | null;
    }>;
  }>;
  assignments: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    coefficient: number;
  }>;
}) {
  return {
    id: classId,
    name: 'Form 1',
    academicYearId,
    academicYear: {
      id: academicYearId,
      name: '2026/2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isActive: true,
    },
    students: students.map((student) => ({
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      classId,
      marks: student.marks.map((m) => mark(m)),
    })),
    classSubjects: assignments.map((assignment) => ({
      id: assignment.id,
      classId,
      subjectId: assignment.subjectId,
      coefficient: new Prisma.Decimal(assignment.coefficient),
      subject: {
        id: assignment.subjectId,
        name: assignment.subjectName,
        code: assignment.subjectCode,
      },
    })),
  };
}

describe('ResultsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ResultsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ResultsService(prisma as unknown as PrismaService);
  });

  const singleStudent = {
    id: studentId1,
    studentNumber: 'S001',
    firstName: 'Ada',
    lastName: 'Lovelace',
    marks: [
      mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 15 }),
      mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_2', score: 16 }),
      mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_3', score: 17 }),
    ],
  };

  const mathAssignment = {
    id: csMathId,
    subjectId: subjectMathId,
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
    coefficient: 1,
  };

  describe('getClassResults', () => {
    it('computes the correct subject average', async () => {
      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [singleStudent],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      expect(result.students).toHaveLength(1);
      const [math] = result.students[0].subjectResults;
      expect(math.subjectAverage).toBe(16);
      expect(math.isComplete).toBe(true);
    });

    it('computes the correct weighted general average', async () => {
      const student = {
        ...singleStudent,
        marks: [
          ...singleStudent.marks,
          mark({ classSubjectId: csEngId, sequence: 'SEQUENCE_1', score: 10 }),
          mark({ classSubjectId: csEngId, sequence: 'SEQUENCE_2', score: 10 }),
          mark({ classSubjectId: csEngId, sequence: 'SEQUENCE_3', score: 10 }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [student],
          assignments: [
            { ...mathAssignment, coefficient: 2 },
            {
              id: csEngId,
              subjectId: subjectEngId,
              subjectName: 'English',
              subjectCode: 'ENG',
              coefficient: 1,
            },
          ],
        }),
      );

      const result = await service.getClassResults(classId);

      // Math average 16 (coeff 2), English average 10 (coeff 1)
      // (16 * 2 + 10 * 1) / (2 + 1) = 42 / 3 = 14
      expect(result.students[0].generalAverage).toBe(14);
    });

    it('returns null subject average when the first sequence is missing', async () => {
      const student = {
        ...singleStudent,
        marks: [
          mark({
            classSubjectId: csMathId,
            sequence: 'SEQUENCE_1',
            score: null,
          }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_2', score: 16 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_3', score: 17 }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [student],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      const [math] = result.students[0].subjectResults;
      expect(math.sequence1).toBeNull();
      expect(math.subjectAverage).toBeNull();
      expect(math.isComplete).toBe(false);
      expect(result.students[0].generalAverage).toBeNull();
      expect(result.students[0].isComplete).toBe(false);
      expect(result.students[0].rank).toBeNull();
      expect(result.students[0].performanceComment).toBeNull();
    });

    it('returns null subject average when the second sequence is missing', async () => {
      const student = {
        ...singleStudent,
        marks: [
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 15 }),
          mark({
            classSubjectId: csMathId,
            sequence: 'SEQUENCE_2',
            score: null,
          }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_3', score: 17 }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [student],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      const [math] = result.students[0].subjectResults;
      expect(math.sequence2).toBeNull();
      expect(math.subjectAverage).toBeNull();
      expect(result.students[0].generalAverage).toBeNull();
    });

    it('returns null subject average when the third sequence is missing', async () => {
      const student = {
        ...singleStudent,
        marks: [
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 15 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_2', score: 16 }),
          mark({
            classSubjectId: csMathId,
            sequence: 'SEQUENCE_3',
            score: null,
          }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [student],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      const [math] = result.students[0].subjectResults;
      expect(math.sequence3).toBeNull();
      expect(math.subjectAverage).toBeNull();
      expect(result.students[0].generalAverage).toBeNull();
    });

    it('makes the general average pending when one subject among several is incomplete', async () => {
      const student = {
        ...singleStudent,
        marks: [
          ...singleStudent.marks,
          mark({ classSubjectId: csEngId, sequence: 'SEQUENCE_1', score: 10 }),
          mark({
            classSubjectId: csEngId,
            sequence: 'SEQUENCE_2',
            score: null,
          }),
          mark({ classSubjectId: csEngId, sequence: 'SEQUENCE_3', score: 10 }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [student],
          assignments: [
            { ...mathAssignment, coefficient: 2 },
            {
              id: csEngId,
              subjectId: subjectEngId,
              subjectName: 'English',
              subjectCode: 'ENG',
              coefficient: 1,
            },
          ],
        }),
      );

      const result = await service.getClassResults(classId);

      expect(result.students[0].generalAverage).toBeNull();
      expect(result.students[0].isComplete).toBe(false);
      expect(result.students[0].rank).toBeNull();
      expect(result.students[0].performanceComment).toBeNull();
    });

    it('handles a class with no assigned subjects', async () => {
      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [singleStudent],
          assignments: [],
        }),
      );

      const result = await service.getClassResults(classId);

      expect(result.students[0].subjectResults).toEqual([]);
      expect(result.students[0].generalAverage).toBeNull();
      expect(result.students[0].isComplete).toBe(false);
      expect(result.students[0].rank).toBeNull();
    });

    it('handles a class with no students', async () => {
      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      expect(result.students).toEqual([]);
    });

    it('ranks students by general average in descending order', async () => {
      const students = [
        {
          ...singleStudent,
          id: studentId1,
          studentNumber: 'S001',
          firstName: 'Low',
          lastName: 'A',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 13,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 13,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 13,
            }),
          ],
        },
        {
          ...singleStudent,
          id: studentId2,
          studentNumber: 'S002',
          firstName: 'High',
          lastName: 'B',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 17,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 17,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 17,
            }),
          ],
        },
        {
          ...singleStudent,
          id: studentId3,
          studentNumber: 'S003',
          firstName: 'Mid',
          lastName: 'C',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 15,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 15,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 15,
            }),
          ],
        },
      ];

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({ students, assignments: [mathAssignment] }),
      );

      const result = await service.getClassResults(classId);

      const averages = result.students.map((s) => s.generalAverage);
      expect(averages).toEqual([17, 15, 13]);
      expect(result.students.map((s) => s.rank)).toEqual([1, 2, 3]);
      expect(result.students.map((s) => s.firstName)).toEqual([
        'High',
        'Mid',
        'Low',
      ]);
    });

    it('uses competition ranking for ties', async () => {
      const students = [
        {
          ...singleStudent,
          id: studentId1,
          firstName: 'A',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 17,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 18,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 18,
            }),
          ],
        },
        {
          ...singleStudent,
          id: studentId2,
          firstName: 'B',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 15,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 15,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 16,
            }),
          ],
        },
        {
          ...singleStudent,
          id: studentId3,
          firstName: 'C',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 15,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 15,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 16,
            }),
          ],
        },
        {
          ...singleStudent,
          id: studentId4,
          firstName: 'D',
          marks: [
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_1',
              score: 13,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_2',
              score: 13,
            }),
            mark({
              classSubjectId: csMathId,
              sequence: 'SEQUENCE_3',
              score: 13,
            }),
          ],
        },
      ];

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({ students, assignments: [mathAssignment] }),
      );

      const result = await service.getClassResults(classId);

      expect(result.students.map((s) => s.firstName)).toEqual([
        'A',
        'B',
        'C',
        'D',
      ]);
      expect(result.students.map((s) => s.rank)).toEqual([1, 2, 2, 4]);
    });

    it('gives incomplete students no rank and places them after complete students', async () => {
      const complete = {
        ...singleStudent,
        id: studentId1,
        firstName: 'Complete',
      };
      const incomplete = {
        ...singleStudent,
        id: studentId2,
        firstName: 'Incomplete',
        marks: [
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 15 }),
          mark({
            classSubjectId: csMathId,
            sequence: 'SEQUENCE_2',
            score: null,
          }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_3', score: 17 }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [incomplete, complete],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      expect(result.students.map((s) => s.firstName)).toEqual([
        'Complete',
        'Incomplete',
      ]);
      expect(result.students[0].rank).toBe(1);
      expect(result.students[1].rank).toBeNull();
      expect(result.students[1].performanceComment).toBeNull();
    });

    it('applies performance comment boundaries', async () => {
      const cases: Array<{ marks: number[]; expected: string }> = [
        { marks: [16, 16, 16], expected: 'Excellent' },
        { marks: [16, 16, 15.96], expected: 'Very Good' },
        { marks: [14, 14, 14], expected: 'Very Good' },
        { marks: [14, 14, 13.97], expected: 'Good' },
        { marks: [12, 12, 12], expected: 'Good' },
        { marks: [12, 12, 11.97], expected: 'Fair' },
        { marks: [10, 10, 10], expected: 'Fair' },
        { marks: [10, 10, 9.97], expected: 'Needs Improvement' },
      ];

      for (const { marks, expected } of cases) {
        const student = {
          ...singleStudent,
          marks: marks.map((score, i) =>
            mark({
              classSubjectId: csMathId,
              sequence: ['SEQUENCE_1', 'SEQUENCE_2', 'SEQUENCE_3'][i],
              score,
            }),
          ),
        };

        prisma.class.findUnique.mockResolvedValue(
          buildClassRecord({
            students: [student],
            assignments: [mathAssignment],
          }),
        );

        const result = await service.getClassResults(classId);
        expect(result.students[0].performanceComment).toBe(expected);
      }
    });

    it('rounds display values to two decimal places', async () => {
      const student = {
        ...singleStudent,
        marks: [
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 15 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_2', score: 15 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_3', score: 16 }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [student],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      // (15 + 15 + 16) / 3 = 15.333... -> 15.33
      expect(result.students[0].subjectResults[0].subjectAverage).toBe(15.33);
      expect(result.students[0].generalAverage).toBe(15.33);
    });

    it('ranks using unrounded averages', async () => {
      const studentA = {
        ...singleStudent,
        id: studentId1,
        firstName: 'A',
        marks: [
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 10 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_2', score: 10 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_3', score: 10 }),
        ],
      };
      const studentB = {
        ...singleStudent,
        id: studentId2,
        firstName: 'B',
        marks: [
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_1', score: 10 }),
          mark({ classSubjectId: csMathId, sequence: 'SEQUENCE_2', score: 10 }),
          mark({
            classSubjectId: csMathId,
            sequence: 'SEQUENCE_3',
            score: 10.01,
          }),
        ],
      };

      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [studentA, studentB],
          assignments: [mathAssignment],
        }),
      );

      const result = await service.getClassResults(classId);

      // Both display as 10.00, but B (10.0033) > A (10.0) unrounded
      expect(result.students.map((s) => s.firstName)).toEqual(['B', 'A']);
      expect(result.students.map((s) => s.generalAverage)).toEqual([10, 10]);
      expect(result.students.map((s) => s.rank)).toEqual([1, 2]);
    });

    it('never ranks students across different classes', async () => {
      const classA = {
        ...buildClassRecord({
          students: [
            {
              ...singleStudent,
              id: studentId1,
              marks: [
                mark({
                  classSubjectId: csMathId,
                  sequence: 'SEQUENCE_1',
                  score: 17,
                }),
                mark({
                  classSubjectId: csMathId,
                  sequence: 'SEQUENCE_2',
                  score: 17,
                }),
                mark({
                  classSubjectId: csMathId,
                  sequence: 'SEQUENCE_3',
                  score: 17,
                }),
              ],
            },
          ],
          assignments: [mathAssignment],
        }),
        id: 'class-a',
      };
      const classB = {
        ...buildClassRecord({
          students: [
            {
              ...singleStudent,
              id: studentId2,
              marks: [
                mark({
                  classSubjectId: csMathId,
                  sequence: 'SEQUENCE_1',
                  score: 13,
                }),
                mark({
                  classSubjectId: csMathId,
                  sequence: 'SEQUENCE_2',
                  score: 13,
                }),
                mark({
                  classSubjectId: csMathId,
                  sequence: 'SEQUENCE_3',
                  score: 13,
                }),
              ],
            },
          ],
          assignments: [mathAssignment],
        }),
        id: 'class-b',
      };

      prisma.class.findUnique
        .mockResolvedValueOnce(classA)
        .mockResolvedValueOnce(classB);

      const resultA = await service.getClassResults('class-a');
      const resultB = await service.getClassResults('class-b');

      expect(resultA.students[0].rank).toBe(1);
      expect(resultB.students[0].rank).toBe(1);
    });

    it('throws NotFoundException when the class is missing', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(service.getClassResults(classId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getStudentReport', () => {
    it('returns the report card for an existing student', async () => {
      prisma.student.findUnique.mockResolvedValue({
        id: studentId1,
        studentNumber: 'S001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        classId,
        class: {
          id: classId,
          name: 'Form 1',
          academicYearId,
        },
      });
      prisma.class.findUnique.mockResolvedValue(
        buildClassRecord({
          students: [singleStudent],
          assignments: [mathAssignment],
        }),
      );

      const report = await service.getStudentReport(studentId1);

      expect(report.student.id).toBe(studentId1);
      expect(report.student.studentNumber).toBe('S001');
      expect(report.class.id).toBe(classId);
      expect(report.academicYear.name).toBe('2026/2027');
      expect(report.subjectResults[0].subjectAverage).toBe(16);
      expect(report.generalAverage).toBe(16);
      expect(report.classRank).toBe(1);
      expect(report.performanceComment).toBe('Excellent');
      expect(report.isComplete).toBe(true);
    });

    it('throws NotFoundException when the student is missing', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.getStudentReport(studentId1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
