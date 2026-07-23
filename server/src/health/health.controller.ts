import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/** Liveness endpoint for the platform's health checks (and a quick "is it up?" from a browser). */
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return { ok: true, service: 'onestack-api', time: new Date().toISOString() };
  }
}
