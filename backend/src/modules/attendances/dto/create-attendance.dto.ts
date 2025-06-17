import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @IsDateString()
  @IsNotEmpty()
  checkInTime: Date;

  @IsDateString()
  @IsOptional()
  checkOutTime?: Date;

  @IsNotEmpty()
  year: number;

  @IsNotEmpty()
  day: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  signature?: string;
}
