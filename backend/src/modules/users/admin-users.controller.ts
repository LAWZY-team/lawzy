import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('scope') scope?: 'all' | 'workspace',
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.usersService.findManyForAdmin({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      q,
      role,
      scope: scope === 'workspace' ? 'workspace' : 'all',
      workspaceId: scope === 'workspace' ? workspaceId : undefined,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.deleteForAdmin(id);
    return { success: true };
  }
}
