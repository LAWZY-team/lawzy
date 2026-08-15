/**
 * Rebuild source order for existing Lawfirm template sets.
 * Default mode is read-only. Use --apply to persist the canonical order and slots.
 * Run: npm run lawfirm:backfill-source-order
 * Apply: npm run lawfirm:backfill-source-order -- --apply
 */
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/integrations/prisma/prisma.service';
import { LawfirmTemplateSetIndexService } from '../src/modules/lawfirm/lawfirm-template-set-index.service';
import { sortLawfirmFieldsBySourceOrder } from '../src/modules/lawfirm/utils/lawfirm-source-order';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

type ReportRow = {
  templateSetId: string;
  changedDocuments: number;
  changedFieldPositions: number;
};

async function main(): Promise<void> {
  const templateSets = await prisma.lawfirmTemplateSet.findMany({
    select: {
      id: true,
      documents: {
        select: {
          id: true,
          fields: {
            select: { id: true, sortOrder: true, discovery: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
  });

  const report: ReportRow[] = templateSets.map((templateSet) => {
    let changedDocuments = 0;
    let changedFieldPositions = 0;
    for (const document of templateSet.documents) {
      const ordered = sortLawfirmFieldsBySourceOrder(document.fields);
      const changed = ordered.filter(
        (field, index) => field.id !== document.fields[index]?.id || field.sortOrder !== index,
      ).length;
      if (changed) changedDocuments += 1;
      changedFieldPositions += changed;
    }
    return { templateSetId: templateSet.id, changedDocuments, changedFieldPositions };
  });

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    templateSets: templateSets.length,
    affectedTemplateSets: report.filter((row) => row.changedFieldPositions > 0).length,
    changedDocuments: report.reduce((total, row) => total + row.changedDocuments, 0),
    changedFieldPositions: report.reduce((total, row) => total + row.changedFieldPositions, 0),
    sets: report.filter((row) => row.changedFieldPositions > 0),
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (!apply) return;

  const indexService = new LawfirmTemplateSetIndexService(
    prisma as unknown as PrismaService,
  );
  for (const templateSet of templateSets) {
    await indexService.rebuild(templateSet.id);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());