import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClassesService } from './classes.service.js';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Constraint failed', {
    code,
    clientVersion: 'test',
  });

const createPrismaMock = () => ({
  academicYear: {
    findUnique: vi.fn(),
  },
  class: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  student: {
    count: vi.fn(),
  },
  classSubject: {
    count: vi.fn(),
  },
});

const academicYear = {
  id: 'a0f4a0f4-0000-4000-8000-000000000000',
  name: '2024-2025',
};

const record = {
  id: 'b0f4a0f4-0000-4000-8000-000000000000',
  name: 'Grade 1',
  academicYearId: academicYear.id,
  createdAt: new Date('2024-01-01'),
  academicYear,
};

const validDto = {
  name: 'Grade 1',
  academicYearId: academicYear.id,
};

describe('ClassesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: ClassesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ClassesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a class inside an existing academic year', async () => {
      prisma.academicYear.findUnique.mockResolvedValue({
        id: academicYear.id,
      });
      prisma.class.create.mockResolvedValue(record);

      await expect(service.create(validDto)).resolves.toEqual(record);
      expect(prisma.class.create).toHaveBeenCalledWith({
        data: {
          name: validDto.name,
          academicYearId: validDto.academicYearId,
        },
        include: { academicYear: true },
      });
    });

    it('throws NotFoundException when the academic year does not exist', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.class.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate class name in the same year', async () => {
      prisma.academicYear.findUnique.mockResolvedValue({
        id: academicYear.id,
      });
      prisma.class.create.mockRejectedValue(knownError('P2002'));

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a foreign key violation to NotFoundException', async () => {
      prisma.academicYear.findUnique.mockResolvedValue({
        id: academicYear.id,
      });
      prisma.class.create.mockRejectedValue(knownError('P2003'));

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns classes with their academic year', async () => {
      prisma.class.findMany.mockResolvedValue([record]);

      await expect(service.findAll()).resolves.toEqual([record]);
      expect(prisma.class.findMany).toHaveBeenCalledWith({
        include: { academicYear: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns a class by ID with its academic year', async () => {
      prisma.class.findUnique.mockResolvedValue(record);

      await expect(service.findOne(record.id)).resolves.toEqual(record);
    });

    it('throws NotFoundException when the class is missing', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(service.findOne(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a class without changing the academic year', async () => {
      const updated = { ...record, name: 'Grade 1A' };
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.class.update.mockResolvedValue(updated);

      await expect(
        service.update(record.id, { name: 'Grade 1A' }),
      ).resolves.toEqual(updated);
      expect(prisma.academicYear.findUnique).not.toHaveBeenCalled();
      expect(prisma.class.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: { name: 'Grade 1A' },
        include: { academicYear: true },
      });
    });

    it('validates the target academic year when moving the class', async () => {
      const otherYearId = 'c0f4a0f4-0000-4000-8000-000000000000';
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.academicYear.findUnique.mockResolvedValue({
        id: otherYearId,
      });
      prisma.class.update.mockResolvedValue({
        ...record,
        academicYearId: otherYearId,
      });

      await expect(
        service.update(record.id, { academicYearId: otherYearId }),
      ).resolves.toEqual({ ...record, academicYearId: otherYearId });
      expect(prisma.academicYear.findUnique).toHaveBeenCalledWith({
        where: { id: otherYearId },
        select: { id: true },
      });
    });

    it('throws NotFoundException when the class is missing', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.update(record.id, { name: 'Nope' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the target academic year is missing', async () => {
      const otherYearId = 'c0f4a0f4-0000-4000-8000-000000000000';
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.academicYear.findUnique.mockResolvedValue(null);

      await expect(
        service.update(record.id, { academicYearId: otherYearId }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate class name in the same year', async () => {
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.class.update.mockRejectedValue(knownError('P2002'));

      await expect(
        service.update(record.id, { name: 'Existing' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes a class with no dependents', async () => {
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.student.count.mockResolvedValue(0);
      prisma.classSubject.count.mockResolvedValue(0);
      prisma.class.delete.mockResolvedValue(record);

      await expect(service.remove(record.id)).resolves.toBeUndefined();
      expect(prisma.class.delete).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });

    it('throws ConflictException when the class has students', async () => {
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.student.count.mockResolvedValue(1);
      prisma.classSubject.count.mockResolvedValue(0);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.class.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the class has class subjects', async () => {
      prisma.class.findUnique.mockResolvedValue(record);
      prisma.student.count.mockResolvedValue(0);
      prisma.classSubject.count.mockResolvedValue(3);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.class.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the class is missing', async () => {
      prisma.class.findUnique.mockResolvedValue(null);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
