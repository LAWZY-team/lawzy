import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkspacesService } from './workspaces.service';
import { UsersService } from '../users/users.service';

@Controller('admin/workspaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminWorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async listAll() {
    return this.workspacesService.findAllForAdmin();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Post()
  async create(
    @Request() req: { user?: { userId: string } },
    @Body() body: { name: string; plan?: string },
  ) {
    if (!body?.name?.trim()) {
      throw new BadRequestException('name is required');
    }
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Authentication required');
    }
    return this.workspacesService.create(userId, {
      name: body.name.trim(),
      plan: body.plan,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; plan?: string },
  ) {
    return this.workspacesService.update(id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.plan !== undefined && { plan: body.plan }),
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workspacesService.delete(id);
  }

  @Post(':id/members')
  async addMember(
    @Request() req: { user?: { userId: string } },
    @Param('id') workspaceId: string,
    @Body() body: { email: string; role?: string },
  ) {
    if (!body?.email?.trim()) {
      throw new BadRequestException('email is required');
    }
    const user = await this.usersService.findByEmail(body.email.trim());
    if (!user) {
      throw new BadRequestException(`User with email ${body.email} not found`);
    }
    return this.workspacesService.addMember(
      workspaceId,
      user.id,
      body.role ?? 'viewer',
      req.user?.userId,
    );
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Request() req: { user?: { userId: string } },
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspacesService.removeMember(
      workspaceId,
      userId,
      req.user?.userId,
    );
  }
}
