import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProjectsService } from './projects.service';
import { ConsistencyValidatorService } from './consistency-validator.service';
import { ProjectImportService } from './project-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly consistencyValidator: ConsistencyValidatorService,
    private readonly projectImportService: ProjectImportService,
  ) {}

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      workspaceId: string;
      sharedWith?: string[];
    },
  ) {
    const userId = req.user.userId;
    if (!body.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (!body.name) {
      throw new BadRequestException('name is required');
    }
    if (!body.code) {
      throw new BadRequestException('code is required');
    }
    return this.projectsService.create(userId, body);
  }

  @Get()
  async list(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    const userId = req.user.userId;
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    return this.projectsService.findByWorkspace(userId, workspaceId);
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.projectsService.findById(userId, id);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      code?: string;
      sharedWith?: string[];
    },
  ) {
    const userId = req.user.userId;
    return this.projectsService.update(userId, id, body);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.projectsService.delete(userId, id);
  }

  @Get(':id/people')
  async getPeople(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.projectsService.getPeople(userId, id);
  }

  @Get(':id/chats')
  async listChats(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.projectsService.listChats(userId, id);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Request() req: any,
    @Param('id') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const userId = req.user.userId;
    return this.projectsService.uploadDocument(userId, projectId, file);
  }

  @Patch(':id/documents/:documentId')
  async renameDocument(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('documentId') documentId: string,
    @Body() body: { filename: string },
  ) {
    const userId = req.user.userId;
    return this.projectsService.renameDocument(
      userId,
      projectId,
      documentId,
      body.filename,
    );
  }

  @Patch(':id/documents/:documentId/folder')
  async moveDocumentToFolder(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('documentId') documentId: string,
    @Body() body: { folderId?: string | null; folder_id?: string | null },
  ) {
    const userId = req.user.userId;
    const folderId = body.folderId ?? body.folder_id ?? null;
    return this.projectsService.moveDocumentToFolder(
      userId,
      projectId,
      documentId,
      folderId,
    );
  }

  @Post(':id/folders')
  async createFolder(
    @Request() req: any,
    @Param('id') projectId: string,
    @Body() body: { name: string; parentFolderId?: string | null; parent_folder_id?: string | null },
  ) {
    const userId = req.user.userId;
    return this.projectsService.createFolder(
      userId,
      projectId,
      body.name,
      body.parentFolderId ?? body.parent_folder_id ?? null,
    );
  }

  @Patch(':id/folders/:folderId')
  async updateFolder(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('folderId') folderId: string,
    @Body() body: { name?: string; parentFolderId?: string | null; parent_folder_id?: string | null },
  ) {
    const userId = req.user.userId;
    return this.projectsService.updateFolder(userId, projectId, folderId, {
      name: body.name,
      parentFolderId: body.parentFolderId ?? body.parent_folder_id,
    });
  }

  @Delete(':id/folders/:folderId')
  async deleteFolder(
    @Request() req: any,
    @Param('id') projectId: string,
    @Param('folderId') folderId: string,
  ) {
    const userId = req.user.userId;
    return this.projectsService.deleteFolder(userId, projectId, folderId);
  }

  @Post(':id/validate-consistency')
  async validateConsistency(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.consistencyValidator.validateConsistency(userId, id);
  }

  @Get(':id/mismatch-alerts')
  async getMismatchAlerts(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.consistencyValidator.getMismatchAlerts(userId, id);
  }

  @Post(':id/import-files')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async importFiles(
    @Request() req: any,
    @Param('id') projectId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    const userId = req.user.userId;
    return this.projectImportService.importFiles(userId, projectId, files);
  }
}
