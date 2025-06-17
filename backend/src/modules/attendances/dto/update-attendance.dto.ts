import { PartialType } from '@nestjs/swagger';
import { CreateAttendanceDto } from './create-attendance.dto';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {
  @IsDateString()
  @IsOptional()
  checkOutTime?: Date;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}
