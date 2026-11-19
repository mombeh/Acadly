import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    await this.assertClassExists(dto.classId);

    try {
      return await this.prisma.student.create({
        data: {
          studentNumber: dto.studentNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          class: { connect: { id: dto.classId } },
        },
        include: { class: true },
      });
    } catch (error) {
      this.rethrowKnownError(error, dto.studentNumber);
    }
  }

  findAll(classId?: string) {
    return this.prisma.student.findMany({
      where: classId ? { classId } : undefined,
      include: { class: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.findOne(id);

    const data: Prisma.StudentUpdateInput = {};
    if (dto.studentNumber !== undefined) {
      data.studentNumber = dto.studentNumber;
    }
    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }

    if (dto.classId !== undefined && dto.classId !== existing.classId) {
      await this.assertClassExists(dto.classId);

      const marks = await this.prisma.mark.count({
        where: { studentId: id },
      });

      if (marks > 0) {
        throw new ConflictException(
          'Cannot change the class of a student who already has marks',
        );
      }

      data.class = { connect: { id: dto.classId } };
    }

    try {
      return await this.prisma.student.update({
        where: { id },
        data,
        include: { class: true },
      });
    } catch (error) {
      this.rethrowKnownError(
        error,
        dto.studentNumber ?? existing.studentNumber,
      );
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const marks = await this.prisma.mark.count({
      where: { studentId: id },
    });

    if (marks > 0) {
      throw new ConflictException('Cannot delete a student who has marks');
    }

    try {
      await this.prisma.student.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a student that is referenced by other records',
        );
      }
      throw error;
    }
  }

  private async assertClassExists(classId: string): Promise<void> {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with ID "${classId}" not found`);
    }
  }

  private rethrowKnownError(error: unknown, studentNumber: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `A student with number "${studentNumber}" already exists`,
        );
      }

      if (error.code === 'P2003') {
        throw new NotFoundException('The referenced class does not exist');
      }
    }

    throw error;
  }
}
