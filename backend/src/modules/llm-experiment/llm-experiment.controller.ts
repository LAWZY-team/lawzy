import { Body, Controller, Get, Post } from '@nestjs/common';
import { LlmExperimentService } from './llm-experiment.service';

@Controller('llm-experiment')
export class LlmExperimentController {
  constructor(private readonly llmExperimentService: LlmExperimentService) {}

  @Post('run-test')
  async runParallelTest(@Body() body: { prompt: string }) {
    if (!body.prompt) {
      return { error: 'Prompt is required' };
    }
    return this.llmExperimentService.runParallelTest(body.prompt);
  }

  @Get('metrics')
  async getMetrics() {
    return this.llmExperimentService.getMetrics();
  }
}
