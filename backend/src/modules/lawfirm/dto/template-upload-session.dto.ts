import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTemplateUploadSessionDto {
  @IsString()
  @IsNotEmpty()
  templateSetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
