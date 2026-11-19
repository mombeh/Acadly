import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BulkMarksDto, MarkSequence } from './dto/bulk-marks.dto.js';
import { UpdateMarkDto } from './dto/update-mark.dto.js';

const markInclude = {
  student: true,
  classSubject: { include: { class: true, subject: true } },
} satisfies Prisma.MarkInclude;

@Injectable()
export class MarksService {
  constructor(private readonly prisma: PrismaService) {}

  async findClassMarks(
    classId: string,
    classSubjectId: string,
    sequence: MarkSequence,
  ) {
    await this.assertClassExists(classId);
    await this.assertAssignmentBelongsToClass(classId, classSubjectId);

    const students = await this.prisma.student.findMany({
      where: { classId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        lastName: true,
        marks: {
          where: { classSubjectId, sequence },
          select: { id: true, score: true },
          take: 1,
        },
      },
    });

    return students.map((student) => ({
      studentId: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      markId: student.marks[0]?.id ?? null,
      score: student.marks[0]?.score ?? null,
    }));
  }

  async bulkUpsert(classId: string, classSubjectId: string, dto: BulkMarksDto) {
    await this.assertClassExists(classId);
    await this.assertAssignmentBelongsToClass(classId, classSubjectId);
    this.assertNoDuplicateStudents(dto);

    const studentIds = dto.marks.map((mark) => mark.studentId);

    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, classId },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException(
        'One or more students do not belong to the specified class',
      );
    }

    try {
      return await this.prisma.$transaction(
        dto.marks.map((mark) =>
          this.prisma.mark.upsert({
            where: {
              studentId_classSubjectId_sequence: {
                studentId: mark.studentId,
                classSubjectId,
                sequence: dto.sequence,
              },
            },
            create: {
              studentId: mark.studentId,
              classSubjectId,
              sequence: dto.sequence,
              score: new Prisma.Decimal(mark.score),
            },
            update: { score: new Prisma.Decimal(mark.score) },
            include: markInclude,
          }),
        ),
      );
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findOne(id: string) {
    const mark = await this.prisma.mark.findUnique({
      where: { id },
      include: markInclude,
    });

    if (!mark) {
      throw new NotFoundException(`Mark with ID "${id}" not found`);
    }

    return mark;
  }

  async update(id: string, dto: UpdateMarkDto) {
    await this.findOne(id);

    return this.prisma.mark.update({
      where: { id },
      data: { score: new Prisma.Decimal(dto.score) },
      include: markInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    try {
      await this.prisma.mark.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a mark that is referenced by other records',
        );
      }
      throw error;
    }
  }

  private assertNoDuplicateStudents(dto: BulkMarksDto): void {
    const studentIds = dto.marks.map((mark) => mark.studentId);

    if (new Set(studentIds).size !== studentIds.length) {
      throw new BadRequestException(
        'Duplicate student IDs are not allowed in the same request',
      );
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

  private async assertAssignmentBelongsToClass(
    classId: string,
    classSubjectId: string,
  ): Promise<void> {
    const assignment = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      select: { id: true, classId: true },
    });

    if (!assignment || assignment.classId !== classId) {
      throw new NotFoundException(
        `Class subject assignment with ID "${classSubjectId}" not found for class "${classId}"`,
      );
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A mark for this student, class subject and sequence already exists',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid student or class subject reference',
        );
      }
    }

    throw error;
  }
}
