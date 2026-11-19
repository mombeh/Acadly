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
import { ClassesService } from './classes.service.js';
import { createClassSchema } from './dto/create-class.dto.js';
import type { CreateClassDto } from './dto/create-class.dto.js';
import { updateClassSchema } from './dto/update-class.dto.js';
import type { UpdateClassDto } from './dto/update-class.dto.js';

const idSchema = z.uuid('Class ID must be a valid UUID');

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@Body({ schema: createClassSchema }) dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateClassSchema }) dto: UpdateClassDto,
  ) {
    return this.classesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idSchema }) id: string) {
    return this.classesService.remove(id);
  }
}
