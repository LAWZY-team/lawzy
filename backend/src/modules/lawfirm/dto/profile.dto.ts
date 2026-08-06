import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProfileFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fieldKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  group!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  aliases?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsIn(['individual', 'organization'])
  investorType?: 'individual' | 'organization';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileFieldDto)
  fields!: ProfileFieldDto[];
}

export class UpdateProfileDto {
  @IsInt()
  @Min(1)
  revision!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn(['individual', 'organization'])
  investorType?: 'individual' | 'organization';

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileFieldDto)
  fields?: ProfileFieldDto[];
}

export class ImportLocalProfileFieldDto {
  @IsString()
  id!: string;

  @IsString()
  group!: string;

  @IsString()
  label!: string;

  @IsString()
  value!: string;

  @IsString()
  aliases!: string;
}

export class ImportLocalProfileDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsIn(['individual', 'organization'])
  investorType!: 'individual' | 'organization';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLocalProfileFieldDto)
  fields!: ImportLocalProfileFieldDto[];
}

export class ImportLocalTemplateFieldDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsString()
  placeholder!: string;

  @IsString()
  mappedKey!: string;

  @IsIn(['auto', 'highlight', 'manual'])
  source!: 'auto' | 'highlight' | 'manual';

  @IsInt()
  count!: number;
}

export class ImportLocalTemplateDocumentDto {
  @IsString()
  id!: string;

  @IsString()
  fileName!: string;

  @IsIn(['docx', 'pdf'])
  fileType!: 'docx' | 'pdf';

  @IsIn(['draft', 'done'])
  status!: 'draft' | 'done';

  @IsString()
  plainText!: string;

  @IsOptional()
  @IsString()
  previewHtml?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLocalTemplateFieldDto)
  fields!: ImportLocalTemplateFieldDto[];
}

export class ImportLocalTemplateSetDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsIn(['draft', 'ready'])
  status!: 'draft' | 'ready';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLocalTemplateDocumentDto)
  documents!: ImportLocalTemplateDocumentDto[];
}

export class ImportLocalDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLocalProfileDto)
  profiles!: ImportLocalProfileDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportLocalTemplateSetDto)
  templates!: ImportLocalTemplateSetDto[];
}

export class ImportLocalDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  hash!: string;

  @ValidateNested()
  @Type(() => ImportLocalDataDto)
  data!: ImportLocalDataDto;
}
