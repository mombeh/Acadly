import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    await this.assertAcademicYearExists(dto.academicYearId);

    try {
      return await this.prisma.class.create({
        data: {
          name: dto.name,
          academicYearId: dto.academicYearId,
        },
        include: { academicYear: true },
      });
    } catch (error) {
      this.rethrowKnownError(error, dto.name);
    }
  }

  findAll() {
    return this.prisma.class.findMany({
      include: { academicYear: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }

    return classRecord;
  }

  async update(id: string, dto: UpdateClassDto) {
    const existing = await this.findOne(id);

    if (
      dto.academicYearId !== undefined &&
      dto.academicYearId !== existing.academicYearId
    ) {
      await this.assertAcademicYearExists(dto.academicYearId);
    }

    const data: Prisma.ClassUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.academicYearId !== undefined) {
      data.academicYear = { connect: { id: dto.academicYearId } };
    }

    try {
      return await this.prisma.class.update({
        where: { id },
        data,
        include: { academicYear: true },
      });
    } catch (error) {
      this.rethrowKnownError(error, dto.name ?? existing.name);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const [students, classSubjects] = await Promise.all([
      this.prisma.student.count({ where: { classId: id } }),
      this.prisma.classSubject.count({ where: { classId: id } }),
    ]);

    if (students > 0 || classSubjects > 0) {
      throw new ConflictException(
        'Cannot delete a class that has students or class subjects associated with it',
      );
    }

    try {
      await this.prisma.class.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a class that is referenced by other records',
        );
      }
      throw error;
    }
  }

  private async assertAcademicYearExists(
    academicYearId: string,
  ): Promise<void> {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new NotFoundException(
        `Academic year with ID "${academicYearId}" not found`,
      );
    }
  }

  private rethrowKnownError(error: unknown, name: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `A class named "${name}" already exists in this academic year`,
        );
      }

      if (error.code === 'P2003') {
        throw new NotFoundException(
          'The referenced academic year does not exist',
        );
      }
    }

    throw error;
  }
}
