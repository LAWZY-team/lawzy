import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { SourceProcessingService } from '../source-processing/source-processing.service';
import { BUILTIN_WORKFLOWS } from './builtin-workflows';
import type { Response } from 'express';
import { FilesService } from '../files/files.service';
import {
  serializeTabularCell,
  serializeTabularReview,
  serializeWorkflow,
  serializeDocument,
  serializeLpmsChat,
} from './lpms-serializer';

export interface ColumnConfig {
  index: number;
  name: string;
  prompt: string;
  format?: string;
  tags?: string[];
}

@Injectable()
export class LpmsAiService {
  private readonly logger = new Logger(LpmsAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly aiProvider: AiProviderService,
    private readonly sourceProcessing: SourceProcessingService,
    private readonly filesService: FilesService,
  ) {}

  private extractTextFromTipTap(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') {
      try {
        node = JSON.parse(node);
      } catch {
        return '';
      }
    }
    let text = '';
    if (node.text) {
      text += node.text;
    }
    if (node.content && Array.isArray(node.content)) {
      text += node.content.map((child) => this.extractTextFromTipTap(child)).join(' ');
    }
    return text;
  }

  async getDocumentText(docId: string): Promise<string> {
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
      include: { files: true },
    });
    if (!doc) return '';

    // 1. Try contentJSON
    let text = '';
    if (doc.contentJSON) {
      text = this.extractTextFromTipTap(doc.contentJSON);
    }

    if (text && text.trim().length > 0) {
      return text;
    }

    // 2. Try associated files in S3
    const file = doc.files?.[0];
    if (file) {
      try {
        const result = await this.sourceProcessing.extractText({
          type: file.mimeType.includes('pdf') ? 'pdf' : file.mimeType.includes('word') || file.mimeType.includes('docx') ? 'docx' : 'text',
          s3Key: file.s3Key,
          sourceUrl: null,
        });
        return result.text;
      } catch (err) {
        this.logger.warn(`Failed to extract text from file for doc ${docId}: ${(err as Error).message}`);
      }
    }

    return '';
  }

  // Workflows
  async listWorkflows(userId: string, workspaceId: string, type?: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    
    // Custom workspace workflows
    const custom = await this.prisma.lpmsWorkflow.findMany({
      where: {
        userId,
        isSystem: false,
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const system = type 
      ? BUILTIN_WORKFLOWS.filter(w => w.type === type)
      : BUILTIN_WORKFLOWS;

    return [
      ...custom.map((w) => serializeWorkflow(w as unknown as Record<string, unknown>)),
      ...system.map((w) => serializeWorkflow(w as unknown as Record<string, unknown>)),
    ];
  }

  async createWorkflow(userId: string, workspaceId: string, data: {
    title: string;
    type: string;
    promptMd?: string;
    columnsConfig?: any;
    practice?: string;
  }) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    if (!data.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    if (!['assistant', 'tabular'].includes(data.type)) {
      throw new BadRequestException("type must be 'assistant' or 'tabular'");
    }

    const created = await this.prisma.lpmsWorkflow.create({
      data: {
        userId,
        title: data.title.trim(),
        type: data.type,
        promptMd: data.promptMd ?? null,
        columnsConfig: data.columnsConfig ?? null,
        practice: data.practice ?? null,
        isSystem: false,
      },
    });
    return serializeWorkflow(created as unknown as Record<string, unknown>);
  }

  async getWorkflow(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    
    // Check builtins first
    const builtin = BUILTIN_WORKFLOWS.find(w => w.id === workflowId);
    if (builtin) return serializeWorkflow(builtin as unknown as Record<string, unknown>);

    const wf = await this.prisma.lpmsWorkflow.findUnique({
      where: { id: workflowId },
    });

    if (!wf || wf.userId !== userId) {
      throw new NotFoundException('Workflow not found');
    }

    return serializeWorkflow(wf as unknown as Record<string, unknown>);
  }

  async updateWorkflow(userId: string, workspaceId: string, workflowId: string, updates: any) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const wf = await this.prisma.lpmsWorkflow.findUnique({
      where: { id: workflowId },
    });
    if (!wf || wf.userId !== userId || wf.isSystem) {
      throw new NotFoundException('Workflow not found or not editable');
    }

    const updated = await this.prisma.lpmsWorkflow.update({
      where: { id: workflowId },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.promptMd !== undefined && { promptMd: updates.promptMd }),
        ...(updates.columnsConfig !== undefined && { columnsConfig: updates.columnsConfig }),
        ...(updates.practice !== undefined && { practice: updates.practice }),
      },
    });
    return serializeWorkflow(updated as unknown as Record<string, unknown>);
  }

  async deleteWorkflow(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const wf = await this.prisma.lpmsWorkflow.findUnique({
      where: { id: workflowId },
    });
    if (!wf || wf.userId !== userId || wf.isSystem) {
      throw new NotFoundException('Workflow not found or not deletable');
    }

    await this.prisma.lpmsWorkflow.delete({ where: { id: workflowId } });
    return { success: true };
  }

  async listHiddenWorkflows(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const rows = await this.prisma.lpmsHiddenWorkflow.findMany({
      where: { userId },
      select: { workflowId: true },
    });
    return rows.map((r) => r.workflowId);
  }

  async hideWorkflow(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    await this.prisma.lpmsHiddenWorkflow.upsert({
      where: { userId_workflowId: { userId, workflowId } },
      create: { userId, workflowId },
      update: {},
    });
    return { success: true };
  }

  async unhideWorkflow(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    await this.prisma.lpmsHiddenWorkflow.deleteMany({
      where: { userId, workflowId },
    });
    return { success: true };
  }

  async shareWorkflow(
    userId: string,
    workspaceId: string,
    workflowId: string,
    emails: string[],
    allowEdit: boolean,
  ) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const wf = await this.prisma.lpmsWorkflow.findUnique({ where: { id: workflowId } });
    if (!wf || wf.userId !== userId) {
      throw new NotFoundException('Workflow not found');
    }
    for (const email of emails) {
      const normalized = email.trim().toLowerCase();
      if (!normalized) continue;
      const existing = await this.prisma.lpmsWorkflowShare.findFirst({
        where: { workflowId, sharedWithEmail: normalized },
      });
      if (existing) {
        await this.prisma.lpmsWorkflowShare.update({
          where: { id: existing.id },
          data: { allowEdit },
        });
      } else {
        await this.prisma.lpmsWorkflowShare.create({
          data: { workflowId, sharedWithEmail: normalized, allowEdit },
        });
      }
    }
    return { success: true };
  }

  async listWorkflowShares(userId: string, workspaceId: string, workflowId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const shares = await this.prisma.lpmsWorkflowShare.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) => ({
      id: s.id,
      shared_with_email: s.sharedWithEmail,
      allow_edit: s.allowEdit,
      created_at: s.createdAt.toISOString(),
    }));
  }

  async deleteWorkflowShare(
    userId: string,
    workspaceId: string,
    workflowId: string,
    shareId: string,
  ) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    await this.prisma.lpmsWorkflowShare.deleteMany({
      where: { id: shareId, workflowId },
    });
    return { success: true };
  }

  // Tabular Reviews
  async listReviews(userId: string, workspaceId: string, projectId?: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const reviews = await this.prisma.tabularReview.findMany({
      where: {
        workspaceId,
        ...(projectId && { projectId }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map((r) => {
      const docIds = (r.documentIds as unknown as string[]) ?? [];
      return serializeTabularReview(r as unknown as Record<string, unknown>, {
        document_count: docIds.length,
      });
    });
  }

  async createReview(userId: string, workspaceId: string, data: {
    title?: string;
    documentIds: string[];
    columnsConfig: ColumnConfig[];
    workflowId?: string;
    projectId?: string;
  }) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    if (data.projectId) {
      const proj = await this.prisma.project.findFirst({
        where: { id: data.projectId, workspaceId },
      });
      if (!proj) {
        throw new BadRequestException('Project not found');
      }
    }

    const review = await this.prisma.tabularReview.create({
      data: {
        userId,
        workspaceId,
        title: data.title ?? 'Untitled Review',
        columnsConfig: data.columnsConfig as any,
        documentIds: data.documentIds,
        projectId: data.projectId ?? null,
        workflowId: data.workflowId ?? null,
      },
    });

    if (data.documentIds?.length) {
      const cells = data.documentIds.flatMap((docId) =>
        data.columnsConfig.map((col) => ({
          reviewId: review.id,
          documentId: docId,
          columnIndex: col.index,
          status: 'pending',
        })),
      );
      await this.prisma.tabularCell.createMany({ data: cells });
    }

    const docIds = (review.documentIds as unknown as string[]) ?? [];
    return serializeTabularReview(review as unknown as Record<string, unknown>, {
      document_count: docIds.length,
    });
  }

  async getReview(userId: string, workspaceId: string, id: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const review = await this.prisma.tabularReview.findFirst({
      where: { id, workspaceId },
      include: {
        cells: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const docIds = (review.documentIds as unknown as string[]) ?? [];
    const documents = await this.prisma.document.findMany({
      where: { id: { in: docIds }, workspaceId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      review: serializeTabularReview(review as unknown as Record<string, unknown>, {
        document_count: docIds.length,
      }),
      cells: review.cells.map((c) =>
        serializeTabularCell(c as unknown as Record<string, unknown>),
      ),
      documents: documents.map((d) =>
        serializeDocument(d as unknown as Record<string, unknown>),
      ),
    };
  }

  async updateReview(userId: string, workspaceId: string, id: string, updates: any) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const review = await this.prisma.tabularReview.findFirst({
      where: { id, workspaceId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.tabularReview.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.columnsConfig !== undefined && { columnsConfig: updates.columnsConfig }),
        ...(updates.documentIds !== undefined && { documentIds: updates.documentIds }),
        ...(updates.projectId !== undefined && { projectId: updates.projectId }),
        ...(updates.sharedWith !== undefined && { sharedWith: updates.sharedWith }),
      },
    });

    if (updates.documentIds || updates.columnsConfig) {
      const newDocIds = updates.documentIds ?? ((review.documentIds as unknown as string[]) ?? []);
      const newCols = updates.columnsConfig ?? ((review.columnsConfig as unknown as ColumnConfig[]) ?? []);

      const existingCells = await this.prisma.tabularCell.findMany({
        where: { reviewId: id },
      });

      // Clear/delete cells no longer needed
      const currentKeys = new Set(
        newDocIds.flatMap((dId: string) => newCols.map((c: ColumnConfig) => `${dId}:${c.index}`)),
      );

      const toDelete = existingCells.filter(
        c => !currentKeys.has(`${c.documentId}:${c.columnIndex}`),
      );

      if (toDelete.length) {
        await this.prisma.tabularCell.deleteMany({
          where: { id: { in: toDelete.map(c => c.id) } },
        });
      }

      // Add missing cells
      const existingKeys = new Set(existingCells.map(c => `${c.documentId}:${c.columnIndex}`));
      const toInsert = newDocIds.flatMap((docId: string) =>
        newCols
          .filter((col: ColumnConfig) => !existingKeys.has(`${docId}:${col.index}`))
          .map((col: ColumnConfig) => ({
            reviewId: id,
            documentId: docId,
            columnIndex: col.index,
            status: 'pending',
          })),
      );

      if (toInsert.length) {
        await this.prisma.tabularCell.createMany({ data: toInsert });
      }
    }

    const docIds = (updated.documentIds as unknown as string[]) ?? [];
    return serializeTabularReview(updated as unknown as Record<string, unknown>, {
      document_count: docIds.length,
    });
  }

  async getReviewPeople(userId: string, workspaceId: string, reviewId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const review = await this.prisma.tabularReview.findFirst({
      where: { id: reviewId, workspaceId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: review.userId },
      select: { id: true, email: true, name: true },
    });
    const sharedEmails = (review.sharedWith as string[] | null) ?? [];
    const members = await this.prisma.user.findMany({
      where: { email: { in: sharedEmails } },
      select: { email: true, name: true },
    });
    const memberByEmail = new Map(members.map((m) => [m.email, m.name]));
    return {
      owner: {
        user_id: owner?.id ?? review.userId,
        email: owner?.email ?? null,
        display_name: owner?.name ?? null,
      },
      members: sharedEmails.map((email) => ({
        email,
        display_name: memberByEmail.get(email) ?? null,
      })),
    };
  }

  async deleteReview(userId: string, workspaceId: string, id: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const review = await this.prisma.tabularReview.findFirst({
      where: { id, workspaceId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.tabularReview.delete({ where: { id } });
    return { success: true };
  }

  async clearCells(userId: string, workspaceId: string, id: string, documentIds: string[]) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const review = await this.prisma.tabularReview.findFirst({
      where: { id, workspaceId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.tabularCell.updateMany({
      where: {
        reviewId: id,
        documentId: { in: documentIds },
      },
      data: {
        content: null,
        status: 'pending',
      },
    });

    return { success: true };
  }

  async generatePrompt(userId: string, workspaceId: string, title: string, format: string, tags?: string[]) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    
    const formatDescriptions: Record<string, string> = {
      text: "free-form text",
      bulleted_list: "a bulleted list",
      number: "a single number",
      percentage: "a percentage value",
      monetary_amount: "a monetary amount",
      currency: "a currency code",
      yes_no: "Yes or No",
      date: "a date",
      tag: tags?.length ? `one of these tags: ${tags.join(", ")}` : "a tag",
    };
    const formatHint = formatDescriptions[format] ?? "free-form text";
    const tagsNote = format === "tag" && tags?.length ? `\nAvailable tags: ${tags.join(", ")}` : "";

    const userMessage =
      `Column title: ${title}` +
      `\nExpected response format: ${formatHint}` +
      tagsNote +
      `\n\nWrite the best extraction prompt for a legal tabular review column with this title. ` +
      `Do NOT include any instruction about the response format in the prompt — ` +
      `format handling is applied separately and must not be duplicated inside the prompt text.`;

    const systemPrompt =
      'You write high-quality column prompts for legal tabular review workflows. Return only valid JSON with a single field: {"prompt": string}. The prompt you write must focus solely on what to extract — never on how to format the response.';

    try {
      const response = await this.aiProvider.generateContentWithRetry({
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty completion from AI');

      const parsed = JSON.parse(text.trim());
      return { prompt: parsed.prompt?.trim() || '' };
    } catch (err) {
      this.logger.error(`Failed to generate prompt: ${(err as Error).message}`);
      throw new BadRequestException('Failed to generate prompt from AI');
    }
  }

  async regenerateCell(userId: string, workspaceId: string, reviewId: string, documentId: string, columnIndex: number) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    
    const review = await this.prisma.tabularReview.findFirst({
      where: { id: reviewId, workspaceId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const columns = (review.columnsConfig as unknown as ColumnConfig[] ?? []);
    const column = columns.find(c => c.index === columnIndex);
    if (!column) {
      throw new BadRequestException('Column config not found');
    }

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.tabularCell.updateMany({
      where: { reviewId, documentId, columnIndex },
      data: { status: 'generating', content: null },
    });

    try {
      const documentText = await this.getDocumentText(documentId);
      const result = await this.queryTabularCell(
        doc.title,
        documentText,
        column.prompt,
        column.format,
        column.tags,
      );

      if (!result) {
        throw new Error('LLM returned null result');
      }

      await this.prisma.tabularCell.updateMany({
        where: { reviewId, documentId, columnIndex },
        data: {
          content: JSON.stringify(result),
          status: 'done',
        },
      });

      return result;
    } catch (err) {
      await this.prisma.tabularCell.updateMany({
        where: { reviewId, documentId, columnIndex },
        data: { status: 'error' },
      });
      throw err;
    }
  }

  private formatPromptSuffix(format?: string, tags?: string[]): string {
    switch (format) {
      case "bulleted_list":
        return ' The "summary" field in your JSON response must be a markdown bulleted list only — no prose. Format: each item on its own line, prefixed with "* " (asterisk + single space), e.g.\n* First item\n* Second item\n* Third item';
      case "number":
        return ' The "summary" field in your JSON response must be a single number only. No units or explanation.';
      case "percentage":
        return ' The "summary" field in your JSON response must be a single percentage value only (e.g. 42%). No explanation.';
      case "monetary_amount":
        return ' The "summary" field in your JSON response must be the monetary value only, including currency symbol (e.g. $1,234.56). No explanation.';
      case "currency":
        return ' The "summary" field in your JSON response must contain only the currency code(s). Wrap each code in double square brackets, e.g. [[USD]] or [[EUR]]. No other text.';
      case "yes_no":
        return ' The "summary" field in your JSON response must be [[Yes]] or [[No]] only. The "reasoning" field MUST include an inline citation [[page:N||quote:verbatim excerpt <= 25 words]] pointing to the exact language in the document that supports the Yes/No answer.';
      case "date":
        return ' The "summary" field in your JSON response must be the date only in DD Month YYYY format (e.g. 1 January 2024). If a range, give both dates separated by an em dash. The "reasoning" field MUST include an inline citation [[page:N||quote:verbatim excerpt <= 25 words]] pointing to the exact place in the document where the date is found.';
      case "tag":
        return tags?.length
          ? ` The "summary" field in your JSON response must contain exactly one tag wrapped in double square brackets. Available tags: ${tags.map((t) => `[[${t}]]`).join(", ")}. No other text. The "reasoning" field MUST include an inline citation [[page:N||quote:verbatim excerpt <= 25 words]] pointing to the exact language in the document that supports the chosen tag.`
          : "";
      default:
        return "";
    }
  }

  private async queryTabularCell(
    filename: string,
    documentText: string,
    columnPrompt: string,
    format?: string,
    tags?: string[],
  ) {
    const suffix = this.formatPromptSuffix(format, tags);
    const fullPrompt = `${columnPrompt}${suffix} If not found, state "Not Found". Leave all reasoning and explanation in the "reasoning" field only.`;

    const EXTRACTION_SYSTEM = `You are a legal document analyst. Return ONLY valid JSON:
{"summary": string, "flag": "green"|"grey"|"yellow"|"red", "reasoning": string}

The "summary" and "reasoning" field values may use markdown formatting (bullets, bold, italics, etc.) — the values are still plain JSON strings (escape newlines as \\n), but the text inside will be rendered as markdown in the UI.

The "summary" field must contain only the extracted value with inline citations — no explanation or reasoning. Every factual claim in "summary" must be followed immediately by a citation in the format [[page:N||quote:exact quoted text]], where N is the page number and the quote is a short verbatim excerpt (<= 25 words). The quote must be narrowly scoped to the specific claim it supports — extract only the exact words that support that statement, not the surrounding sentence or paragraph. Do not have multiple claims share the same long quote; if two different statements need different evidence, give each its own short, precise quote. All reasoning and explanation belongs in "reasoning" only, which may also contain citations.`;

    try {
      const response = await this.aiProvider.generateContentWithRetry({
        contents: `Document: ${filename}\n\n${documentText.slice(0, 120000)}\n\n---\nInstruction: ${fullPrompt}`,
        config: {
          systemInstruction: EXTRACTION_SYSTEM,
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
        },
      });

      const text = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text.trim());
      return {
        summary: String(parsed.summary ?? parsed.value ?? "").trim() || "Not addressed",
        flag: (["green", "grey", "yellow", "red"] as const).includes(parsed.flag as "green")
          ? (parsed.flag as string)
          : "grey",
        reasoning: String(parsed.reasoning ?? ""),
      };
    } catch (err) {
      this.logger.error(`Failed to complete cell extract: ${(err as Error).message}`);
      return null;
    }
  }

  // Bulk generate review cells using SSE
  async generateReview(userId: string, workspaceId: string, reviewId: string, res: Response) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    const review = await this.prisma.tabularReview.findFirst({
      where: { id: reviewId, workspaceId },
      include: { cells: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const columns = (review.columnsConfig as unknown as ColumnConfig[] ?? []);
    if (columns.length === 0) {
      throw new BadRequestException('No columns configured');
    }

    const docIds = (review.documentIds as unknown as string[]) ?? [];
    const documents = await this.prisma.document.findMany({
      where: { id: { in: docIds }, workspaceId },
    });

    const cellMap = new Map(
      review.cells.map((c) => [`${c.documentId}:${c.columnIndex}`, c]),
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const write = (line: string) => res.write(line);

    try {
      await Promise.all(
        documents.map(async (doc) => {
          const docId = doc.id;
          const documentText = await this.getDocumentText(docId);

          const columnsToProcess = columns.filter((col) => {
            const cell = cellMap.get(`${docId}:${col.index}`);
            return !(cell?.status === 'done' && cell?.content);
          });
          if (columnsToProcess.length === 0) return;

          for (const col of columnsToProcess) {
            write(
              `data: ${JSON.stringify({ type: 'cell_update', document_id: docId, column_index: col.index, content: null, status: 'generating' })}\n\n`,
            );
            await this.prisma.tabularCell.updateMany({
              where: { reviewId, documentId: docId, columnIndex: col.index },
              data: { status: 'generating', content: null },
            });
          }

          const client = this.aiProvider.getClient();
          const model = this.aiProvider.getModelName();

          const columnsDesc = columnsToProcess
            .map((col) => {
              const suffix = this.formatPromptSuffix(col.format, col.tags);
              const fullPrompt = `${col.prompt}${suffix} If not found, state "Not Found".`;
              return `Column ${col.index} — "${col.name}": ${fullPrompt}`;
            })
            .join('\n');

          const SYSTEM = `You are a legal document analyst. Extract information for each column listed below.

For each column, output exactly one minified JSON object on its own line (no line breaks inside the JSON), then a newline. Process columns in order and output each result as soon as you finish it.

Line format:
{"column_index": <N>, "summary": <string>, "flag": <"green"|"grey"|"yellow"|"red">, "reasoning": <string>}

Rules:
- "summary": the extracted value with inline citations [[page:N||quote:verbatim excerpt <= 25 words]] after every factual claim. No explanation or reasoning here. Quotes must be narrowly scoped to the specific supporting words.
- "flag": green = favorable, yellow = warning, red = problematic, grey = neutral/not found
- "reasoning": brief explanation of the extraction
- Output ONLY the JSON lines themselves. Do NOT wrap the response in markdown code fences (e.g. \`\`\`json), and do not add any preamble or summary.`;

          const receivedColumns = new Set<number>();

          try {
            const responseStream = await client.models.generateContentStream({
              model,
              contents: `Document: ${doc.title}\n\n${documentText.slice(0, 120000)}\n\n---\nColumns to extract:\n${columnsDesc}`,
              config: { systemInstruction: SYSTEM },
            });

            let buffer = '';
            for await (const chunk of responseStream) {
              buffer += chunk.text;
              let newlineIdx: number;
              while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIdx).trim();
                buffer = buffer.slice(newlineIdx + 1);
                if (!line) continue;
                try {
                  const parsed = JSON.parse(line);
                  const colIdx = Number(parsed.column_index);
                  receivedColumns.add(colIdx);
                  const cellResult = {
                    summary: String(parsed.summary ?? parsed.value ?? '').trim() || 'Not addressed',
                    flag: (['green', 'grey', 'yellow', 'red'] as const).includes(parsed.flag as 'green')
                      ? (parsed.flag as string)
                      : 'grey',
                    reasoning: String(parsed.reasoning ?? ''),
                  };
                  await this.prisma.tabularCell.updateMany({
                    where: { reviewId, documentId: docId, columnIndex: colIdx },
                    data: { content: JSON.stringify(cellResult), status: 'done' },
                  });
                  write(
                    `data: ${JSON.stringify({ type: 'cell_update', document_id: docId, column_index: colIdx, content: cellResult, status: 'done' })}\n\n`,
                  );
                } catch {
                  /* skip invalid JSON line */
                }
              }
            }
          } catch (err) {
            this.logger.error(
              `[tabular/generate] doc=${docId} ${(err as Error).message}`,
            );
          }

          for (const col of columnsToProcess) {
            if (!receivedColumns.has(col.index)) {
              await this.prisma.tabularCell.updateMany({
                where: { reviewId, documentId: docId, columnIndex: col.index },
                data: { status: 'error' },
              });
              write(
                `data: ${JSON.stringify({ type: 'cell_update', document_id: docId, column_index: col.index, content: null, status: 'error' })}\n\n`,
              );
            }
          }
        }),
      );

      write('data: [DONE]\n\n');
    } catch (err) {
      this.logger.error(`Error streaming review: ${(err as Error).message}`);
      write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\ndata: [DONE]\n\n`);
    } finally {
      res.end();
    }
  }

  // Chats inside Tabular Reviews
  async listChats(userId: string, workspaceId: string, reviewId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    return this.prisma.tabularReviewChat.findMany({
      where: { reviewId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getChatMessages(userId: string, workspaceId: string, reviewId: string, chatId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    return this.prisma.tabularReviewChatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteChat(userId: string, workspaceId: string, chatId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    await this.prisma.tabularReviewChat.deleteMany({
      where: { id: chatId, userId },
    });
    return { success: true };
  }

  async chatWithTable(userId: string, workspaceId: string, reviewId: string, body: {
    messages: any[];
    chatId?: string;
    reviewTitle?: string;
  }, res: Response) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    const lastUser = [...body.messages].reverse().find(m => m.role === 'user');
    if (!lastUser?.content?.trim()) {
      throw new BadRequestException('messages must include a user message');
    }

    const review = await this.prisma.tabularReview.findFirst({
      where: { id: reviewId, workspaceId },
      include: { cells: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const docIds = (review.documentIds as unknown as string[]) ?? [];
    const documents = await this.prisma.document.findMany({
      where: { id: { in: docIds }, workspaceId },
    });

    let chatId = body.chatId;
    if (!chatId) {
      const chat = await this.prisma.tabularReviewChat.create({
        data: {
          reviewId,
          userId,
          title: lastUser.content.slice(0, 40) + '...',
        },
      });
      chatId = chat.id;
    }

    await this.prisma.tabularReviewChatMessage.create({
      data: {
        chatId,
        role: 'user',
        content: lastUser.content,
      },
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const write = (line: string) => res.write(line);
    write(`data: ${JSON.stringify({ type: "chat_id", chatId })}\n\n`);

    try {
      let client = this.aiProvider.getClient();
      const model = this.aiProvider.getModelName();

      const columns = (review.columnsConfig as unknown as ColumnConfig[] ?? []);
      const tableContext = this.buildTableContextMarkdown(columns, documents, review.cells);

      const systemPrompt = `You are Lawzy, an AI legal assistant. You are helping with the tabular review titled "${review.title || 'Untitled Review'}".
You have access to the structured table content below. Use it to answer the user's questions about the contracts.

TABLE DATA:
${tableContext}

Answer in clear, concise prose. You may use markdown formatting.
Response language: Respond in the same language the user uses (e.g., if the user communicates in Vietnamese, reply in Vietnamese; if in English, reply in English).`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...body.messages.map(m => ({ role: m.role, content: m.content })),
      ];

      let responseStream;
      try {
        responseStream = await client.models.generateContentStream({
          model,
          contents: apiMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }]
          })),
        });
      } catch (err) {
        const errStr = String(err?.message || err?.stack || err || '');
        const isAuthError = errStr.includes('invalid_grant') || 
                            errStr.includes('invalid_rapt') || 
                            errStr.includes('unauthorized') || 
                            errStr.includes('auth') ||
                            errStr.includes('credential');
        if (isAuthError) {
          this.logger.warn(`Auth error in tabular chat stream. Retrying with fallback: ${errStr}`);
          this.aiProvider.markVertexAuthFailed();
          client = this.aiProvider.getClient();
          responseStream = await client.models.generateContentStream({
            model,
            contents: apiMessages.map(msg => ({
              role: msg.role === 'system' ? 'user' : msg.role,
              parts: [{ text: msg.content }]
            })),
          });
        } else {
          throw err;
        }
      }

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        fullText += text;
        write(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`);
      }

      await this.prisma.tabularReviewChatMessage.create({
        data: {
          chatId,
          role: 'assistant',
          content: fullText,
        },
      });

      await this.prisma.tabularReviewChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      write("data: [DONE]\n\n");
    } catch (err) {
      this.logger.error(`Error in tabular chat stream: ${(err as Error).message}`);
      write(`data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\ndata: [DONE]\n\n`);
    } finally {
      res.end();
    }
  }

  private buildTableContextMarkdown(columns: ColumnConfig[], docs: any[], cells: any[]): string {
    const lines: string[] = ["| Document | " + columns.map(c => c.name).join(" | ") + " |"];
    lines.push("|---| " + columns.map(() => "---").join(" | ") + " |");

    docs.forEach(doc => {
      const rowCells = columns.map(col => {
        const cell = cells.find(c => c.documentId === doc.id && c.columnIndex === col.index);
        if (!cell || !cell.content) return 'N/A';
        try {
          const content = JSON.parse(cell.content);
          return content.summary || 'N/A';
        } catch {
          return cell.content;
        }
      });
      lines.push(`| ${doc.title} | ` + rowCells.join(" | ") + " |");
    });

    return lines.join("\n");
  }

  async serveDocumentFile(userId: string, workspaceId: string, documentId: string, res: Response) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { files: true },
    });
    if (!doc || !doc.files || doc.files.length === 0) {
      throw new NotFoundException('No files associated with this document');
    }
    const file = doc.files[0];
    const { body, contentType, name } = await this.filesService.getDownloadStream(file.id, userId);
    if (!body) {
      throw new NotFoundException('File not found in S3');
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`
    );
    for await (const chunk of body as any) {
      res.write(chunk);
    }
    res.end();
  }

  async getDocumentVersions(userId: string, workspaceId: string, documentId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { versions: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const versions = doc.versions.map((v, idx) => ({
      id: v.id,
      version_number: idx + 1,
      source: 'upload' as const,
      created_at: v.createdAt.toISOString(),
    }));

    return {
      current_version_id: versions[versions.length - 1]?.id ?? null,
      versions,
    };
  }

  // Standalone LPMS Chats
  async listStandaloneChats(userId: string, limit?: number) {
    const workspaceId = await this.workspaceAccess.getUserFirstWorkspaceId(userId);
    if (!workspaceId) {
      throw new BadRequestException('User does not belong to any workspace');
    }
    const chats = await this.prisma.lpmsChat.findMany({
      where: { userId, workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: limit ? Number(limit) : undefined,
    });
    return chats.map(c => ({
      id: c.id,
      workspace_id: c.workspaceId,
      project_id: c.projectId,
      user_id: c.userId,
      title: c.title,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    }));
  }

  async createStandaloneChat(userId: string, projectId?: string) {
    let workspaceId: string | null = null;
    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      });
      if (project) {
        workspaceId = project.workspaceId;
      }
    }
    if (!workspaceId) {
      workspaceId = await this.workspaceAccess.getUserFirstWorkspaceId(userId);
    }
    if (!workspaceId) {
      throw new BadRequestException('User does not belong to any workspace');
    }

    const chat = await this.prisma.lpmsChat.create({
      data: {
        userId,
        workspaceId,
        projectId: projectId || null,
        title: 'Cuộc hội thoại mới',
      },
    });

    return {
      id: chat.id,
      workspace_id: chat.workspaceId,
      project_id: chat.projectId,
      user_id: chat.userId,
      title: chat.title,
      created_at: chat.createdAt.toISOString(),
      updated_at: chat.updatedAt.toISOString(),
    };
  }

  async getStandaloneChat(userId: string, chatId: string) {
    const chat = await this.prisma.lpmsChat.findFirst({
      where: { id: chatId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!chat) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    return {
      chat: {
        id: chat.id,
        workspace_id: chat.workspaceId,
        project_id: chat.projectId,
        user_id: chat.userId,
        title: chat.title,
        created_at: chat.createdAt.toISOString(),
        updated_at: chat.updatedAt.toISOString(),
      },
      messages: chat.messages.map((m) => {
        let files = undefined;
        let workflow = undefined;
        if (m.annotations && typeof m.annotations === 'object') {
          const ann = m.annotations as any;
          if (ann.files) files = ann.files;
          if (ann.workflow) workflow = ann.workflow;
        }
        return {
          id: m.id,
          chat_id: m.chatId,
          role: m.role,
          content: m.content,
          annotations: m.annotations,
          files,
          workflow,
          created_at: m.createdAt.toISOString(),
        };
      }),
    };
  }

  async renameStandaloneChat(userId: string, chatId: string, title: string) {
    const chat = await this.prisma.lpmsChat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    await this.prisma.lpmsChat.update({
      where: { id: chatId },
      data: { title },
    });
    return { success: true };
  }

  async deleteStandaloneChat(userId: string, chatId: string) {
    const chat = await this.prisma.lpmsChat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }
    await this.prisma.lpmsChat.delete({
      where: { id: chatId },
    });
    return { success: true };
  }

  async streamStandaloneChat(
    userId: string,
    body: { messages: any[]; chat_id?: string; project_id?: string; model?: string },
    res: Response,
  ) {
    const lastUser = [...body.messages].reverse().find(m => m.role === 'user');
    if (!lastUser?.content?.trim()) {
      throw new BadRequestException('messages must include a user message');
    }

    let chatId = body.chat_id;
    if (!chatId) {
      let workspaceId: string | null = null;
      if (body.project_id) {
        const project = await this.prisma.project.findUnique({
          where: { id: body.project_id },
          select: { workspaceId: true },
        });
        if (project) {
          workspaceId = project.workspaceId;
        }
      }
      if (!workspaceId) {
        workspaceId = await this.workspaceAccess.getUserFirstWorkspaceId(userId);
      }
      if (!workspaceId) {
        throw new BadRequestException('User does not belong to any workspace');
      }

      const chat = await this.prisma.lpmsChat.create({
        data: {
          userId,
          workspaceId,
          projectId: body.project_id || null,
          title: lastUser.content.slice(0, 40) + '...',
        },
      });
      chatId = chat.id;
    }

    await this.prisma.lpmsChatMessage.create({
      data: {
        chatId,
        role: 'user',
        content: lastUser.content,
        annotations: {
          files: lastUser.files || null,
          workflow: lastUser.workflow || null,
        },
      },
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const write = (line: string) => res.write(line);
    write(`data: ${JSON.stringify({ type: 'chat_id', chatId })}\n\n`);

    try {
      let client = this.aiProvider.getClient();
      const model = this.aiProvider.getModelName();

      let systemPrompt = `You are Lawzy, a premium AI legal assistant helping the user with legal research, drafting, and contract analysis.
Answer in clear, concise prose. You may use markdown formatting.
Response language: Respond in the same language the user uses (e.g., if the user communicates in Vietnamese, reply in Vietnamese; if in English, reply in English).`;

      // Collect document IDs from all user messages in the chat history
      const docIds = new Set<string>();
      if (body.messages && Array.isArray(body.messages)) {
        for (const msg of body.messages) {
          if (msg.files && Array.isArray(msg.files)) {
            for (const f of msg.files) {
              if (f.document_id) {
                docIds.add(f.document_id);
              }
            }
          }
        }
      }

      if (docIds.size > 0) {
        const docContexts: string[] = [];
        for (const docId of docIds) {
          try {
            const doc = await this.prisma.document.findUnique({
              where: { id: docId },
            });
            if (doc) {
              const text = await this.getDocumentText(docId);
              if (text && text.trim()) {
                docContexts.push(`Document Title: ${doc.title}\nDocument Content:\n${text.trim()}`);
              }
            }
          } catch (err) {
            this.logger.error(`Error loading document text for RAG: ${(err as Error).message}`);
          }
        }
        if (docContexts.length > 0) {
          const contextPrefix = `[CONTEXT DOCUMENTS]\n${docContexts.join('\n\n')}\n\n---\n\n`;
          systemPrompt = contextPrefix + systemPrompt;
        }
      }

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...body.messages.map(m => ({ role: m.role, content: m.content })),
      ];

      let responseStream;
      try {
        responseStream = await client.models.generateContentStream({
          model,
          contents: apiMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }]
          })),
        });
      } catch (err) {
        const errStr = String(err?.message || err?.stack || err || '');
        const isAuthError = errStr.includes('invalid_grant') || 
                            errStr.includes('invalid_rapt') || 
                            errStr.includes('unauthorized') || 
                            errStr.includes('auth') ||
                            errStr.includes('credential');
        if (isAuthError) {
          this.logger.warn(`Auth error in standalone chat stream. Retrying with fallback: ${errStr}`);
          this.aiProvider.markVertexAuthFailed();
          client = this.aiProvider.getClient();
          responseStream = await client.models.generateContentStream({
            model,
            contents: apiMessages.map(msg => ({
              role: msg.role === 'system' ? 'user' : msg.role,
              parts: [{ text: msg.content }]
            })),
          });
        } else {
          throw err;
        }
      }

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        fullText += text;
        write(`data: ${JSON.stringify({ type: 'content_delta', text })}\n\n`);
      }

      await this.prisma.lpmsChatMessage.create({
        data: {
          chatId,
          role: 'assistant',
          content: fullText,
        },
      });

      await this.prisma.lpmsChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      write(`data: ${JSON.stringify({ type: 'content_done' })}\n\n`);
      write('data: [DONE]\n\n');
    } catch (err) {
      this.logger.error(`Error in standalone chat stream: ${(err as Error).message}`);
      write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\ndata: [DONE]\n\n`);
    } finally {
      res.end();
    }
  }
}
