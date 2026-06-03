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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
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
