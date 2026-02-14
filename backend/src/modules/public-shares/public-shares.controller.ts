import { BadRequestException, Controller, Get, Header, NotFoundException, Param, Post, Body } from '@nestjs/common';
import { PublicSharesService } from './public-shares.service';

function assertToken(token: string): string {
  const t = (token ?? '').trim();
  // base64url token (crypto.randomBytes().toString('base64url'))
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(t)) {
    throw new BadRequestException('Invalid token');
  }
  return t;
}

@Controller('public-shares')
export class PublicSharesController {
  constructor(private readonly service: PublicSharesService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: { title?: string; html?: string }) {
    const title = body.title != null ? String(body.title).trim() : undefined;
    const html = body.html != null ? String(body.html) : '';
    try {
      return await this.service.createSnapshot({ title: title || undefined, html });
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid request');
    }
  }

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  async get(@Param('token') tokenRaw: string) {
    const token = assertToken(tokenRaw);
    const snap = await this.service.getSnapshot(token);
    if (!snap) throw new NotFoundException('Share not found');
    return snap;
  }
}

