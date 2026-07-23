import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Monday 00:00 of the current week, in UTC. */
function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const FINAL_STATE = /collect|closed|cancel/i;

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async workItems(tenantId: string, userId: string, role: string) {
    const items = await this.prisma.workItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = items.map((w) => ({
      id: w.id,
      type: w.type,
      reference: w.reference,
      stateName: w.stateName,
      workflowVersion: w.workflowVersion,
      assignees: safeJsonArray(w.assignees),
      createdAt: w.createdAt.toISOString(),
    }));
    // STAFF only see work assigned to them; OWNER sees everything (mirrors the app's role model).
    return role === 'STAFF' ? mapped.filter((w) => w.assignees.includes(userId)) : mapped;
  }

  async contacts(tenantId: string) {
    const cs = await this.prisma.contact.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return cs.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      email: c.email,
      phone: c.phone,
      fields: {},
      customFields: {},
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async dashboard(tenantId: string) {
    const items = await this.prisma.workItem.findMany({ where: { tenantId } });
    const jobsByState: Record<string, number> = {};
    for (const w of items) jobsByState[w.stateName] = (jobsByState[w.stateName] ?? 0) + 1;
    return {
      jobsByState,
      activeJobs: items.filter((w) => !FINAL_STATE.test(w.stateName)).length,
      totalUnpaidCents: 0,
      thisWeekRevenueCents: 0,
      weekStart: startOfWeek(new Date()).toISOString(),
    };
  }

  async board(tenantId: string) {
    const items = await this.prisma.workItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const byState = new Map<string, ReturnType<typeof this.toCard>[]>();
    for (const w of items) {
      const card = this.toCard(w);
      const bucket = byState.get(w.stateName) ?? [];
      bucket.push(card);
      byState.set(w.stateName, bucket);
    }
    const columns = [...byState.entries()].map(([state, cards]) => ({
      state,
      isFinal: FINAL_STATE.test(state),
      cards,
    }));
    return { type: 'job', columns };
  }

  private toCard(w: { id: string; reference: string; stateName: string; assignees: string }) {
    return {
      id: w.id,
      reference: w.reference,
      stateName: w.stateName,
      customerName: null,
      vehicleLabel: null,
      assignees: safeJsonArray(w.assignees),
    };
  }
}
