import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { ClassSubjectsService } from './class-subjects.service.js';
import { createClassSubjectSchema } from './dto/create-class-subject.dto.js';
import type { CreateClassSubjectDto } from './dto/create-class-subject.dto.js';
import { updateClassSubjectSchema } from './dto/update-class-subject.dto.js';
import type { UpdateClassSubjectDto } from './dto/update-class-subject.dto.js';

const idSchema = z.uuid('ID must be a valid UUID');

@Controller('classes/:classId/subjects')
export class ClassSubjectsController {
  constructor(private readonly classSubjectsService: ClassSubjectsService) {}

  @Post()
  create(
    @Param('classId', { schema: idSchema }) classId: string,
    @Body({ schema: createClassSubjectSchema })
    dto: CreateClassSubjectDto,
  ) {
    return this.classSubjectsService.create(classId, dto);
  }

  @Get()
  findAll(@Param('classId', { schema: idSchema }) classId: string) {
    return this.classSubjectsService.findAll(classId);
  }

  @Patch(':classSubjectId')
  update(
    @Param('classId', { schema: idSchema }) classId: string,
    @Param('classSubjectId', { schema: idSchema }) classSubjectId: string,
    @Body({ schema: updateClassSubjectSchema })
    dto: UpdateClassSubjectDto,
  ) {
    return this.classSubjectsService.update(classId, classSubjectId, dto);
  }

  @Delete(':classSubjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('classId', { schema: idSchema }) classId: string,
    @Param('classSubjectId', { schema: idSchema }) classSubjectId: string,
  ) {
    return this.classSubjectsService.remove(classId, classSubjectId);
  }
}
