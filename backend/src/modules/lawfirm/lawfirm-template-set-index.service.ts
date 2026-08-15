import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { buildTemplateSetIndex } from './utils/lawfirm-template-set-index';
import { sortLawfirmFieldsBySourceOrder } from './utils/lawfirm-source-order';

@Injectable()
export class LawfirmTemplateSetIndexService {
  constructor(private readonly prisma: PrismaService) {}

  async rebuild(templateSetId: string) {
    const templateSet = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id: templateSetId },
      select: {
        id: true,
        workspaceId: true,
        documents: {
          select: {
            id: true,
            sortOrder: true,
            fields: {
              select: {
                id: true,
                label: true,
                placeholder: true,
                mappedKey: true,
                source: true,
                count: true,
                sortOrder: true,
                discovery: true,
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!templateSet) throw new NotFoundException('Template set not found');

    const registryFields = await this.prisma.lawfirmFieldDefinition.findMany({
      where: {
        status: 'active',
        OR: [{ scope: 'system' }, { workspaceId: templateSet.workspaceId }],
      },
      select: {
        id: true,
        canonicalKey: true,
        currentProfileKey: true,
        aliases: { select: { normalizedAlias: true } },
      },
    });
    const orderedDocuments = templateSet.documents.map((document) => ({
      ...document,
      fields: sortLawfirmFieldsBySourceOrder(document.fields),
    }));
    const index = buildTemplateSetIndex(orderedDocuments, registryFields);

    await this.prisma.$transaction(async (tx) => {
      for (const document of orderedDocuments) {
        await Promise.all(
          document.fields.map((field, sortOrder) =>
            tx.lawfirmTemplateField.update({
              where: { id: field.id },
              data: { sortOrder },
            }),
          ),
        );
      }
      const setFieldIds = new Map<string, string>();
      for (const field of index.fields) {
        const persisted = await tx.lawfirmTemplateSetField.upsert({
          where: {
            templateSetId_normalizedSlot: {
              templateSetId,
              normalizedSlot: field.normalizedSlot,
            },
          },
          create: { templateSetId, ...field },
          update: field,
          select: { id: true },
        });
        setFieldIds.set(field.normalizedSlot, persisted.id);
      }

      for (const slot of index.slots) {
        const templateSetFieldId = setFieldIds.get(slot.normalizedSlot);
        if (!templateSetFieldId) continue;
        await tx.lawfirmDocumentSlot.upsert({
          where: { occurrenceKey: slot.occurrenceKey },
          create: {
            documentId: slot.documentId,
            templateSetFieldId,
            legacyTemplateFieldId: slot.legacyTemplateFieldId,
            occurrenceKey: slot.occurrenceKey,
            sourceKind: slot.sourceKind,
            rawText: slot.rawText,
            labelText: slot.labelText,
            currentValue: slot.currentValue,
            leftContext: slot.leftContext,
            rightContext: slot.rightContext,
            anchor: slot.anchor
              ? (slot.anchor as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            occurrenceCount: slot.occurrenceCount,
            sortOrder: slot.sortOrder,
          },
          update: {
            documentId: slot.documentId,
            templateSetFieldId,
            legacyTemplateFieldId: slot.legacyTemplateFieldId,
            sourceKind: slot.sourceKind,
            rawText: slot.rawText,
            labelText: slot.labelText,
            currentValue: slot.currentValue,
            leftContext: slot.leftContext,
            rightContext: slot.rightContext,
            anchor: slot.anchor
              ? (slot.anchor as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            occurrenceCount: slot.occurrenceCount,
            sortOrder: slot.sortOrder,
          },
        });
      }

      await tx.lawfirmDocumentSlot.deleteMany({
        where: {
          document: { templateSetId },
          ...(index.slots.length
            ? {
                occurrenceKey: {
                  notIn: index.slots.map((slot) => slot.occurrenceKey),
                },
              }
            : {}),
        },
      });
      await tx.lawfirmTemplateSetField.deleteMany({
        where: {
          templateSetId,
          ...(index.fields.length
            ? {
                normalizedSlot: {
                  notIn: index.fields.map((field) => field.normalizedSlot),
                },
              }
            : {}),
        },
      });
    });

    return {
      templateSetId,
      uniqueFields: index.fields.length,
      occurrences: index.slots.reduce(
        (total, slot) => total + slot.occurrenceCount,
        0,
      ),
      conflicts: index.fields.filter(
        (field) => field.mappingStatus === 'conflict',
      ).length,
      needsReview: index.fields.filter(
        (field) => field.mappingStatus === 'needs_review',
      ).length,
    };
  }
}
