import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { TimeClockService } from './time-clock.service';

class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number | null;
}

class CheckInDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

@Controller('time-clock')
export class TimeClockController {
  constructor(private readonly svc: TimeClockService) {}

  @Get('status')
  status(@CurrentUser() u: AuthUser) {
    return this.svc.status(u.tenantId, u.userId);
  }

  @Get('entries')
  entries(@CurrentUser() u: AuthUser) {
    return this.svc.entries(u.tenantId, u.userId);
  }

  @Post('check-in')
  checkIn(@CurrentUser() u: AuthUser, @Body() dto: CheckInDto) {
    return this.svc.checkIn(u.tenantId, u.userId, dto.location);
  }

  @Post('check-out')
  checkOut(@CurrentUser() u: AuthUser) {
    return this.svc.checkOut(u.tenantId, u.userId);
  }

  @Get('summary')
  summary(@CurrentUser() u: AuthUser) {
    if (u.role !== 'OWNER') throw new ForbiddenException('Owners only');
    return this.svc.summary(u.tenantId);
  }
}
