import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const EXPIRES_IN_SECONDS = 3600;

/** The password every seeded demo account uses; only ever revealed while dev login is enabled. */
export const DEMO_PASSWORD = 'demo1234';

type UserRow = { id: string; tenantId: string; email: string; role: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private devEnabled(): boolean {
    return !!process.env.DEV_LOGIN_ENABLED;
  }

  private async tokenFor(user: UserRow) {
    const token = await this.jwt.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });
    return {
      token,
      user: { userId: user.id, tenantId: user.tenantId, role: user.role },
      expiresInSeconds: EXPIRES_IN_SECONDS,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');
    return this.tokenFor(user);
  }

  async devLogin(role?: 'OWNER' | 'STAFF') {
    if (!this.devEnabled()) throw new ForbiddenException('Dev login is disabled');
    const user = await this.prisma.user.findFirst({
      where: { role: role ?? 'OWNER' },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) throw new UnauthorizedException('No seeded user for that role');
    return this.tokenFor(user);
  }

  async demoCredentials() {
    if (!this.devEnabled()) return { accounts: [] };
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return {
      accounts: users.map((u) => ({
        label: u.role === 'OWNER' ? 'Owner (demo)' : 'Staff (demo)',
        email: u.email,
        password: DEMO_PASSWORD,
      })),
    };
  }

  async directory(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({ userId: u.id, email: u.email, role: u.role }));
  }
}
