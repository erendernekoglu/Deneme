import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesToHm(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

async function main() {
  const today = startOfToday();
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const minutesAhead = Number(process.env.REMINDER_MINUTES_BEFORE ?? 60);

  // next cron tick (*/5) in minutes
  const nextTick = (Math.floor(nowMins / 5) + 1) * 5;
  const target = nextTick + minutesAhead;
  if (target >= 24 * 60) {
    console.log('[reminderTest] Target is beyond today; try earlier in the day.');
    return;
  }

  // Ensure department
  const department = await prisma.department.upsert({
    where: { name: 'Genel' },
    update: {},
    create: { name: 'Genel' },
  });

  // Prefer a real employee; fallback to admin
  const employee =
    (await prisma.employee.findFirst({ where: { role: Role.EMPLOYEE, active: true } })) ||
    (await prisma.employee.findFirst({ where: { email: 'admin@example.com' } })) ||
    (await prisma.employee.create({
      data: { email: 'temp@example.com', fullName: 'Temp User', role: Role.EMPLOYEE, departmentId: department.id },
    }));

  // Ensure a roster covering today
  const existingRoster = await prisma.roster.findFirst({ where: { departmentId: department.id, startDate: today, endDate: today } });
  const roster =
    existingRoster ??
    (await prisma.roster.create({ data: { departmentId: department.id, startDate: today, endDate: today } }));

  // Create an assignment starting at `target` minutes for 60 minutes duration
  const startMinutes = target;
  const endMinutes = Math.min(24 * 60, startMinutes + 60);

  // Upsert using composite unique
  await prisma.shiftAssignment.upsert({
    where: {
      employeeId_date_startMinutes_endMinutes: {
        employeeId: employee.id,
        date: today,
        startMinutes,
        endMinutes,
      },
    },
    update: { rosterId: roster.id },
    create: {
      rosterId: roster.id,
      employeeId: employee.id,
      date: today,
      startMinutes,
      endMinutes,
    },
  });

  console.log('[reminderTest] Inserted assignment for today');
  console.log('  Employee:', employee.fullName, employee.email);
  console.log('  Window:', minutesAhead, 'minutes ahead of next cron tick');
  console.log('  Start:', minutesToHm(startMinutes));
  console.log('  End  :', minutesToHm(endMinutes));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

