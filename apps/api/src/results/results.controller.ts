import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { ResultsService } from './results.service.js';

const idSchema = z.uuid('ID must be a valid UUID');

@Controller()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get('classes/:classId/results')
  getClassResults(@Param('classId', { schema: idSchema }) classId: string) {
    return this.resultsService.getClassResults(classId);
  }

  @Get('students/:studentId/report-card')
  getStudentReport(
    @Param('studentId', { schema: idSchema }) studentId: string,
  ) {
    return this.resultsService.getStudentReport(studentId);
  }
}
