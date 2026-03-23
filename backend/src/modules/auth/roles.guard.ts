import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const dbUser = await this.usersService.findById(user.userId);
    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    const roles: string[] =
      typeof dbUser.roles === 'string'
        ? (JSON.parse(dbUser.roles) as string[])
        : Array.isArray(dbUser.roles)
          ? (dbUser.roles as string[])
          : [];

    const hasRole = requiredRoles.some((role) =>
      roles.map((r) => r.toLowerCase()).includes(role.toLowerCase()),
    );
    if (!hasRole) {
      throw new ForbiddenException(
        `Required role(s): ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
