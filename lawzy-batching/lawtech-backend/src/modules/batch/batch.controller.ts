import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from "@nestjs/common";
import { BatchService } from "./batch.service";
import type { BatchRequestDto } from "./dto/batch-request.dto";

@Controller("batch")
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  async createBatch(
    @Body() body: BatchRequestDto,
    @Headers("x-backend-secret") backendSecret?: string
  ) {
    const expectedSecret = process.env.BACKEND_SECRET;

    if (expectedSecret && backendSecret !== expectedSecret) {
      throw new ForbiddenException("Invalid backend secret");
    }

    return this.batchService.batchFill(body);
  }
}
