import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async list(@Request() req: any) {
    const userId = req.user.userId;
    return this.workspacesService.findByUser(userId);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: { name: string; plan?: string },
  ) {
    const userId = req.user.userId;
    return this.workspacesService.create(userId, body);
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      logo?: string;
      settings?: unknown;
      aiConfig?: unknown;
    },
  ) {
    return this.workspacesService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workspacesService.delete(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') workspaceId: string,
    @Body() body: { email: string; role: string },
  ) {
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException(`User with email ${body.email} not found`);
    }
    return this.workspacesService.addMember(
      workspaceId,
      user.id,
      body.role ?? 'viewer',
    );
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspacesService.removeMember(workspaceId, userId);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.workspacesService.getStats(id);
  }

  @Get(':id/custom-fields')
  async getCustomFields(@Request() req: any, @Param('id') workspaceId: string) {
    return this.workspacesService.getCustomFields(workspaceId);
  }

  @Put(':id/custom-fields')
  async replaceCustomFields(
    @Request() req: any,
    @Param('id') workspaceId: string,
    @Body()
    body: {
      fields: Array<{
        key: string;
        label: string;
        defaultValue?: string | null;
        isHidden?: boolean;
      }>;
    },
  ) {
    if (!body || !Array.isArray(body.fields)) {
      throw new BadRequestException('fields must be an array');
    }
    await this.workspacesService.ensureMemberCanEdit(
      workspaceId,
      req.user.userId,
    );
    return this.workspacesService.replaceCustomFields(workspaceId, body.fields);
  }
}
