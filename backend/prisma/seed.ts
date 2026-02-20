import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@lawzy.vn';
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const hashed = await bcrypt.hash('Lawzy@2026', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin Lawzy',
        password: hashed,
        roles: JSON.stringify(['admin']),
        isVerified: true,
      },
    });
    console.log('Admin user created: admin@lawzy.vn');
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
