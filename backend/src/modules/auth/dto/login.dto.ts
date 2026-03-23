import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  /** Optional: khi đăng nhập loại doanh nghiệp - mã công ty để chọn workspace */
  @IsOptional()
  @IsString()
  companyCode?: string;

  @IsOptional()
  @IsString()
  accountType?: string;
}
