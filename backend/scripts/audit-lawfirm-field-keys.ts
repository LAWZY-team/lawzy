/**
 * Read-only audit for legacy lawfirm profile/template field mappings.
 * Run: npm run lawfirm:audit-fields
 */
import { PrismaClient } from '@prisma/client';
import { auditLawfirmLegacyFields } from '../src/modules/lawfirm/utils/lawfirm-legacy-audit';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [profileFields, templateFields] = await Promise.all([
    prisma.lawfirmProfileField.findMany({
      select: {
        id: true,
        profileId: true,
        fieldKey: true,
        value: true,
      },
    }),
    prisma.lawfirmTemplateField.findMany({
      select: {
        id: true,
        documentId: true,
        placeholder: true,
        mappedKey: true,
      },
    }),
  ]);
  const report = auditLawfirmLegacyFields({ profileFields, templateFields });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
