import { Module } from '@nestjs/common';
import { TimeClockController } from './time-clock.controller';
import { TimeClockService } from './time-clock.service';

@Module({
  controllers: [TimeClockController],
  providers: [TimeClockService],
})
export class TimeClockModule {}
