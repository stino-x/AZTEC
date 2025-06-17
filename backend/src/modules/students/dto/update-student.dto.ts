import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsString()
  @IsOptional()
  qrCodeId?: string;

  @IsDateString()
  @IsOptional()
  qrCodeExpiresAt?: Date;

  @IsString()
  @IsOptional()
  signatureKeyId?: string;
}
