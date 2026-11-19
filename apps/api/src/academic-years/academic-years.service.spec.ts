import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AcademicYearsService } from './academic-years.service.js';

const uniqueConstraintError = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

const createPrismaMock = () => {
  const txAcademicYear = {
    updateMany: vi.fn(),
    update: vi.fn(),
  };

  return {
    academicYear: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    class: {
      count: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ academicYear: txAcademicYear }),
    ),
    _tx: txAcademicYear,
  };
};

const validDto = {
  name: '2024-2025',
  startDate: new Date('2024-09-01'),
  endDate: new Date('2025-06-30'),
};

const record = {
  id: 'a0f4a0f4-0000-4000-8000-000000000000',
  ...validDto,
  isActive: false,
  createdAt: new Date('2024-01-01'),
};

describe('AcademicYearsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AcademicYearsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AcademicYearsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates and returns an academic year', async () => {
      prisma.academicYear.create.mockResolvedValue(record);

      await expect(service.create(validDto)).resolves.toEqual(record);
      expect(prisma.academicYear.create).toHaveBeenCalledWith({
        data: {
          name: validDto.name,
          startDate: validDto.startDate,
          endDate: validDto.endDate,
        },
      });
    });

    it('throws ConflictException when the name already exists', async () => {
      prisma.academicYear.create.mockRejectedValue(uniqueConstraintError());

      await expect(service.create(validDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects when the end date is not later than the start date', async () => {
      await expect(
        service.create({
          name: 'Invalid',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-01'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.academicYear.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all academic years ordered by start date', async () => {
      prisma.academicYear.findMany.mockResolvedValue([record]);

      await expect(service.findAll()).resolves.toEqual([record]);
      expect(prisma.academicYear.findMany).toHaveBeenCalledWith({
        orderBy: { startDate: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns an academic year by ID', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(record);

      await expect(service.findOne(record.id)).resolves.toEqual(record);
    });

    it('throws NotFoundException when the academic year is missing', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);

      await expect(service.findOne(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates an existing academic year', async () => {
      const updated = { ...record, name: '2024-2025 (renamed)' };
      prisma.academicYear.findUnique.mockResolvedValue(record);
      prisma.academicYear.update.mockResolvedValue(updated);

      await expect(
        service.update(record.id, { name: '2024-2025 (renamed)' }),
      ).resolves.toEqual(updated);
      expect(prisma.academicYear.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: { name: '2024-2025 (renamed)' },
      });
    });

    it('throws NotFoundException when the academic year is missing', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);

      await expect(
        service.update(record.id, { name: 'Nope' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a partial update that makes the date range invalid', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(record);

      await expect(
        service.update(record.id, {
          endDate: new Date('2024-01-01'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when renaming to an existing name', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(record);
      prisma.academicYear.update.mockRejectedValue(uniqueConstraintError());

      await expect(
        service.update(record.id, { name: 'Existing' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes an academic year with no classes', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(record);
      prisma.class.count.mockResolvedValue(0);
      prisma.academicYear.delete.mockResolvedValue(record);

      await expect(service.remove(record.id)).resolves.toBeUndefined();
      expect(prisma.academicYear.delete).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });

    it('throws NotFoundException when the academic year is missing', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ConflictException when classes reference the academic year', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(record);
      prisma.class.count.mockResolvedValue(2);

      await expect(service.remove(record.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.academicYear.delete).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('deactivates the previous year and activates the target', async () => {
      const activated = { ...record, isActive: true };
      prisma.academicYear.findUnique.mockResolvedValue(record);
      prisma._tx.updateMany.mockResolvedValue({ count: 1 });
      prisma._tx.update.mockResolvedValue(activated);

      await expect(service.activate(record.id)).resolves.toEqual(activated);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma._tx.updateMany).toHaveBeenCalledWith({
        where: { isActive: true, NOT: { id: record.id } },
        data: { isActive: false },
      });
      expect(prisma._tx.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: { isActive: true },
      });
    });

    it('throws NotFoundException and does not open a transaction when the year is missing', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);

      await expect(service.activate(record.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
