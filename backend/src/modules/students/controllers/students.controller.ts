import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Student with this email/phone/regNumber already exists' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of students' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('search') search?: string,
    @Query('classId') classId?: string,
  ) {
    return this.studentsService.findAll({
      skip: (page - 1) * limit,
      take: limit,
      search,
      classId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiResponse({ status: 200, description: 'Student details' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a student' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Email/phone/regNumber already in use' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a student' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.remove(id);
  }

  // students.controller.ts
@Post(':id/issue-card')
@ApiOperation({ summary: 'Issue new static QR card' })
async issueCard(@Param('id') studentId: string) {
  const student = await this.prisma.student.update({
    where: { id: studentId },
    data: { 
      qrMode: 'STATIC',
      lastQrUpdate: new Date() 
    }
  });

  const qrCode = await this.aztec.generateAztecCode(studentId, 'STATIC');
  
  return {
    success: true,
    data: {
      image: qrCode.toString('base64'),
      issueDate: new Date(),
      cardVersion: student.lastQrUpdate.getTime()
    }
  };
}

@Post(':id/revoke-card')
@ApiOperation({ summary: 'Revoke static QR card' })
async revokeCard(@Param('id') studentId: string) {
  await this.prisma.student.update({
    where: { id: studentId },
    data: { lastQrUpdate: new Date() }
  });

  return { success: true, message: 'Card revoked. New card required.' };
}
}
