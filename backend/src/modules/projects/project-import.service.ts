import { Injectable, Logger, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { FilesService } from '../files/files.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { ConsistencyValidatorService } from './consistency-validator.service';

@Injectable()
export class ProjectImportService {
  private readonly logger = new Logger(ProjectImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DocumentsService))
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly consistencyValidator: ConsistencyValidatorService,
  ) {}

  async importFiles(
    userId: string,
    projectId: string,
    files: Express.Multer.File[],
  ) {
    // 1. Verify project exists and get its workspaceId
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const workspaceId = project.workspaceId;

    // 2. Ensure user has workspace membership
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    const importedDocs: any[] = [];

    // 3. Process each file in the batch
    for (const file of files) {
      try {
        const title = file.originalname.replace(/\.[^/.]+$/, ''); // Strip extension

        // a. Create the document record as 'completed' so it triggers metadata/linking/obligation extraction
        const doc = await this.documentsService.create({
          title,
          type: 'contract',
          workspaceId,
          createdBy: userId,
          status: 'completed', // This triggers metadata and obligation extraction
          projectId,
        });

        // b. Upload file to S3/R2 and link to the document
        await this.filesService.upload({
          file,
          userId,
          workspaceId,
          category: 'input_upload',
          documentId: doc.id,
        });

        importedDocs.push(doc);
      } catch (err: any) {
        this.logger.error(`Failed to import file ${file.originalname}: ${err.message}`, err.stack);
      }
    }

    // 4. Trigger consistency check in the background after a short delay to allow text extraction to start
    if (importedDocs.length > 0) {
      setTimeout(() => {
        this.consistencyValidator.validateConsistency(userId, projectId).catch((err) => {
          this.logger.error(`Error auto-validating consistency for project ${projectId}: ${err.message}`);
        });
      }, 5000); // 5 seconds delay
    }

    return {
      success: true,
      importedCount: importedDocs.length,
      documents: importedDocs.map((d) => ({ id: d.id, title: d.title })),
    };
  }
}
