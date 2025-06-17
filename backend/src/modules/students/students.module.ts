import { Module } from '@nestjs/common';
import { StudentsService } from './services/students.service';
import { StudentsController } from './controllers/students.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, PrismaService],
  exports: [StudentsService],
})
export class StudentsModule {}
