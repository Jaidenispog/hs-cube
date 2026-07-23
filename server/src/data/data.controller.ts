import { Controller, Get } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { DataService } from './data.service';

/**
 * The read endpoints that back the app's main tabs (home, board, jobs, customers). Everything is scoped
 * to the caller's tenant. Endpoints not implemented here fall through to NotFoundCompatFilter → [].
 */
@Controller()
export class DataController {
  constructor(private readonly data: DataService) {}

  @Get('work-items')
  workItems(@CurrentUser() u: AuthUser) {
    return this.data.workItems(u.tenantId, u.userId, u.role);
  }

  @Get('contacts')
  contacts(@CurrentUser() u: AuthUser) {
    return this.data.contacts(u.tenantId);
  }

  @Get('dashboard/summary')
  dashboard(@CurrentUser() u: AuthUser) {
    return this.data.dashboard(u.tenantId);
  }

  @Get('board')
  board(@CurrentUser() u: AuthUser) {
    return this.data.board(u.tenantId);
  }
}
