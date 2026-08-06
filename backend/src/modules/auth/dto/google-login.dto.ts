import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LOGIN_PRODUCTS } from '../login-product';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsIn(LOGIN_PRODUCTS)
  loginProduct?: (typeof LOGIN_PRODUCTS)[number];
}
