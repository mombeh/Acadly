import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto.js';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto.js';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcademicYearDto) {
    this.assertDateRange(dto.startDate, dto.endDate);

    try {
      return await this.prisma.academicYear.create({
        data: {
          name: dto.name,
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
      });
    } catch (error) {
      this.rethrowKnownError(error, dto.name);
    }
  }

  findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!academicYear) {
      throw new NotFoundException(`Academic year with ID "${id}" not found`);
    }

    return academicYear;
  }

  async update(id: string, dto: UpdateAcademicYearDto) {
    const existing = await this.findOne(id);

    const startDate = dto.startDate ?? existing.startDate;
    const endDate = dto.endDate ?? existing.endDate;
    this.assertDateRange(startDate, endDate);

    const data: Prisma.AcademicYearUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate;
    }
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate;
    }

    try {
      return await this.prisma.academicYear.update({ where: { id }, data });
    } catch (error) {
      this.rethrowKnownError(error, dto.name ?? existing.name);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const classes = await this.prisma.class.count({
      where: { academicYearId: id },
    });

    if (classes > 0) {
      throw new ConflictException(
        'Cannot delete an academic year that has classes associated with it',
      );
    }

    try {
      await this.prisma.academicYear.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete an academic year that is referenced by other records',
        );
      }
      throw error;
    }
  }

  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      });

      return tx.academicYear.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  private assertDateRange(startDate: Date, endDate: Date): void {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Start date and end date must be valid dates',
      );
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be later than start date');
    }
  }

  private rethrowKnownError(error: unknown, name: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `An academic year named "${name}" already exists`,
      );
    }

    throw error;
  }
}
