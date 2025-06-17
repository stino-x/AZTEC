import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @IsOptional()
  resetToken?: string;

  @IsDateString()
  @IsOptional()
  resetTokenExpiry?: Date;

  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @IsString()
  @IsOptional()
  password?: string;
}
