import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: 'OWNER' | 'STAFF';
  email: string;
}

/** Injects the authenticated user (set by AuthGuard from the verified bearer token). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
