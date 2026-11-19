import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';

const subjectInclude = {
  classSubjects: {
    include: { class: true },
  },
} satisfies Prisma.SubjectInclude;

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    try {
      return await this.prisma.subject.create({
        data: { name: dto.name, code: dto.code },
        include: subjectInclude,
      });
    } catch (error) {
      this.rethrowKnownError(error, dto.code);
    }
  }

  findAll() {
    return this.prisma.subject.findMany({
      include: subjectInclude,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: subjectInclude,
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID "${id}" not found`);
    }

    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const existing = await this.findOne(id);

    const data: Prisma.SubjectUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.code !== undefined) {
      data.code = dto.code;
    }

    try {
      return await this.prisma.subject.update({
        where: { id },
        data,
        include: subjectInclude,
      });
    } catch (error) {
      this.rethrowKnownError(error, dto.code ?? existing.code);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const assignments = await this.prisma.classSubject.count({
      where: { subjectId: id },
    });

    if (assignments > 0) {
      throw new ConflictException(
        'Cannot delete a subject that is assigned to one or more classes',
      );
    }

    try {
      await this.prisma.subject.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a subject that is referenced by other records',
        );
      }
      throw error;
    }
  }

  private rethrowKnownError(error: unknown, code: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `A subject with code "${code}" already exists`,
      );
    }

    throw error;
  }
}
