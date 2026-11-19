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
import { bulkMarksSchema, sequenceSchema } from './dto/bulk-marks.dto.js';
import type { BulkMarksDto, MarkSequence } from './dto/bulk-marks.dto.js';
import { updateMarkSchema } from './dto/update-mark.dto.js';
import type { UpdateMarkDto } from './dto/update-mark.dto.js';
import { MarksService } from './marks.service.js';

const idSchema = z.uuid('ID must be a valid UUID');

@Controller()
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  @Get('classes/:classId/subjects/:classSubjectId/marks')
  findClassMarks(
    @Param('classId', { schema: idSchema }) classId: string,
    @Param('classSubjectId', { schema: idSchema }) classSubjectId: string,
    @Query('sequence', { schema: sequenceSchema }) sequence: MarkSequence,
  ) {
    return this.marksService.findClassMarks(classId, classSubjectId, sequence);
  }

  @Post('classes/:classId/subjects/:classSubjectId/marks/bulk')
  bulkUpsert(
    @Param('classId', { schema: idSchema }) classId: string,
    @Param('classSubjectId', { schema: idSchema }) classSubjectId: string,
    @Body({ schema: bulkMarksSchema }) dto: BulkMarksDto,
  ) {
    return this.marksService.bulkUpsert(classId, classSubjectId, dto);
  }

  @Get('marks/:id')
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.marksService.findOne(id);
  }

  @Patch('marks/:id')
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: updateMarkSchema }) dto: UpdateMarkDto,
  ) {
    return this.marksService.update(id, dto);
  }

  @Delete('marks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idSchema }) id: string) {
    return this.marksService.remove(id);
  }
}
