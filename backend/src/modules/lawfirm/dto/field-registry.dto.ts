import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateCustomFieldAliasDto {
  @IsString()
  @MaxLength(191)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;
}

export class CreateCustomFieldDefinitionDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  @MaxLength(191)
  labelVi!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  labelEn?: string;

  @IsIn(['individual', 'organization', 'representative', 'other'])
  group!: 'individual' | 'organization' | 'representative' | 'other';

  @IsOptional()
  @IsIn(['string', 'text', 'date', 'number', 'currency', 'boolean'])
  dataType?: 'string' | 'text' | 'date' | 'number' | 'currency' | 'boolean';

  @IsOptional()
  @IsArray()
  @ArrayUnique((alias: CreateCustomFieldAliasDto) => alias.value)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomFieldAliasDto)
  aliases?: CreateCustomFieldAliasDto[];
}
