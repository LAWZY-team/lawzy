import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ApproveExtractionFieldDto {
  @IsString()
  @IsNotEmpty()
  fieldKey!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  aliases?: string;
}

export class ApproveExtractionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveExtractionFieldDto)
  approvedFields!: ApproveExtractionFieldDto[];
}

export class RejectExtractionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateExtractionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
