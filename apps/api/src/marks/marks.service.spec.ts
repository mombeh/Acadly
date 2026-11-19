import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { bulkMarksSchema, sequenceSchema } from './dto/bulk-marks.dto.js';
import { MarksService } from './marks.service.js';

const createPrismaMock = () => ({
  class: {
    findUnique: vi.fn(),
  },
  classSubject: {
    findUnique: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
  mark: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  ),
});

const classId = 'a0f4a0f4-0000-4000-8000-000000000000';
const classSubjectId = 'b0f4a0f4-0000-4000-8000-000000000000';
const studentId1 = 'c0f4a0f4-0000-4000-8000-000000000000';
const studentId2 = 'd0f4a0f4-0000-4000-8000-000000000000';
const markId = 'e0f4a0f4-0000-4000-8000-000000000000';

const savedMark = {
  id: markId,
  studentId: studentId1,
  classSubjectId,
  sequence: 'SEQUENCE_1' as const,
  score: new Prisma.Decimal('15.5'),
  student: { id: studentId1, firstName: 'Ada', lastName: 'Lovelace' },
  classSubject: { id: classSubjectId },
};

type UpsertArgs = {
  where: {
    studentId_classSubjectId_sequence: {
      studentId: string;
      classSubjectId: string;
      sequence: string;
    };
  };
  create: { score: Prisma.Decimal };
  update: { score: Prisma.Decimal };
};

describe('mark schemas', () => {
  it('accepts the three supported sequences only', () => {
    for (const sequence of ['SEQUENCE_1', 'SEQUENCE_2', 'SEQUENCE_3']) {
      expect(sequenceSchema.safeParse(sequence).success).toBe(true);
    }
    expect(sequenceSchema.safeParse('SEQUENCE_4').success).toBe(false);
    expect(sequenceSchema.safeParse('sequence_1').success).toBe(false);
  });

  it('rejects scores below 0 or above 20', () => {
    const base = {
      sequence: 'SEQUENCE_1',
      marks: [{ studentId: studentId1, score: 0 }],
    };

    expect(bulkMarksSchema.safeParse(base).success).toBe(true);
    expect(
      bulkMarksSchema.safeParse({
        ...base,
        marks: [{ studentId: studentId1, score: -0.5 }],
      }).success,
    ).toBe(false);
    expect(
      bulkMarksSchema.safeParse({
        ...base,
        marks: [{ studentId: studentId1, score: 20.5 }],
      }).success,
    ).toBe(false);
  });

  it('accepts decimal scores', () => {
    expect(
      bulkMarksSchema.safeParse({
        sequence: 'SEQUENCE_1',
        marks: [{ studentId: studentId1, score: 15.75 }],
      }).success,
    ).toBe(true);
  });
});

describe('MarksService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MarksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MarksService(prisma as unknown as PrismaService);
  });

  describe('findClassMarks', () => {
    it('returns the full roster with marks and nulls for missing marks', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classId });
      prisma.classSubject.findUnique.mockResolvedValue({
        id: classSubjectId,
        classId,
      });
      prisma.student.findMany.mockResolvedValue([
        {
          id: studentId1,
          studentNumber: 'S001',
          firstName: 'Ada',
          lastName: 'Lovelace',
          marks: [{ id: markId, score: new Prisma.Decimal('15.5') }],
        },
        {
          id: studentId2,
          studentNumber: 'S002',
          firstName: 'Alan',
          lastName: 'Turing',
          marks: [],
        },
      ]);

      const result = await service.findClassMarks(
        classId,
        classSubjectId,
        'SEQUENCE_1',
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        studentId: studentId1,
        studentNumber: 'S001',
        markId,
      });
      expect((result[0].score as Prisma.Decimal).equals(15.5)).toBe(true);
      expect(result[1]).toEqual({
        studentId: studentId2,
        studentNumber: 'S002',
        firstName: 'Alan',
        lastName: 'Turing',
        markId: null,
        score: null,
      });
    });

    it('throws NotFoundException when the class is missing', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.findClassMarks(classId, classSubjectId, 'SEQUENCE_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the assignment is missing', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classId });
      prisma.classSubject.findUnique.mockResolvedValue(null);

      await expect(
        service.findClassMarks(classId, classSubjectId, 'SEQUENCE_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.student.findMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the assignment belongs to another class', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classId });
      prisma.classSubject.findUnique.mockResolvedValue({
        id: classSubjectId,
        classId: 'other-class-id',
      });

      await expect(
        service.findClassMarks(classId, classSubjectId, 'SEQUENCE_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.student.findMany).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpsert', () => {
    const dto = {
      sequence: 'SEQUENCE_1' as const,
      marks: [
        { studentId: studentId1, score: 15.5 },
        { studentId: studentId2, score: 12 },
      ],
    };

    beforeEach(() => {
      prisma.class.findUnique.mockResolvedValue({ id: classId });
      prisma.classSubject.findUnique.mockResolvedValue({
        id: classSubjectId,
        classId,
      });
      prisma.student.findMany.mockResolvedValue([
        { id: studentId1 },
        { id: studentId2 },
      ]);
      prisma.mark.upsert.mockResolvedValue(savedMark);
    });

    it('upserts every supplied mark in a single transaction', async () => {
      const result = await service.bulkUpsert(classId, classSubjectId, dto);

      expect(result).toHaveLength(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.mark.upsert).toHaveBeenCalledTimes(2);

      const args = prisma.mark.upsert.mock.calls[0][0] as UpsertArgs;
      expect(args.where.studentId_classSubjectId_sequence).toEqual({
        studentId: studentId1,
        classSubjectId,
        sequence: 'SEQUENCE_1',
      });
      expect(Prisma.Decimal.isDecimal(args.create.score)).toBe(true);
      expect(args.create.score.equals(15.5)).toBe(true);
    });

    it('provides an update branch so existing marks are updated', async () => {
      await service.bulkUpsert(classId, classSubjectId, {
        sequence: 'SEQUENCE_1',
        marks: [{ studentId: studentId1, score: 18.25 }],
      });

      prisma.student.findMany.mockResolvedValue([{ id: studentId1 }]);
      const args = prisma.mark.upsert.mock.calls[0][0] as UpsertArgs;
      expect(Prisma.Decimal.isDecimal(args.update.score)).toBe(true);
      expect(args.update.score.equals(18.25)).toBe(true);
    });

    it('rejects a score outside 0..20 before writing', () => {
      expect(
        bulkMarksSchema.safeParse({
          sequence: 'SEQUENCE_1',
          marks: [{ studentId: studentId1, score: 21 }],
        }).success,
      ).toBe(false);
    });

    it('rejects duplicate student IDs in the same request', async () => {
      await expect(
        service.bulkUpsert(classId, classSubjectId, {
          sequence: 'SEQUENCE_1',
          marks: [
            { studentId: studentId1, score: 10 },
            { studentId: studentId1, score: 12 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a student who does not belong to the class', async () => {
      prisma.student.findMany.mockResolvedValue([{ id: studentId1 }]);

      await expect(
        service.bulkUpsert(classId, classSubjectId, dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.mark.upsert).not.toHaveBeenCalled();
    });

    it('does not create marks for omitted students', async () => {
      await service.bulkUpsert(classId, classSubjectId, {
        sequence: 'SEQUENCE_1',
        marks: [{ studentId: studentId1, score: 15.5 }],
      });

      expect(prisma.mark.upsert).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the assignment belongs to another class', async () => {
      prisma.classSubject.findUnique.mockResolvedValue({
        id: classSubjectId,
        classId: 'other-class-id',
      });

      await expect(
        service.bulkUpsert(classId, classSubjectId, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a mark with student, class and subject info', async () => {
      prisma.mark.findUnique.mockResolvedValue(savedMark);

      await expect(service.findOne(markId)).resolves.toEqual(savedMark);
      expect(prisma.mark.findUnique).toHaveBeenCalledWith({
        where: { id: markId },
        include: {
          student: true,
          classSubject: {
            include: { class: true, subject: true },
          },
        },
      });
    });

    it('throws NotFoundException when the mark is missing', async () => {
      prisma.mark.findUnique.mockResolvedValue(null);

      await expect(service.findOne(markId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates the score with a Decimal value', async () => {
      const updated = {
        ...savedMark,
        score: new Prisma.Decimal('18'),
      };
      prisma.mark.findUnique.mockResolvedValue(savedMark);
      prisma.mark.update.mockResolvedValue(updated);

      await expect(service.update(markId, { score: 18 })).resolves.toEqual(
        updated,
      );

      const args = prisma.mark.update.mock.calls[0][0] as {
        data: { score: Prisma.Decimal };
      };
      expect(Prisma.Decimal.isDecimal(args.data.score)).toBe(true);
      expect(args.data.score.equals(18)).toBe(true);
    });

    it('throws NotFoundException when the mark is missing', async () => {
      prisma.mark.findUnique.mockResolvedValue(null);

      await expect(
        service.update(markId, { score: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mark.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing mark', async () => {
      prisma.mark.findUnique.mockResolvedValue(savedMark);
      prisma.mark.delete.mockResolvedValue(savedMark);

      await expect(service.remove(markId)).resolves.toBeUndefined();
      expect(prisma.mark.delete).toHaveBeenCalledWith({
        where: { id: markId },
      });
    });

    it('throws NotFoundException when the mark is missing', async () => {
      prisma.mark.findUnique.mockResolvedValue(null);

      await expect(service.remove(markId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.mark.delete).not.toHaveBeenCalled();
    });
  });
});
