import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { getGeminiSanitizerEnv } from '../../config/env';
import { parseMarkdownToTiptap } from './markdown-parser';
import { buildContractTemplateJson } from '../contract-templates/build-contract-template-json';
import * as crypto from 'crypto';

@Injectable()
export class LlmExperimentService {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(LlmExperimentService.name);

  constructor(private readonly prisma: PrismaService) {
    const env = getGeminiSanitizerEnv();
    this.genAI = new GoogleGenerativeAI(env.apiKey);
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isHighDemand = error.message && error.message.toLowerCase().includes('high demand');
        const is503 = error.status === 503;
        if ((isHighDemand || is503) && attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          this.logger.warn(`API high demand. Retrying attempt ${attempt + 1}/${maxRetries} in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  /**
   * Generates contract via LLM in the specified format, parses it, and logs the experiment.
   */
  async generateAndLog(prompt: string, format: 'json' | 'markdown', promptHash: string) {
    const env = getGeminiSanitizerEnv();
    const isJson = format === 'json';
    
    // Create format-specific instructions
    const formatInstruction = isJson
      ? `\n\nReturn EXACTLY a valid JSON object matching the predefined contract structure.`
      : `\n\nReturn the contract STRICTLY as a Markdown document. Use '#' for the title, '## Article X' or '## Điều X' for clauses, and standard '-' for bullet points. Do NOT output JSON.`;

    const fullPrompt = prompt + formatInstruction;

    const model = this.genAI.getGenerativeModel({
      model: env.model,
      generationConfig: {
        responseMimeType: isJson ? 'application/json' : 'text/plain',
      },
    });

    const startTime = Date.now();
    let isSuccess = false;
    let errorMessage: string | null = null;
    let rawOutput = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const result = await this.withRetry(() => model.generateContent(fullPrompt));
      const response = result.response;
      rawOutput = response.text();
      
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        inputTokens = usageMetadata.promptTokenCount || 0;
        outputTokens = usageMetadata.candidatesTokenCount || 0;
      } else {
        inputTokens = 0;
        outputTokens = rawOutput.length / 4; 
      }

      // Verify Parsing
      try {
        if (isJson) {
           const obj = JSON.parse(rawOutput);
           if (obj && typeof obj === 'object') {
             isSuccess = true;
           }
        } else {
           const parsed = parseMarkdownToTiptap(rawOutput);
           if (parsed && parsed.content && parsed.content.length > 0) {
             isSuccess = true;
           }
        }
        
        if (!isSuccess && !errorMessage) {
           errorMessage = "Parsed result was empty or malformed";
           this.logger.error(`[${format}] Validation Failed: ${errorMessage}`);
        }
      } catch (parseError: any) {
        errorMessage = "Parsing Error: " + parseError.message;
        isSuccess = false;
        this.logger.error(`[${format}] Parse Error:`, parseError);
      }

    } catch (apiError: any) {
      errorMessage = "API Error: " + apiError.message;
      isSuccess = false;
      this.logger.error(`[${format}] API Error:`, apiError);
    }

    const latencyMs = Date.now() - startTime;

    // Log to Prisma
    await this.prisma.llmExperimentLog.create({
      data: {
        promptHash,
        format,
        inputTokens,
        outputTokens,
        latencyMs,
        isSuccess,
        rawOutput,
        errorMessage,
      },
    });

    return {
      format,
      latencyMs,
      inputTokens,
      outputTokens,
      isSuccess,
      errorMessage,
    };
  }

  /**
   * Run the A/B test by calling both variants simultaneously.
   */
  async runParallelTest(testPrompt: string) {
    const hash = crypto.createHash('sha256').update(testPrompt).digest('hex').substring(0, 10) + '-' + Date.now();
    
    this.logger.log(`Starting parallel LLM test [Hash: ${hash}]`);
    
    const [jsonResult, markdownResult] = await Promise.all([
      this.generateAndLog(testPrompt, 'json', hash),
      this.generateAndLog(testPrompt, 'markdown', hash),
    ]);

    return {
      promptHash: hash,
      jsonResult,
      markdownResult,
    };
  }

  /**
   * Aggregate metrics for the comparison report.
   */
  async getMetrics() {
    const logs = await this.prisma.llmExperimentLog.findMany();
    
    const jsonLogs = logs.filter(l => l.format === 'json');
    const mdLogs = logs.filter(l => l.format === 'markdown');

    const aggregate = (arr: any[]) => {
      const count = arr.length;
      if (count === 0) return null;
      
      const successCount = arr.filter(x => x.isSuccess).length;
      const avgInputTokens = arr.reduce((a, b) => a + b.inputTokens, 0) / count;
      const avgOutputTokens = arr.reduce((a, b) => a + b.outputTokens, 0) / count;
      const avgLatency = arr.reduce((a, b) => a + b.latencyMs, 0) / count;

      return {
        count,
        successRate: (successCount / count) * 100,
        avgInputTokens,
        avgOutputTokens,
        avgLatency,
      };
    };

    return {
      json: aggregate(jsonLogs),
      markdown: aggregate(mdLogs),
      totalTests: logs.length / 2, // Assuming pairs
    };
  }
}
