import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

const day = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * day);
function at(daysOffset: number, hour: number) {
  const d = daysFromNow(daysOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  // Reset data (urutan sesuai foreign key)
  await prisma.checkIn.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.member.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = (name: string, email: string, role: Role, phone?: string) => ({ name, email, role, phone, passwordHash });

  const admin = await prisma.user.create({ data: user('Admin Gym', 'admin@gym.test', 'ADMIN', '081200000001') });
  await prisma.user.create({ data: user('Sari Staff', 'staff@gym.test', 'STAFF', '081200000002') });

  const trainerData = [
    { name: 'Budi Trainer', email: 'trainer@gym.test', specialization: 'Strength & Conditioning' },
    { name: 'Rina Yoga', email: 'rina@gym.test', specialization: 'Yoga & Pilates' },
    { name: 'Andi Cardio', email: 'andi@gym.test', specialization: 'HIIT & Cardio' },
  ];
  const trainers = [];
  for (const t of trainerData) {
    trainers.push(
      await prisma.trainer.create({
        data: { specialization: t.specialization, user: { create: user(t.name, t.email, 'TRAINER') } },
      }),
    );
  }

  const [monthly, quarterly, yearly] = await Promise.all([
    prisma.plan.create({ data: { name: 'Bulanan', durationDays: 30, price: 300_000, description: 'Akses gym 30 hari' } }),
    prisma.plan.create({ data: { name: '3 Bulan', durationDays: 90, price: 800_000, description: 'Akses gym 90 hari' } }),
    prisma.plan.create({ data: { name: 'Tahunan', durationDays: 365, price: 2_800_000, description: 'Akses gym 1 tahun' } }),
  ]);
  await prisma.plan.create({ data: { name: 'Harian (lama)', durationDays: 1, price: 50_000, isActive: false } });

  // [nama, email, plan, mulai (hari dari sekarang)] — variasi status aktif / mau habis / expired / tanpa membership
  const memberData: [string, string, typeof monthly | null, number][] = [
    ['Dewi Lestari', 'member@gym.test', quarterly, -10],
    ['Agus Pratama', 'agus@gym.test', monthly, -25], // habis ~5 hari lagi
    ['Siti Nurhaliza', 'siti@gym.test', yearly, -100],
    ['Joko Susilo', 'joko@gym.test', monthly, -45], // expired
    ['Maya Putri', 'maya@gym.test', monthly, -2],
    ['Rizky Ramadhan', 'rizky@gym.test', null, 0], // belum punya membership
  ];
  const members = [];
  for (const [i, [name, email, plan, startOffset]] of memberData.entries()) {
    const member = await prisma.member.create({
      data: {
        memberCode: `GYM-${String(i + 1).padStart(5, '0')}`,
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        joinedAt: daysFromNow(Math.min(startOffset, 0)),
        user: { create: user(name, email, 'MEMBER', `0813000000${i + 10}`) },
      },
    });
    if (plan) {
      const startDate = daysFromNow(startOffset);
      await prisma.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          startDate,
          endDate: new Date(startDate.getTime() + plan.durationDays * day),
          price: plan.price,
        },
      });
    }
    members.push(member);
  }

  // Jadwal kelas: kemarin s/d 6 hari ke depan
  const templates = [
    { name: 'Morning Yoga', hour: 7, trainer: trainers[1], capacity: 15, room: 'Studio A' },
    { name: 'HIIT Blast', hour: 18, trainer: trainers[2], capacity: 20, room: 'Studio B' },
    { name: 'Strength 101', hour: 19, trainer: trainers[0], capacity: 10, room: 'Weight Area' },
  ];
  const sessions = [];
  for (let d = -1; d <= 6; d++) {
    for (const t of templates) {
      sessions.push(
        await prisma.classSession.create({
          data: {
            name: t.name,
            trainerId: t.trainer.id,
            startAt: at(d, t.hour),
            endAt: at(d, t.hour + 1),
            capacity: t.capacity,
            room: t.room,
          },
        }),
      );
    }
  }

  const activeMembers = [members[0], members[1], members[2], members[4]];
  const futureSessions = sessions.filter((s) => s.startAt > new Date()).slice(0, 4);
  for (const s of futureSessions) {
    for (const m of activeMembers.slice(0, 3)) {
      await prisma.booking.create({ data: { sessionId: s.id, memberId: m.id } });
    }
  }
  for (const s of sessions.filter((s) => s.endAt < new Date())) {
    for (const m of activeMembers) {
      await prisma.booking.create({ data: { sessionId: s.id, memberId: m.id, status: 'ATTENDED' } });
    }
  }

  // Check-in 7 hari terakhir
  for (let d = -6; d <= 0; d++) {
    for (const [i, m] of activeMembers.entries()) {
      if ((d + i) % 3 === 0) continue;
      const checkedInAt = at(d, 6 + i * 3);
      if (checkedInAt > new Date()) continue;
      await prisma.checkIn.create({ data: { memberId: m.id, checkedInAt, checkedInById: admin.id } });
    }
  }

  console.log(`Seed selesai. Semua akun memakai password "${PASSWORD}":`);
  console.log('  admin@gym.test (ADMIN), staff@gym.test (STAFF), trainer@gym.test (TRAINER), member@gym.test (MEMBER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
