import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  async create(createAttendanceDto: CreateAttendanceDto) {
    // Check if student exists
    const student = await this.prisma.student.findUnique({
      where: { id: createAttendanceDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${createAttendanceDto.studentId} not found`);
    }

    // Check if class exists
    const classExists = await this.prisma.class.findUnique({
      where: { id: createAttendanceDto.classId },
    });

    if (!classExists) {
      throw new NotFoundException(`Class with ID ${createAttendanceDto.classId} not found`);
    }

    // Check if student is in the specified class
    if (student.classId !== createAttendanceDto.classId) {
      throw new ConflictException('Student is not enrolled in the specified class');
    }

    // Check for existing attendance on the same day
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        studentId: createAttendanceDto.studentId,
        year: createAttendanceDto.year,
        day: createAttendanceDto.day,
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Attendance already recorded for this student on this day');
    }

    return this.prisma.attendance.create({
      data: {
        ...createAttendanceDto,
        status: createAttendanceDto.status || 'present',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            regNumber: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(params: {
    skip: number;
    take: number;
    studentId?: string;
    classId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  }) {
    const { skip = 0, take = 10, studentId, classId, dateFrom, dateTo, status } = params;
    
    const where: any = {};
    
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (status) where.status = status;
    
    if (dateFrom || dateTo) {
      where.checkInTime = {};
      if (dateFrom) where.checkInTime.gte = dateFrom;
      if (dateTo) where.checkInTime.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        skip,
        take,
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              regNumber: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { checkInTime: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
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
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            regNumber: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        class: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return attendance;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    const attendance = await this.findOne(id);
    
    // If updating student or class, verify they exist and are valid
    if (updateAttendanceDto.studentId || updateAttendanceDto.classId) {
      if (updateAttendanceDto.studentId && updateAttendanceDto.studentId !== attendance.studentId) {
        const student = await this.prisma.student.findUnique({
          where: { id: updateAttendanceDto.studentId },
        });
        
        if (!student) {
          throw new NotFoundException(`Student with ID ${updateAttendanceDto.studentId} not found`);
        }
      }
      
      if (updateAttendanceDto.classId && updateAttendanceDto.classId !== attendance.classId) {
        const classExists = await this.prisma.class.findUnique({
          where: { id: updateAttendanceDto.classId },
        });
        
        if (!classExists) {
          throw new NotFoundException(`Class with ID ${updateAttendanceDto.classId} not found`);
        }
      }
      
      // If both student and class are being updated, verify the student is in the class
      if (updateAttendanceDto.studentId && updateAttendanceDto.classId) {
        const studentInClass = await this.prisma.student.findFirst({
          where: {
            id: updateAttendanceDto.studentId,
            classId: updateAttendanceDto.classId,
          },
        });
        
        if (!studentInClass) {
          throw new ConflictException('Student is not enrolled in the specified class');
        }
      }
    }
    
    // If updating date, check for conflicts
    if (updateAttendanceDto.year || updateAttendanceDto.day) {
      const year = updateAttendanceDto.year || attendance.year;
      const day = updateAttendanceDto.day || attendance.day;
      
      const existingAttendance = await this.prisma.attendance.findFirst({
        where: {
          id: { not: id },
          studentId: updateAttendanceDto.studentId || attendance.studentId,
          year,
          day,
        },
      });
      
      if (existingAttendance) {
        throw new ConflictException('Attendance already recorded for this student on this day');
      }
    }

    // Remove undefined values
    const updateData: any = { ...updateAttendanceDto };
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return this.prisma.attendance.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            regNumber: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if attendance exists
    return this.prisma.attendance.delete({
      where: { id },
    });
  }

  async recordAttendance(scannedData: string) {
    const verification = await this.aztecService.verifyAndDecode(scannedData);
    
    if (!verification.valid || !verification.studentId || !verification.classId) {
      throw new Error(`Invalid attendance record: ${verification.error}`);
    }

    return this.prisma.attendance.create({
      data: {
        studentId: verification.studentId,
        classId: verification.classId,
        checkInTime: new Date(),
        year: new Date().getFullYear(),
        day: new Date().getDay(),
        status: 'present',
      },
    });
  }

  async getTodaysAttendance(studentId: string) {
    const today = new Date();
    return this.prisma.attendance.findFirst({
      where: {
        studentId,
        checkInTime: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });
  }
}
