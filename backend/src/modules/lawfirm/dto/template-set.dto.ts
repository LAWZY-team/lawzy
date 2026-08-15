import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTemplateSetDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['draft', 'ready'])
  status?: 'draft' | 'ready';

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: 'private' | 'public';
}

export class UpdateTemplateSetDto {
  @IsInt()
  @Min(1)
  revision!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['draft', 'ready'])
  status?: string;

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: string;
}

export class ReorderTemplateDocumentsDto {
  @IsInt()
  @Min(1)
  revision!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  documentIds!: string[];
}

export class UpdateTemplateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsIn(['draft', 'done'])
  status?: string;

  @IsOptional()
  @IsIn(['highlight', 'edit'])
  previewMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  previewHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  plainText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields?: TemplateFieldDto[];
}

export class TemplateFieldDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  label!: string;

  @IsString()
  placeholder!: string;

  @IsOptional()
  @IsString()
  mappedKey?: string;

  @IsOptional()
  @IsIn(['auto', 'highlight', 'manual', 'ai'])
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ScanTemplateDocumentDto {
  @IsOptional()
  useAi?: boolean;
}

export class UpdateTemplateSetFieldBindingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entitySelector?: string | null;
}