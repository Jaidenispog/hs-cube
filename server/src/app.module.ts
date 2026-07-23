import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { NotFoundCompatFilter } from './common/not-found-compat.filter';
import { DataModule } from './data/data.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { TimeClockModule } from './time-clock/time-clock.module';

@Module({
  imports: [PrismaModule, AuthModule, TimeClockModule, DataModule],
  controllers: [HealthController],
  providers: [
    // Every route is protected by default; @Public() opts specific routes out (login, dev-login, …).
    { provide: APP_GUARD, useClass: AuthGuard },
    // Unimplemented endpoints answer with [] instead of a 404 so no screen hard-errors.
    { provide: APP_FILTER, useClass: NotFoundCompatFilter },
  ],
})
export class AppModule {}
