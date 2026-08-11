import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { CreateCustomFieldDefinitionDto } from './dto/field-registry.dto';
import { normalizeLawfirmFieldAlias } from './lawfirm-field-taxonomy';

@Injectable()
export class LawfirmFieldRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    return this.prisma.lawfirmFieldDefinition.findMany({
      where: {
        status: 'active',
        OR: [{ scope: 'system' }, { workspaceId }],
      },
      include: { aliases: { orderBy: { priority: 'desc' } } },
      orderBy: [{ scope: 'asc' }, { canonicalKey: 'asc' }],
    });
  }

  async resolveCandidates(workspaceId: string, alias: string) {
    const normalizedAlias = normalizeLawfirmFieldAlias(alias);
    if (!normalizedAlias) return [];
    const matches = await this.prisma.lawfirmFieldAlias.findMany({
      where: {
        normalizedAlias,
        fieldDefinition: {
          status: 'active',
          OR: [{ scope: 'system' }, { workspaceId }],
        },
      },
      include: { fieldDefinition: true },
      orderBy: { priority: 'desc' },
    });
    return matches.map((match) => match.fieldDefinition);
  }

  async createCustom(userId: string, dto: CreateCustomFieldDefinitionDto) {
    await this.workspaceAccess.requireMembership(dto.workspaceId, userId);
    const label = dto.labelVi.trim();
    const normalizedAliases = [
      normalizeLawfirmFieldAlias(label),
      ...(dto.aliases ?? []).map((alias) =>
        normalizeLawfirmFieldAlias(alias.value),
      ),
    ].filter(Boolean);
    const distinctAliases = [...new Set(normalizedAliases)];
    const duplicate = await this.prisma.lawfirmFieldAlias.findFirst({
      where: {
        normalizedAlias: { in: distinctAliases },
        fieldDefinition: {
          status: 'active',
          OR: [{ scope: 'system' }, { workspaceId: dto.workspaceId }],
        },
      },
      include: { fieldDefinition: true },
    });
    if (duplicate) {
      throw new ConflictException(
        `Custom field alias already belongs to ${duplicate.fieldDefinition.canonicalKey}`,
      );
    }

    const customId = `custom-${randomUUID()}`;
    const aliasInputs = new Map<
      string,
      { alias: string; locale?: string; priority: number }
    >();
    aliasInputs.set(normalizeLawfirmFieldAlias(label), {
      alias: label,
      locale: 'vi',
      priority: 100,
    });
    for (const alias of dto.aliases ?? []) {
      const normalized = normalizeLawfirmFieldAlias(alias.value);
      if (!normalized || aliasInputs.has(normalized)) continue;
      aliasInputs.set(normalized, {
        alias: alias.value.trim(),
        locale: alias.locale,
        priority: 50,
      });
    }

    return this.prisma.lawfirmFieldDefinition.create({
      data: {
        registryKey: `workspace:${dto.workspaceId}:${customId}`,
        workspaceId: dto.workspaceId,
        canonicalKey: customId,
        currentProfileKey: customId,
        group: dto.group,
        dataType: dto.dataType ?? 'string',
        labelVi: label,
        labelEn: dto.labelEn?.trim() || label,
        scope: 'workspace',
        taxonomyVersion: 1,
        createdBy: userId,
        aliases: {
          create: [...aliasInputs.entries()].map(
            ([normalizedAlias, alias]) => ({
              alias: alias.alias,
              normalizedAlias,
              locale: alias.locale,
              source: 'user',
              priority: alias.priority,
            }),
          ),
        },
      },
      include: { aliases: true },
    });
  }
}
