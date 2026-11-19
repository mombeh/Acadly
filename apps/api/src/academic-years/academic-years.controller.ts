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
import { AcademicYearsService } from './academic-years.service.js';
import {
  CreateAcademicYearDto,
  createAcademicYearSchema,
} from './dto/create-academic-year.dto.js';
import {
  UpdateAcademicYearDto,
  updateAcademicYearSchema,
} from './dto/update-academic-year.dto.js';

const idSchema = z.uuid('Academic year ID must be a valid UUID');

@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Post()
  create(
    @Body({ schema: createAcademicYearSchema }) dto: CreateAcademicYearDto,
  ) {
    return this.academicYearsService.create(dto);
  }

  @Get()
  findAll() {
    return this.academicYearsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.academicYearsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateAcademicYearSchema }) dto: UpdateAcademicYearDto,
  ) {
    return this.academicYearsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idSchema }) id: string) {
    return this.academicYearsService.remove(id);
  }

  @Patch(':id/activate')
  activate(@Param('id', { schema: idSchema }) id: string) {
    return this.academicYearsService.activate(id);
  }
}
