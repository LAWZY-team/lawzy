import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCustomFieldDefinitionDto } from './dto/field-registry.dto';
import { LawfirmFieldRegistryService } from './lawfirm-field-registry.service';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm/field-registry')
export class LawfirmFieldRegistryController {
  constructor(private readonly fieldRegistry: LawfirmFieldRegistryService) {}

  @Get()
  async list(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.fieldRegistry.list(req.user.userId, workspaceId);
  }

  @Post('custom')
  async createCustom(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateCustomFieldDefinitionDto,
  ) {
    return this.fieldRegistry.createCustom(req.user.userId, body);
  }
}
