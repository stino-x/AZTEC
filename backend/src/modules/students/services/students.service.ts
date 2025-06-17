import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(createStudentDto: CreateStudentDto) {
    // Check for existing email or phone
    const existingStudent = await this.prisma.student.findFirst({
      where: {
        OR: [
          { email: createStudentDto.email },
          { phone: createStudentDto.phone },
          { regNumber: createStudentDto.regNumber },
        ],
      },
    });

    if (existingStudent) {
      throw new ConflictException('Student with this email, phone, or registration number already exists');
    }

    // Check if class exists
    const classExists = await this.prisma.class.findUnique({
      where: { id: createStudentDto.classId },
    });

    if (!classExists) {
      throw new NotFoundException(`Class with ID ${createStudentDto.classId} not found`);
    }

    // Check if parent exists
    const parentExists = await this.prisma.parent.findUnique({
      where: { id: createStudentDto.parentId },
    });

    if (!parentExists) {
      throw new NotFoundException(`Parent with ID ${createStudentDto.parentId} not found`);
    }

    return this.prisma.student.create({
      data: createStudentDto,
      include: {
        class: true,
        parent: true,
      },
    });
  }

  async findAll(params: { skip: number; take: number; search?: string; classId?: string }) {
    const { skip = 0, take = 10, search, classId } = params;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { regNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (classId) {
      where.classId = classId;
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        skip,
        take,
        where,
        include: {
          class: true,
          parent: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: skip ? Math.floor(skip / take) + 1 : 1,
        limit: take,
      },
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        parent: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        attendances: {
          orderBy: { checkInTime: 'desc' },
          take: 10, // Last 10 attendances
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    await this.findOne(id); // Check if student exists

    // If updating class, check if it exists
    if (updateStudentDto.classId) {
      const classExists = await this.prisma.class.findUnique({
        where: { id: updateStudentDto.classId },
      });
      if (!classExists) {
        throw new NotFoundException(`Class with ID ${updateStudentDto.classId} not found`);
      }
    }

    // If updating parent, check if it exists
    if (updateStudentDto.parentId) {
      const parentExists = await this.prisma.parent.findUnique({
        where: { id: updateStudentDto.parentId },
      });
      if (!parentExists) {
        throw new NotFoundException(`Parent with ID ${updateStudentDto.parentId} not found`);
      }
    }

    // Check for duplicate email, phone, or regNumber
    if (updateStudentDto.email || updateStudentDto.phone || updateStudentDto.regNumber) {
      const where: {
        NOT: { id: string };
        OR: Array<{ [key: string]: string }>;
      } = { 
        NOT: { id },
        OR: []
      };

      if (updateStudentDto.email) {
        where.OR.push({ email: updateStudentDto.email });
      }
      if (updateStudentDto.phone) {
        where.OR.push({ phone: updateStudentDto.phone });
      }
      if (updateStudentDto.regNumber) {
        where.OR.push({ regNumber: updateStudentDto.regNumber });
      }

      const existingStudent = await this.prisma.student.findFirst({ where });
      if (existingStudent) {
        throw new ConflictException('Another student with the same email, phone, or registration number already exists');
      }
    }

    // Remove undefined values
    const updateData: any = { ...updateStudentDto };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return this.prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        parent: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if student exists
    return this.prisma.student.delete({
      where: { id },
    });
  }
}
