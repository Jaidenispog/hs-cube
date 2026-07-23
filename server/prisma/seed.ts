import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TENANT_ID = 'demo-tenant';

async function main() {
  // Safe to run on every deploy: seed only when the database is empty, unless FORCE_RESEED=1.
  // (The steps below delete + recreate demo rows, which would wipe real data on a restart otherwise.)
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_RESEED !== '1') {
    // eslint-disable-next-line no-console
    console.log('Seed skipped — data already present (set FORCE_RESEED=1 to reseed).');
    return;
  }

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { name: 'Demo Workshop' },
    create: { id: TENANT_ID, name: 'Demo Workshop' },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.test' },
    update: { passwordHash, role: 'OWNER', tenantId: tenant.id },
    create: { email: 'owner@demo.test', passwordHash, role: 'OWNER', tenantId: tenant.id },
  });
  const staff = await prisma.user.upsert({
    where: { email: 'staff@demo.test' },
    update: { passwordHash, role: 'STAFF', tenantId: tenant.id },
    create: { email: 'staff@demo.test', passwordHash, role: 'STAFF', tenantId: tenant.id },
  });

  // Customers.
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.createMany({
    data: [
      { tenantId: tenant.id, displayName: 'Jordan Alvarez', email: 'jordan@example.com', phone: '0400 111 222' },
      { tenantId: tenant.id, displayName: 'Priya Nair', email: 'priya@example.com', phone: '0400 333 444' },
      { tenantId: tenant.id, displayName: 'Sam Okafor', email: null, phone: '0400 555 666' },
    ],
  });

  // Jobs — a couple assigned to the staff member so their home screen has work.
  await prisma.workItem.deleteMany({ where: { tenantId: tenant.id } });
  const jobs = [
    { reference: 'J-00001', stateName: 'Booked', assignees: [staff.id] },
    { reference: 'J-00002', stateName: 'InProgress', assignees: [staff.id] },
    { reference: 'J-00003', stateName: 'AwaitingParts', assignees: [] as string[] },
    { reference: 'J-00004', stateName: 'Ready', assignees: [staff.id] },
    { reference: 'J-00005', stateName: 'Collected', assignees: [] as string[] },
  ];
  for (const j of jobs) {
    await prisma.workItem.create({
      data: {
        tenantId: tenant.id,
        type: 'job',
        reference: j.reference,
        stateName: j.stateName,
        workflowVersion: 1,
        assignees: JSON.stringify(j.assignees),
      },
    });
  }

  // A couple of completed shifts so the time-clock history isn't empty.
  await prisma.timeEntry.deleteMany({ where: { tenantId: tenant.id } });
  const now = Date.now();
  const HOUR = 3_600_000;
  await prisma.timeEntry.create({
    data: {
      tenantId: tenant.id,
      userId: staff.id,
      clockInAt: new Date(now - 26 * HOUR),
      clockOutAt: new Date(now - 18 * HOUR),
      minutes: 8 * 60,
    },
  });
  await prisma.timeEntry.create({
    data: {
      tenantId: tenant.id,
      userId: staff.id,
      clockInAt: new Date(now - 50 * HOUR),
      clockOutAt: new Date(now - 42 * HOUR),
      minutes: 7 * 60 + 45,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seeded:', {
    tenant: tenant.name,
    owner: owner.email,
    staff: staff.email,
    jobs: jobs.length,
    password: 'demo1234',
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
