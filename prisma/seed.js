// server/prisma/seed.ts
import { PrismaClient, Role, RosterStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
// "HH:mm" -> total minutes
function toMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
}
// Next week's Monday 00:00 (local)
function startOfNextWeekMonday() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun ... 6=Sat
    const daysUntilMonday = (8 - day) % 7 || 7; // next Monday
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysUntilMonday);
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
async function main() {
    console.log('Seeding database...');
    // Department (idempotent)
    const department = await prisma.department.upsert({
        where: { name: 'Genel' },
        update: {},
        create: { name: 'Genel' },
    });
    // Employees (idempotent)
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await prisma.employee.upsert({
        where: { email: 'admin@example.com' },
        update: { passwordHash: adminPasswordHash },
        create: {
            email: 'admin@example.com',
            fullName: 'Admin User',
            role: Role.ADMIN,
            departmentId: department.id,
            active: true,
            passwordHash: adminPasswordHash,
        },
    });
    const alice = await prisma.employee.upsert({
        where: { email: 'alice@example.com' },
        update: {},
        create: {
            email: 'alice@example.com',
            fullName: 'Alice Worker',
            role: Role.EMPLOYEE,
            departmentId: department.id,
            active: true,
        },
    });
    const bob = await prisma.employee.upsert({
        where: { email: 'bob@example.com' },
        update: {},
        create: {
            email: 'bob@example.com',
            fullName: 'Bob Teammate',
            role: Role.EMPLOYEE,
            departmentId: department.id,
            active: true,
        },
    });
    // Shift templates (idempotent, fixed ids)
    const morning = await prisma.shiftTemplate.upsert({
        where: { id: 'morning-template-fixed-id' },
        update: {},
        create: {
            id: 'morning-template-fixed-id',
            departmentId: department.id,
            code: 'G',
            name: 'Morning',
            startMinutes: toMinutes('09:00'),
            endMinutes: toMinutes('17:00'),
            color: '#FEF3C7',
        },
    });
    const evening = await prisma.shiftTemplate.upsert({
        where: { id: 'evening-template-fixed-id' },
        update: {},
        create: {
            id: 'evening-template-fixed-id',
            departmentId: department.id,
            code: 'A',
            name: 'Evening',
            startMinutes: toMinutes('13:00'),
            endMinutes: toMinutes('21:00'),
            color: '#FED7AA',
        },
    });
    const night = await prisma.shiftTemplate.upsert({
        where: { id: 'night-template-fixed-id' },
        update: {},
        create: {
            id: 'night-template-fixed-id',
            departmentId: department.id,
            code: 'N',
            name: 'Night',
            startMinutes: toMinutes('00:00'),
            endMinutes: toMinutes('08:00'),
            color: '#E9D5FF',
        },
    });
    // Roster for the next week (idempotent: reuse if same range exists)
    const start = startOfNextWeekMonday();
    const end = addDays(start, 6);
    const existingRoster = await prisma.roster.findFirst({
        where: { departmentId: department.id, startDate: start, endDate: end },
    });
    const roster = existingRoster ??
        (await prisma.roster.create({
            data: {
                departmentId: department.id,
                startDate: start,
                endDate: end,
                status: RosterStatus.DRAFT,
            },
        }));
    // Simple assignments (idempotent via composite upsert). If kind is omitted, default REGULAR is applied.
    const employees = [alice, bob];
    const templates = [morning, evening, night];
    for (let i = 0; i < 7; i++) {
        const current = addDays(start, i);
        const emp = employees[i % employees.length];
        const template = templates[i % templates.length];
        await prisma.shiftAssignment.upsert({
            where: {
                employeeId_date_startMinutes_endMinutes: {
                    employeeId: emp.id,
                    date: current,
                    startMinutes: template.startMinutes,
                    endMinutes: template.endMinutes,
                },
            },
            update: {
                rosterId: roster.id,
                startMinutes: template.startMinutes,
                endMinutes: template.endMinutes,
                templateId: template.id,
            },
            create: {
                rosterId: roster.id,
                employeeId: emp.id,
                date: current,
                startMinutes: template.startMinutes,
                endMinutes: template.endMinutes,
                templateId: template.id,
            },
        });
    }
    console.log('Seed complete');
}
main()
    .catch((e) => {
    console.error(e);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
