import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { createStudentSchema } from './dto/create-student.dto.js';
import { StudentsService } from './students.service.js';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Constraint failed', {
    code,
    clientVersion: 'test',
  });

const createPrismaMock = () => ({
  class: {
    findUnique: vi.fn(),
  },
  student: {
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

const classRecord = {
  id: 'a0f4a0f4-0000-4000-8000-000000000000',
  name: 'Grade 1',
};

const record = {
  id: 'b0f4a0f4-0000-4000-8000-000000000000',
  studentNumber: 'S001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  classId: classRecord.id,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  class: classRecord,
};

const validDto = {
  studentNumber: 'S001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  classId: classRecord.id,
};

describe('createStudentSchema', () => {
  it('accepts a valid payload and trims whitespace', () => {
    const parsed = createStudentSchema.parse({
      studentNumber: '  S001  ',
      firstName: '  Ada  ',
      lastName: '  Lovelace  ',
      classId: classRecord.id,
    });

    expect(parsed).toEqual({
      studentNumber: 'S001',
      firstName: 'Ada',
      lastName: 'Lovelace',
      classId: classRecord.id,
    });
  });

  it('rejects missing required fields', () => {
    const result = createStudentSchema.safeParse({
      studentNumber: 'S001',
      firstName: 'Ada',
      classId: classRecord.id,
    });

    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only names', () => {
    const result = createStudentSchema.safeParse({
      studentNumber: 'S001',
      firstName: '   ',
      lastName: 'Lovelace',
      classId: classRecord.id,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid class ID', () => {
    const result = createStudentSchema.safeParse({
      studentNumber: 'S001',
      firstName: 'Ada',
      lastName: 'Lovelace',
      classId: 'not-a-uuid',
    });

    expect(result.success).toBe(false);
  });
});

describe('StudentsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: StudentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new StudentsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a student in an existing class', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.student.create.mockResolvedValue(record);

      await expect(service.create(validDto)).resolves.toEqual(record);
      expect(prisma.student.create).toHaveBeenCalledWith({
        data: {
          studentNumber: validDto.studentNumber,
          firstName: validDto.firstName,
          lastName: validDto.lastName,
          class: { connect: { id: validDto.classId } },
        },
        include: { class: true },
      });
    });

    it('throws ConflictException for a duplicate student number', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.student.create.mockRejectedValue(knownError('P2002'));

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFoundException when the class does not exist', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('maps a foreign key violation to NotFoundException', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: classRecord.id });
      prisma.student.create.mockRejectedValue(knownError('P2003'));

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('lists students ordered by last name then first name', async () => {
      prisma.student.findMany.mockResolvedValue([record]);

      await expect(service.findAll()).resolves.toEqual([record]);
      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { class: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    });

    it('filters students by class', async () => {
      prisma.student.findMany.mockResolvedValue([record]);

      await expect(service.findAll(classRecord.id)).resolves.toEqual([record]);
      expect(prisma.student.findMany).toHaveBeenCalledWith({
        where: { classId: classRecord.id },
        include: { class: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('returns a student by ID with their class', async () => {
      prisma.student.findUnique.mockResolvedValue(record);

      await expect(service.findOne(record.id)).resolves.toEqual(record);
    });

    it('throws NotFoundException when the student is missing', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.findOne(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates student information', async () => {
      const updated = { ...record, firstName: 'Grace' };
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.student.update.mockResolvedValue(updated);

      await expect(
        service.update(record.id, { firstName: 'Grace' }),
      ).resolves.toEqual(updated);
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: { firstName: 'Grace' },
        include: { class: true },
      });
      expect(prisma.mark.count).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate student number', async () => {
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.student.update.mockRejectedValue(knownError('P2002'));

      await expect(
        service.update(record.id, { studentNumber: 'S999' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('moves a student without marks to another class', async () => {
      const otherClassId = 'c0f4a0f4-0000-4000-8000-000000000000';
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.class.findUnique.mockResolvedValue({ id: otherClassId });
      prisma.mark.count.mockResolvedValue(0);
      prisma.student.update.mockResolvedValue({
        ...record,
        classId: otherClassId,
      });

      await expect(
        service.update(record.id, { classId: otherClassId }),
      ).resolves.toEqual({ ...record, classId: otherClassId });
      expect(prisma.mark.count).toHaveBeenCalledWith({
        where: { studentId: record.id },
      });
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: { class: { connect: { id: otherClassId } } },
        include: { class: true },
      });
    });

    it('rejects a class change when the student already has marks', async () => {
      const otherClassId = 'c0f4a0f4-0000-4000-8000-000000000000';
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.class.findUnique.mockResolvedValue({ id: otherClassId });
      prisma.mark.count.mockResolvedValue(2);

      await expect(
        service.update(record.id, { classId: otherClassId }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the student is missing', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(
        service.update(record.id, { firstName: 'Grace' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the new class does not exist', async () => {
      const otherClassId = 'c0f4a0f4-0000-4000-8000-000000000000';
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.update(record.id, { classId: otherClassId }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.student.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a student without marks', async () => {
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(0);
      prisma.student.delete.mockResolvedValue(record);

      await expect(service.remove(record.id)).resolves.toBeUndefined();
      expect(prisma.student.delete).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });

    it('throws ConflictException when the student has marks', async () => {
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(1);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.student.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the student is missing', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('maps a foreign key violation to ConflictException', async () => {
      prisma.student.findUnique.mockResolvedValue(record);
      prisma.mark.count.mockResolvedValue(0);
      prisma.student.delete.mockRejectedValue(knownError('P2003'));

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
