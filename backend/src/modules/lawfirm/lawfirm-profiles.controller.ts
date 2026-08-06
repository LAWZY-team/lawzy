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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LawfirmProfilesService } from './lawfirm-profiles.service';
import {
  CreateProfileDto,
  ImportLocalDto,
  UpdateProfileDto,
} from './dto/profile.dto';
import { CreateExtractionDto } from './dto/extraction.dto';
import { LAWFIRM_MAX_UPLOAD_BYTES } from './lawfirm.constants';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm/profiles')
export class LawfirmProfilesController {
  constructor(private readonly profilesService: LawfirmProfilesService) {}

  @Get()
  async list(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.profilesService.list(req.user.userId, workspaceId);
  }

  @Post()
  async create(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateProfileDto,
  ) {
    return this.profilesService.create(req.user.userId, body);
  }

  @Post('import-local')
  async importLocal(
    @Request() req: { user: { userId: string } },
    @Body() body: ImportLocalDto,
  ) {
    return this.profilesService.importLocal(req.user.userId, body);
  }

  @Get(':id')
  async getOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.profilesService.getById(req.user.userId, id);
  }

  @Patch(':id')
  async update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.profilesService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  async delete(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.profilesService.delete(req.user.userId, id);
  }

  @Post(':id/extractions')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: LAWFIRM_MAX_UPLOAD_BYTES },
    }),
  )
  async createExtraction(
    @Request() req: { user: { userId: string } },
    @Param('id') profileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateExtractionDto,
  ) {
    return this.profilesService.createExtraction(
      req.user.userId,
      profileId,
      file,
      body,
    );
  }
}
