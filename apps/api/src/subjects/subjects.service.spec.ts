import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { createSubjectSchema } from './dto/create-subject.dto.js';
import { SubjectsService } from './subjects.service.js';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Constraint failed', {
    code,
    clientVersion: 'test',
  });

const createPrismaMock = () => ({
  subject: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  classSubject: {
    count: vi.fn(),
  },
});

const subjectInclude = {
  classSubjects: { include: { class: true } },
};

const record = {
  id: 'a0f4a0f4-0000-4000-8000-000000000000',
  name: 'Mathematics',
  code: 'MATH',
  createdAt: new Date('2024-01-01'),
  classSubjects: [],
};

describe('createSubjectSchema', () => {
  it('trims whitespace', () => {
    expect(
      createSubjectSchema.parse({ name: '  Math  ', code: '  MATH  ' }),
    ).toEqual({ name: 'Math', code: 'MATH' });
  });

  it('rejects empty name or code', () => {
    expect(
      createSubjectSchema.safeParse({ name: '   ', code: 'MATH' }).success,
    ).toBe(false);
    expect(
      createSubjectSchema.safeParse({ name: 'Math', code: '   ' }).success,
    ).toBe(false);
  });
});

describe('SubjectsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SubjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SubjectsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a subject', async () => {
      prisma.subject.create.mockResolvedValue(record);

      await expect(
        service.create({ name: 'Mathematics', code: 'MATH' }),
      ).resolves.toEqual(record);
      expect(prisma.subject.create).toHaveBeenCalledWith({
        data: { name: 'Mathematics', code: 'MATH' },
        include: subjectInclude,
      });
    });

    it('throws ConflictException for a duplicate code', async () => {
      prisma.subject.create.mockRejectedValue(knownError('P2002'));

      await expect(
        service.create({ name: 'Mathematics', code: 'MATH' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('lists subjects in a predictable order with assigned classes', async () => {
      prisma.subject.findMany.mockResolvedValue([record]);

      await expect(service.findAll()).resolves.toEqual([record]);
      expect(prisma.subject.findMany).toHaveBeenCalledWith({
        include: subjectInclude,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('returns a subject by ID', async () => {
      prisma.subject.findUnique.mockResolvedValue(record);

      await expect(service.findOne(record.id)).resolves.toEqual(record);
    });

    it('throws NotFoundException when the subject is missing', async () => {
      prisma.subject.findUnique.mockResolvedValue(null);

      await expect(service.findOne(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a subject', async () => {
      const updated = { ...record, name: 'Mathematics II' };
      prisma.subject.findUnique.mockResolvedValue(record);
      prisma.subject.update.mockResolvedValue(updated);

      await expect(
        service.update(record.id, { name: 'Mathematics II' }),
      ).resolves.toEqual(updated);
      expect(prisma.subject.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: { name: 'Mathematics II' },
        include: subjectInclude,
      });
    });

    it('throws ConflictException for a duplicate code', async () => {
      prisma.subject.findUnique.mockResolvedValue(record);
      prisma.subject.update.mockRejectedValue(knownError('P2002'));

      await expect(
        service.update(record.id, { code: 'PHYS' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when the subject is missing', async () => {
      prisma.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.update(record.id, { name: 'Nope' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a subject that is not assigned to any class', async () => {
      prisma.subject.findUnique.mockResolvedValue(record);
      prisma.classSubject.count.mockResolvedValue(0);
      prisma.subject.delete.mockResolvedValue(record);

      await expect(service.remove(record.id)).resolves.toBeUndefined();
      expect(prisma.subject.delete).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });

    it('throws ConflictException when the subject is assigned to classes', async () => {
      prisma.subject.findUnique.mockResolvedValue(record);
      prisma.classSubject.count.mockResolvedValue(2);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subject.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the subject is missing', async () => {
      prisma.subject.findUnique.mockResolvedValue(null);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('maps a foreign key violation to ConflictException', async () => {
      prisma.subject.findUnique.mockResolvedValue(record);
      prisma.classSubject.count.mockResolvedValue(0);
      prisma.subject.delete.mockRejectedValue(knownError('P2003'));

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
