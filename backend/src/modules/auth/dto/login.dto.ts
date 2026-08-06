import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { LOGIN_PRODUCTS } from '../login-product';

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

  /** clm | lpms | lawfirm — ghi nhận ngữ cảnh đăng nhập, không phải sản phẩm mặc định */
  @IsOptional()
  @IsIn(LOGIN_PRODUCTS)
  loginProduct?: (typeof LOGIN_PRODUCTS)[number];
}
