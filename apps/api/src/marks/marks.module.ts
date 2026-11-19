import { Module } from '@nestjs/common';
import { MarksController } from './marks.controller.js';
import { MarksService } from './marks.service.js';

@Module({
  controllers: [MarksController],
  providers: [MarksService],
  exports: [MarksService],
})
export class MarksModule {}
