import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CheckInLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

type EntryRow = {
  id: string;
  userId: string;
  clockInAt: Date;
  clockOutAt: Date | null;
  minutes: number | null;
};

/** Shape the mobile app's TimeEntry expects (ISO date strings). */
function toTimeEntry(e: EntryRow) {
  return {
    id: e.id,
    userId: e.userId,
    clockInAt: e.clockInAt.toISOString(),
    clockOutAt: e.clockOutAt ? e.clockOutAt.toISOString() : null,
    minutes: e.minutes ?? null,
  };
}

@Injectable()
export class TimeClockService {
  constructor(private readonly prisma: PrismaService) {}

  private openEntry(tenantId: string, userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { tenantId, userId, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    });
  }

  async status(tenantId: string, userId: string) {
    const entry = await this.openEntry(tenantId, userId);
    return { onClock: !!entry, entry: entry ? toTimeEntry(entry) : null };
  }

  async entries(tenantId: string, userId: string) {
    const list = await this.prisma.timeEntry.findMany({
      where: { tenantId, userId },
      orderBy: { clockInAt: 'desc' },
    });
    return list.map(toTimeEntry);
  }

  async checkIn(tenantId: string, userId: string, location?: CheckInLocation) {
    // Idempotent: if already on the clock, return the open entry rather than opening a second one.
    const existing = await this.openEntry(tenantId, userId);
    if (existing) return toTimeEntry(existing);

    const entry = await this.prisma.timeEntry.create({
      data: {
        tenantId,
        userId,
        checkInLat: location?.latitude ?? null,
        checkInLng: location?.longitude ?? null,
        checkInAccuracy: location?.accuracy ?? null,
      },
    });
    return toTimeEntry(entry);
  }

  async checkOut(tenantId: string, userId: string) {
    const entry = await this.openEntry(tenantId, userId);
    if (!entry) return { ok: true };
    const now = new Date();
    const minutes = Math.max(0, Math.round((now.getTime() - entry.clockInAt.getTime()) / 60000));
    const updated = await this.prisma.timeEntry.update({
      where: { id: entry.id },
      data: { clockOutAt: now, minutes },
    });
    return toTimeEntry(updated);
  }

  async summary(tenantId: string) {
    const users = await this.prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
    const result: {
      userId: string;
      role: string;
      totalMinutes: number;
      sessions: number;
      onClock: boolean;
      lastClockInAt: string | null;
    }[] = [];
    for (const u of users) {
      const es = await this.prisma.timeEntry.findMany({ where: { tenantId, userId: u.id } });
      const totalMinutes = es.reduce((sum, e) => sum + (e.minutes ?? 0), 0);
      const open = es.find((e) => e.clockOutAt === null);
      const last = es.reduce<EntryRow | null>(
        (acc, e) => (acc && acc.clockInAt >= e.clockInAt ? acc : e),
        null,
      );
      result.push({
        userId: u.id,
        role: u.role,
        totalMinutes,
        sessions: es.length,
        onClock: !!open,
        lastClockInAt: last ? last.clockInAt.toISOString() : null,
      });
    }
    return result;
  }
}
