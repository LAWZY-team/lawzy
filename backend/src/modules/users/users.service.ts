import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByProviderId(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { provider, providerId },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    name: string;
    password: string;
    roles?: string[];
    position?: string;
    otpCode?: string;
    otpExpires?: Date;
    isVerified?: boolean;
    provider?: string;
    providerId?: string;
    avatar?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        roles: JSON.stringify(data.roles ?? ['user']),
        position: data.position,
        otpCode: data.otpCode,
        otpExpires: data.otpExpires,
        isVerified: data.isVerified ?? false,
        provider: data.provider,
        providerId: data.providerId,
        avatar: data.avatar,
      },
    });
  }

  async updateProfile(
    id: string,
    data: { name?: string; avatar?: string; position?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getCustomFields(userId: string) {
    // Use raw SQL to avoid requiring regenerated Prisma client model
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        key: string;
        label: string;
        default_value: string | null;
        is_hidden: 0 | 1;
      }>
    >`SELECT id, user_id, \`key\`, label, default_value, is_hidden FROM user_custom_fields WHERE user_id = ${userId} ORDER BY created_at ASC`;

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      key: r.key,
      label: r.label,
      defaultValue: r.default_value,
      isHidden: !!r.is_hidden,
    }));
  }

  /**
   * Replace custom fields for a user. Uses upsert per key and deletes removed keys.
   */
  async replaceCustomFields(
    userId: string,
    fields: Array<{
      key: string;
      label: string;
      defaultValue?: string | null;
      isHidden?: boolean;
    }>,
  ) {
    const normalized = fields
      .filter((f) => f && typeof f.key === 'string' && f.key.trim().length > 0)
      .map((f) => ({
        key: f.key.trim(),
        label: String(f.label ?? '').trim() || f.key.trim(),
        defaultValue:
          f.defaultValue === null || f.defaultValue === undefined
            ? null
            : String(f.defaultValue),
        isHidden: !!f.isHidden,
      }));

    const keys = normalized.map((f) => f.key);

    await this.prisma.$transaction(async (tx) => {
      // Remove existing rows for user
      await tx.$executeRaw`DELETE FROM user_custom_fields WHERE user_id = ${userId}`;

      // Insert normalized fields (generate id via UUID())
      for (const f of normalized) {
        await tx.$executeRaw`
          INSERT INTO user_custom_fields (id, user_id, \`key\`, label, default_value, is_hidden, created_at, updated_at)
          VALUES (UUID(), ${userId}, ${f.key}, ${f.label}, ${f.defaultValue}, ${f.isHidden ? 1 : 0}, NOW(), NOW())
        `;
      }
    });

    return this.getCustomFields(userId);
  }

  async setResetToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: { resetToken: token, resetExpires: expires },
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) return null;

    if (user.resetExpires && user.resetExpires < new Date()) {
      // Tiêu hủy token vì đã quá hạn
      this.prisma.user
        .update({
          where: { id: user.id },
          data: { resetToken: null, resetExpires: null },
        })
        .catch(() => {});
      return null;
    }

    return user;
  }

  async updatePassword(id: string, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password, resetToken: null, resetExpires: null },
    });
  }

  async setOTP(email: string, otp: string, expires: Date): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpires: expires },
    });
  }

  async findByEmailAndOTP(email: string, otp: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, otpCode: otp },
    });

    if (!user) return null;

    if (user.otpExpires && user.otpExpires < new Date()) {
      // Tiêu hủy mã OTP vì đã quá hạn
      this.prisma.user
        .update({
          where: { id: user.id },
          data: { otpCode: null, otpExpires: null },
        })
        .catch(() => {});
      return null;
    }

    return user;
  }

  sanitize(user: User) {
    const { password, resetToken, resetExpires, otpCode, otpExpires, ...safe } =
      user;
    return {
      ...safe,
      roles:
        typeof safe.roles === 'string' ? JSON.parse(safe.roles) : safe.roles,
    };
  }

  async findManyForAdmin(opts?: {
    page?: number;
    limit?: number;
    q?: string;
    role?: string;
    scope?: 'all' | 'workspace';
    workspaceId?: string;
  }) {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const scope = opts?.scope ?? 'all';

    const baseWhere: Record<string, unknown> = {};
    if (opts?.q?.trim()) {
      const q = opts.q.trim();
      baseWhere.OR = [{ email: { contains: q } }, { name: { contains: q } }];
    }
    if (opts?.role?.trim()) {
      const r = opts.role.trim().toLowerCase();
      baseWhere.roles = { string_contains: `"${r}"` };
    }

    if (scope === 'workspace' && opts?.workspaceId?.trim()) {
      const workspaceId = opts.workspaceId.trim();
      const where = {
        ...baseWhere,
        workspaceMemberships: {
          some: { workspaceId },
        },
      };
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            roles: true,
            position: true,
            isVerified: true,
            provider: true,
            createdAt: true,
            updatedAt: true,
            workspaceMemberships: {
              where: { workspaceId },
              select: {
                role: true,
                workspace: { select: { id: true, name: true } },
              },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);
      const sanitized = users.map((u) => {
        const s = this.sanitize(u as unknown as User);
        return {
          ...s,
          workspaces:
            (u as any).workspaceMemberships?.map((m: any) => ({
              id: m.workspace?.id,
              name: m.workspace?.name,
              role: m.role,
            })) ?? [],
        };
      });
      return {
        data: sanitized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const where = baseWhere;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          roles: true,
          position: true,
          isVerified: true,
          provider: true,
          createdAt: true,
          updatedAt: true,
          workspaceMemberships: {
            select: {
              role: true,
              workspace: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const sanitized = users.map((u) => {
      const s = this.sanitize(u as unknown as User);
      return {
        ...s,
        workspaces:
          (u as any).workspaceMemberships?.map((m: any) => ({
            id: m.workspace?.id,
            name: m.workspace?.name,
            role: m.role,
          })) ?? [],
      };
    });
    return {
      data: sanitized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
