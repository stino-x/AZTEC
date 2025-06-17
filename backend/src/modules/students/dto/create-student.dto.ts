import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  age: number;

  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @IsUUID()
  @IsNotEmpty()
  parentId: string;

  @IsString()
  @IsOptional()
  picture?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsDateString()
  @IsNotEmpty()
  admissionDate: Date;

  @IsString()
  @IsOptional()
  b2FileId?: string;

  @IsString()
  @IsOptional()
  b2FileName?: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  regNumber: string;
}
