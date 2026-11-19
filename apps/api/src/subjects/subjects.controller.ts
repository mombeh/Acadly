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
import { createSubjectSchema } from './dto/create-subject.dto.js';
import type { CreateSubjectDto } from './dto/create-subject.dto.js';
import { updateSubjectSchema } from './dto/update-subject.dto.js';
import type { UpdateSubjectDto } from './dto/update-subject.dto.js';
import { SubjectsService } from './subjects.service.js';

const idSchema = z.uuid('Subject ID must be a valid UUID');

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  create(@Body({ schema: createSubjectSchema }) dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Get()
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.subjectsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateSubjectSchema }) dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idSchema }) id: string) {
    return this.subjectsService.remove(id);
  }
}
