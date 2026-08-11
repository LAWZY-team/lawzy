import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [definitions, aliases, uploadSessions, scanJobs] = await Promise.all([
    prisma.lawfirmFieldDefinition.count(),
    prisma.lawfirmFieldAlias.count(),
    prisma.lawfirmTemplateUploadSession.count(),
    prisma.lawfirmTemplateScanJob.count(),
  ]);
  if (definitions === 0 || aliases === 0) {
    throw new Error('Lawfirm taxonomy seed is missing');
  }
  console.log(
    JSON.stringify(
      { definitions, aliases, uploadSessions, scanJobs },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
