import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable without a bearer token (login, dev-login, demo-credentials). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
