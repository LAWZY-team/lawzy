import { PrismaClient } from '@prisma/client';
import {
  LAWFIRM_FIELD_DEFINITIONS,
  normalizeLawfirmFieldAlias,
} from '../src/modules/lawfirm/lawfirm-field-taxonomy';

const inferDataType = (canonicalKey: string): string => {
  if (
    canonicalKey.includes('date') ||
    canonicalKey.endsWith('_at') ||
    canonicalKey.includes('expiry')
  ) {
    return 'date';
  }
  if (canonicalKey.includes('capital')) return 'currency';
  return 'string';
};

export async function seedLawfirmFieldTaxonomy(
  prisma: PrismaClient,
): Promise<void> {
  for (const definition of LAWFIRM_FIELD_DEFINITIONS) {
    const persisted = await prisma.lawfirmFieldDefinition.upsert({
      where: { registryKey: `system:${definition.canonicalKey}` },
      update: {
        currentProfileKey: definition.currentProfileKey,
        group: definition.group,
        dataType: inferDataType(definition.canonicalKey),
        labelVi: definition.labelVi,
        labelEn: definition.labelEn,
        taxonomyVersion: 1,
        status: 'active',
      },
      create: {
        registryKey: `system:${definition.canonicalKey}`,
        canonicalKey: definition.canonicalKey,
        currentProfileKey: definition.currentProfileKey,
        group: definition.group,
        dataType: inferDataType(definition.canonicalKey),
        labelVi: definition.labelVi,
        labelEn: definition.labelEn,
        scope: 'system',
        taxonomyVersion: 1,
      },
    });
    const aliases = new Map<string, { alias: string; priority: number }>();
    for (const alias of definition.aliases) {
      aliases.set(normalizeLawfirmFieldAlias(alias), {
        alias,
        priority: 100,
      });
    }
    for (const key of [
      definition.canonicalKey,
      definition.currentProfileKey,
      ...(definition.legacyKeys ?? []),
    ]) {
      aliases.set(normalizeLawfirmFieldAlias(key), {
        alias: key,
        priority: 200,
      });
    }
    for (const [normalizedAlias, alias] of aliases) {
      await prisma.lawfirmFieldAlias.upsert({
        where: {
          fieldDefinitionId_normalizedAlias: {
            fieldDefinitionId: persisted.id,
            normalizedAlias,
          },
        },
        update: {
          alias: alias.alias,
          priority: alias.priority,
          source: 'seed',
        },
        create: {
          fieldDefinitionId: persisted.id,
          alias: alias.alias,
          normalizedAlias,
          source: 'seed',
          priority: alias.priority,
        },
      });
    }
  }
}
