import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClassSubjectsService } from './class-subjects.service.js';
import { createClassSubjectSchema } from './dto/create-class-subject.dto.js';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Constraint failed', {
    code,
    clientVersion: 'test',
  });

const createPrismaMock = () => ({
  class: {
    findUnique: vi.fn(),
  },
  subject: {
    findUnique: vi.fn(),
  },
  classSubject: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mark: {
    count: vi.fn(),
  },
});

const assignmentInclude = {
  class: true,
  subject: true,
};

const classRecord = {
  id: 'a0f4a0f4-0000-4000-8000-000000000000',
  name: 'Grade 1',
};

const subjectRecord = {
  id: 'c0f4a0f4-0000-4000-8000-000000000000',
  name: 'Mathematics',
  code: 'MATH',
};

const record = {
  id: 'b0f4a0f4-0000-4000-8000-000000000000',
  classId: classRecord.id,
  subjectId: subjectRecord.id,
  coefficient: new Prisma.Decimal('2.5'),
  class: classRecord,
  subject: subjectRecord,
};

type UpdateArgs = {
  data: { coefficient: Prisma.Decimal };
};

describe('createClassSubjectSchema', () => {
  it('accepts a positive coefficient', () => {
    expect(
      createClassSubjectSchema.safeParse({
        subjectId: subjectRecord.id,
        coefficient: 2.5,
      }).success,
    ).toBe(true);
  });

  it('rejects zero, negative and non-numeric coefficients', () => {
    for (const coefficient of [0, -1, 'abc']) {
      expect(
        createClassSubjectSchema.safeParse({
          subjectId: subjectRecord.id,
          coefficient,
        }).success,
      ).toBe(false);
    }
  });
});

describe('ClassSubjectsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ClassSubjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ClassSubjectsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('assigns a subject to a class with a Decimal coefficient', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.subject.findUnique.mockResolvedValue({
        id: subjectRecord.id,
      });
      prisma.classSubject.create.mockResolvedValue(record);

      await expect(
        service.create(classRecord.id, {
          subjectId: subjectRecord.id,
          coefficient: 2.5,
        }),
      ).resolves.toEqual(record);

      const args = prisma.classSubject.create.mock.calls[0][0] as {
        data: { coefficient: Prisma.Decimal };
      };
      expect(Prisma.Decimal.isDecimal(args.data.coefficient)).toBe(true);
      expect(args.data.coefficient.equals(2.5)).toBe(true);
      expect(prisma.classSubject.create).toHaveBeenCalledWith({
        data: {
          classId: classRecord.id,
          subjectId: subjectRecord.id,
          coefficient: args.data.coefficient,
        },
        include: assignmentInclude,
      });
    });

    it('throws NotFoundException when the class does not exist', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.create(classRecord.id, {
          subjectId: subjectRecord.id,
          coefficient: 2.5,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.classSubject.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the subject does not exist', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.create(classRecord.id, {
          subjectId: subjectRecord.id,
          coefficient: 2.5,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.classSubject.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate assignment', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.subject.findUnique.mockResolvedValue({
        id: subjectRecord.id,
      });
      prisma.classSubject.create.mockRejectedValue(knownError('P2002'));

      await expect(
        service.create(classRecord.id, {
          subjectId: subjectRecord.id,
          coefficient: 2.5,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('maps a foreign key violation to NotFoundException', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.subject.findUnique.mockResolvedValue({
        id: subjectRecord.id,
      });
      prisma.classSubject.create.mockRejectedValue(knownError('P2003'));

      await expect(
        service.create(classRecord.id, {
          subjectId: subjectRecord.id,
          coefficient: 2.5,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('lists assignments for a class with subject and class info', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.classSubject.findMany.mockResolvedValue([record]);

      await expect(service.findAll(classRecord.id)).resolves.toEqual([record]);
      expect(prisma.classSubject.findMany).toHaveBeenCalledWith({
        where: { classId: classRecord.id },
        include: assignmentInclude,
        orderBy: { subject: { name: 'asc' } },
      });
    });

    it('throws NotFoundException when the class does not exist', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(service.findAll(classRecord.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.classSubject.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the coefficient when no marks exist', async () => {
      const updated = {
        ...record,
        coefficient: new Prisma.Decimal('3.5'),
      };
      prisma.classSubject.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(0);
      prisma.classSubject.update.mockResolvedValue(updated);

      await expect(
        service.update(classRecord.id, record.id, { coefficient: 3.5 }),
      ).resolves.toEqual(updated);

      const args = prisma.classSubject.update.mock.calls[0][0] as UpdateArgs;
      expect(Prisma.Decimal.isDecimal(args.data.coefficient)).toBe(true);
      expect(args.data.coefficient.equals(3.5)).toBe(true);
    });

    it('rejects a coefficient change when marks exist', async () => {
      prisma.classSubject.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(2);

      await expect(
        service.update(classRecord.id, record.id, { coefficient: 3.5 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.classSubject.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the assignment is missing', async () => {
      prisma.classSubject.findUnique.mockResolvedValue(null);

      await expect(
        service.update(classRecord.id, record.id, { coefficient: 3.5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the assignment belongs to another class', async () => {
      prisma.classSubject.findUnique.mockResolvedValue({
        ...record,
        classId: 'd0f4a0f4-0000-4000-8000-000000000000',
      });

      await expect(
        service.update(classRecord.id, record.id, { coefficient: 3.5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mark.count).not.toHaveBeenCalled();
      expect(prisma.classSubject.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes an assignment with no marks', async () => {
      prisma.classSubject.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(0);
      prisma.classSubject.delete.mockResolvedValue(record);

      await expect(
        service.remove(classRecord.id, record.id),
      ).resolves.toBeUndefined();
      expect(prisma.classSubject.delete).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });

    it('rejects removal when marks exist', async () => {
      prisma.classSubject.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(1);

      await expect(
        service.remove(classRecord.id, record.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.classSubject.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the assignment is missing', async () => {
      prisma.classSubject.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(classRecord.id, record.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the assignment belongs to another class', async () => {
      prisma.classSubject.findUnique.mockResolvedValue({
        ...record,
        classId: 'd0f4a0f4-0000-4000-8000-000000000000',
      });

      await expect(
        service.remove(classRecord.id, record.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mark.count).not.toHaveBeenCalled();
    });

    it('maps a foreign key violation to ConflictException', async () => {
      prisma.classSubject.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(0);
      prisma.classSubject.delete.mockRejectedValue(knownError('P2003'));

      await expect(
        service.remove(classRecord.id, record.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
