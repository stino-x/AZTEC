import { Body, Controller, Get, Param, Post, NotFoundException, BadRequestException, Logger, ConflictException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '../../../prisma/prisma.service';
import { AztecService } from '../../aztec/aztec.service';
import { CryptoService } from '../../crypto/crypto.service';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  private readonly logger = new Logger(AttendanceController.name);
  private readonly DAILY_SCAN_LIMIT = 5; // Max scans per day for static cards

  constructor(
    private readonly aztec: AztecService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  @Get('code/:studentId')
  @ApiOperation({ summary: 'Generate AZTEC QR code for student attendance' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getCode(@Param('studentId') studentId: string) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Default to dynamic QR for mobile use
      const qrCodeBuffer = await this.aztec.generateAztecCode(studentId, 'DYNAMIC');
      
      return {
        success: true,
        data: {
          image: qrCodeBuffer.toString('base64'),
          studentId: student.id,
          regNumber: student.regNumber,
          name: `${student.name}`,
          mode: 'DYNAMIC',
          expiresIn: '30 seconds'
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('scan')
  @ApiOperation({ summary: 'Process scanned attendance QR code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'string', description: 'Scanned QR code payload' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Attendance processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid QR code format' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @ApiResponse({ status: 403, description: 'Card revoked or scan limit exceeded' })
  @ApiResponse({ status: 404, description: 'Student or signing key not found' })
  @ApiResponse({ status: 409, description: 'Attendance already recorded today' })
  async processScan(@Body() scanData: { payload: string }) {
    try {
      const [payload, signature, keyId] = scanData.payload.split('|');
      
      if (!payload || !signature || !keyId) {
        throw new BadRequestException('Invalid QR code format');
      }

      // Parse payload to determine mode
      const payloadData = JSON.parse(payload);
      
      if (payloadData.mode === 'STATIC') {
        return this.handleStaticCard(payloadData, signature, keyId);
      } else if (payloadData.mode === 'DYNAMIC') {
        return this.handleDynamicCode(payloadData, signature, keyId);
      } else {
        throw new BadRequestException('Invalid QR code mode');
      }
    } catch (error) {
      this.logger.error(`Attendance scan failed: ${error.message}`, error.stack);
      
      // Preserve specific error types
      if (error instanceof ConflictException || 
          error instanceof BadRequestException || 
          error instanceof NotFoundException ||
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to process attendance scan');
    }
  }

  private async handleStaticCard(
    payload: any, 
    signature: string, 
    keyId: string
  ) {
    const now = new Date();
    const studentId = payload.studentId;
    const cardVersion = payload.cardVersion || 0;

    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Card version check (revocation system)
    const currentVersion = student.lastQrUpdate?.getTime() || 0;
    if (cardVersion < currentVersion) {
      throw new ForbiddenException('Card revoked. Please get a new card.');
    }

    // Get signing key
    const key = await this.prisma.signingKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException('Invalid signing key');
    }
    
    // Verify signature
    const isValid = await this.crypto.verifySignature(
      JSON.stringify(payload),
      signature,
      key.publicKey
    );
    
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Daily scan limit per card
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const scanCount = await this.prisma.attendance.count({
      where: {
        studentId,
        signature: keyId, // Unique per card
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (scanCount >= this.DAILY_SCAN_LIMIT) {
      throw new ForbiddenException('Daily scan limit reached for this card');
    }

    // Check for existing attendance today
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        studentId,
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingAttendance) {
      throw new ConflictException('Attendance already recorded today');
    }

    // Record attendance
    const attendance = await this.prisma.attendance.create({
      data: {
        studentId,
        classId: student.classId || 'default-class',
        checkInTime: now,
        year: now.getFullYear(),
        day: now.getDay(),
        status: 'present',
        signature: keyId, // Store keyId to track card usage
      },
    });

    return {
      success: true,
      data: {
        attendanceId: attendance.id,
        studentId: attendance.studentId,
        classId: attendance.classId,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        mode: 'STATIC',
        scansToday: scanCount + 1
      },
    };
  }

  private async handleDynamicCode(
    payload: any, 
    signature: string, 
    keyId: string
  ) {
    const now = new Date();
    const studentId = payload.studentId;
    const timestamp = payload.timestamp;

    // Check expiration (30 seconds)
    const qrTimestamp = new Date(timestamp);
    if ((now.getTime() - qrTimestamp.getTime()) > 30000) {
      throw new BadRequestException('QR code has expired');
    }
    
    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get signing key
    const key = await this.prisma.signingKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException('Invalid signing key');
    }
    
    // Verify signature
    const isValid = await this.crypto.verifySignature(
      JSON.stringify(payload),
      signature,
      key.publicKey
    );
    
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Check for existing attendance today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        studentId,
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingAttendance) {
      throw new ConflictException('Attendance already recorded today');
    }

    // Record attendance
    const attendance = await this.prisma.attendance.create({
      data: {
        studentId,
        classId: student.classId || 'default-class',
        checkInTime: now,
        year: now.getFullYear(),
        day: now.getDay(),
        status: 'present',
        signature: keyId, // Store keyId for audit
      },
    });

    return {
      success: true,
      data: {
        attendanceId: attendance.id,
        studentId: attendance.studentId,
        classId: attendance.classId,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        mode: 'DYNAMIC'
      },
    };
  }
}