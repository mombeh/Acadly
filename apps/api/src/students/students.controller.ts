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
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { createStudentSchema } from './dto/create-student.dto.js';
import type { CreateStudentDto } from './dto/create-student.dto.js';
import { updateStudentSchema } from './dto/update-student.dto.js';
import type { UpdateStudentDto } from './dto/update-student.dto.js';
import { StudentsService } from './students.service.js';

const idSchema = z.uuid('Student ID must be a valid UUID');

const listStudentsQuerySchema = z.object({
  classId: z.uuid('Class ID must be a valid UUID').optional(),
});

type ListStudentsQueryDto = z.infer<typeof listStudentsQuerySchema>;

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body({ schema: createStudentSchema }) dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get()
  findAll(
    @Query({ schema: listStudentsQuerySchema }) query: ListStudentsQueryDto,
  ) {
    return this.studentsService.findAll(query.classId);
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateStudentSchema }) dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idSchema }) id: string) {
    return this.studentsService.remove(id);
  }
}
