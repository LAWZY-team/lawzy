/**
 * Backfill companyCode cho các workspace cũ (companyCode = null).
 * Chạy: npm run script:backfill-company-code
 * Hoặc: npx ts-node -r tsconfig-paths/register scripts/backfill-workspace-company-code.ts
 */
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateCompanyCode(existingCodes: Set<string>): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 10; i++) {
    const bytes = randomBytes(6);
    const code = 'LWZ-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
    if (!existingCodes.has(code)) return code;
  }
  return 'LWZ-' + randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  const workspaces = await prisma.workspace.findMany({
    where: { companyCode: null },
    orderBy: { createdAt: 'asc' },
  });

  if (workspaces.length === 0) {
    console.log('Không có workspace nào cần backfill.');
    return;
  }

  const existingCodes = new Set(
    (
      await prisma.workspace.findMany({
        where: { companyCode: { not: null } },
        select: { companyCode: true },
      })
    )
      .map((w) => w.companyCode)
      .filter((c): c is string => c != null)
  );

  console.log(`Tìm thấy ${workspaces.length} workspace cần backfill.\n`);

  for (const ws of workspaces) {
    const code = generateCompanyCode(existingCodes);
    existingCodes.add(code);
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { companyCode: code },
    });
    console.log(`  ${ws.name} (${ws.id}) → ${code}`);
  }

  console.log(`\nĐã backfill xong ${workspaces.length} workspace.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
