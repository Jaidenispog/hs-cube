import { useAuth } from './auth';

/**
 * The employee (STAFF) surface.
 *
 * This MIRRORS the API's `@AllowStaff()` allowlist — it is not the enforcement. The server denies an
 * employee by default and scopes them to their own jobs; this only decides what we bother to show, so a
 * worker never taps into a guaranteed 403.
 *
 * If you widen one side, widen the other. A link here without a matching @AllowStaff() route is a dead
 * end; an @AllowStaff() route with no link here is simply unreachable.
 */
export function useIsStaff(): boolean {
  const { user } = useAuth();
  return user?.role === 'STAFF';
}

export function useIsOwner(): boolean {
  const { user } = useAuth();
  return user?.role === 'OWNER';
}
