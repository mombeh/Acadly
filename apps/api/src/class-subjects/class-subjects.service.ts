import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto.js';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto.js';

const assignmentInclude = {
  class: true,
  subject: true,
} satisfies Prisma.ClassSubjectInclude;

@Injectable()
export class ClassSubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(classId: string, dto: CreateClassSubjectDto) {
    await this.assertClassExists(classId);
    await this.assertSubjectExists(dto.subjectId);

    try {
      return await this.prisma.classSubject.create({
        data: {
          classId,
          subjectId: dto.subjectId,
          coefficient: new Prisma.Decimal(dto.coefficient),
        },
        include: assignmentInclude,
      });
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(classId: string) {
    await this.assertClassExists(classId);

    return this.prisma.classSubject.findMany({
      where: { classId },
      include: assignmentInclude,
      orderBy: { subject: { name: 'asc' } },
    });
  }

  async update(
    classId: string,
    classSubjectId: string,
    dto: UpdateClassSubjectDto,
  ) {
    const assignment = await this.findAssignment(classId, classSubjectId);

    const marks = await this.prisma.mark.count({
      where: { classSubjectId },
    });

    if (marks > 0) {
      throw new ConflictException(
        'Cannot change the coefficient of a class subject that already has marks',
      );
    }

    return this.prisma.classSubject.update({
      where: { id: assignment.id },
      data: { coefficient: new Prisma.Decimal(dto.coefficient) },
      include: assignmentInclude,
    });
  }

  async remove(classId: string, classSubjectId: string): Promise<void> {
    const assignment = await this.findAssignment(classId, classSubjectId);

    const marks = await this.prisma.mark.count({
      where: { classSubjectId },
    });

    if (marks > 0) {
      throw new ConflictException(
        'Cannot remove a class subject that already has marks',
      );
    }

    try {
      await this.prisma.classSubject.delete({
        where: { id: assignment.id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot remove a class subject that is referenced by other records',
        );
      }
      throw error;
    }
  }

  private async findAssignment(classId: string, classSubjectId: string) {
    const assignment = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: assignmentInclude,
    });

    if (!assignment || assignment.classId !== classId) {
      throw new NotFoundException(
        `Class subject assignment with ID "${classSubjectId}" not found for class "${classId}"`,
      );
    }

    return assignment;
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

  private async assertSubjectExists(subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID "${subjectId}" not found`);
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This subject is already assigned to the class',
        );
      }

      if (error.code === 'P2003') {
        throw new NotFoundException(
          'The referenced class or subject does not exist',
        );
      }
    }

    throw error;
  }
}
