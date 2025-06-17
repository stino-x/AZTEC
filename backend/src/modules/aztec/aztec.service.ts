import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bwipjs from 'bwip-js';

import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../crypto/crypto.service';
import { KeyManagementService } from '../key-management/key-management.service';

@Injectable()
export class AztecService {
  private readonly logger = new Logger(AztecService.name);
  private readonly QR_EXPIRATION_MS: number;

  constructor(
    private readonly crypto: CryptoService,
    private readonly keyManagementService: KeyManagementService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.QR_EXPIRATION_MS = parseInt(
      this.configService.get<string>('QR_EXPIRATION_MS', '30000'),
    );
  }

  /**
   * Generates an AZTEC QR code for student attendance
   * @param studentId The ID of the student
   * @returns A promise that resolves to a Buffer containing the QR code image
   */
  async generateAztecCode(studentId: string, qrMode: 'DYNAMIC' | 'STATIC' = 'DYNAMIC'): Promise<Buffer> {
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is not set');
    }
    
    try {
      // Find student
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, regNumber: true, classId: true },
      });

      

      if (!student) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      let payload;
  
  if (qrMode === 'STATIC') {
    // Static card payload
    payload = JSON.stringify({
      studentId: student.id,
      regNumber: student.regNumber,
      classId: student.classId,
      mode: 'STATIC',
      cardVersion: student.lastQrUpdate?.getTime() || 0
    });
  } else {
    // Dynamic payload
    payload = JSON.stringify({
      studentId: student.id,
      regNumber: student.regNumber,
      classId: student.classId,
      mode: 'DYNAMIC',
      timestamp: new Date().toISOString()
    });
  }

      // Get the current active key
      const key = await this.keyManagementService.getCurrentKey();
      if (!key) {
        throw new Error('No active signing key found');
      }

      // Prepare payload
       payload = JSON.stringify({
        studentId: student.id,
        regNumber: student.regNumber,
        classId: student.classId,
        timestamp: new Date().toISOString(),
      });

      // Sign the payload with the current key's private key
      const signature = await this.crypto.signData(
        payload,
        process.env.PRIVATE_KEY,
      );
      const signatureBase64 = Buffer.from(signature).toString('base64');
      
      // Combine data for QR code
      const fullData = `${payload}|${signatureBase64}|${key.id}`;
      
      // Generate QR code
      return new Promise<Buffer>((resolve, reject) => {
        const options = {
          bcid: 'azteccode',
          text: fullData,
          height: 15,
          width: 15,
          includetext: false,
          alttext: `Student: ${student.regNumber}`,
          eclevel: parseInt(
            this.configService.get<string>('AZTEC_ERROR_CORRECTION_LEVEL', '23'),
          ),
        };

        bwipjs.toBuffer(options, (err, png) => {
          if (err) {
            this.logger.error('Failed to generate QR code', err);
            reject(new Error('Failed to generate QR code'));
          } else {
            resolve(png);
          }
        });
      });
    } catch (error) {
      this.logger.error(`Failed to generate AZTEC code: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifies and decodes scanned AZTEC code data
   * @param scannedData The scanned data string from the QR code
   * @returns Verification result with extracted data
   */
  async verifyAndDecode(scannedData: string): Promise<{
    valid: boolean;
    studentId?: string;
    classId?: string;
    error?: string;
    payload?: any;
  }> {
    try {
      const [payload, signature, keyId] = scannedData.split('|');
      
      if (!payload || !signature || !keyId) {
        return {
          valid: false,
          error: 'Invalid data format - missing components',
        };
      }

      // Parse payload and check expiration
      let payloadData;
      try {
        payloadData = JSON.parse(payload);
      } catch (e) {
        return {
          valid: false,
          error: 'Invalid payload format',
        };
      }

      // Check expiration
      const now = new Date();
      const qrTimestamp = new Date(payloadData.timestamp);
      const timeDiff = now.getTime() - qrTimestamp.getTime();
      
      if (timeDiff > this.QR_EXPIRATION_MS) {
        return {
          valid: false,
          error: `QR code expired ${Math.floor(timeDiff / 1000)} seconds ago`,
        };
      }

      // Retrieve the public key
      const key = await this.prisma.signingKey.findUnique({
        where: { id: keyId },
      });

      if (!key) {
        return {
          valid: false,
          error: 'Signing key not found',
        };
      }

      // Verify the signature
      const isValid = await this.crypto.verifySignature(
        payload,
        signature,
        key.publicKey,
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid signature',
        };
      }

      return {
        valid: true,
        studentId: payloadData.studentId,
        classId: payloadData.classId,
        payload: payloadData,
      };
    } catch (error) {
      this.logger.error(`Verification failed: ${error.message}`, error.stack);
      return {
        valid: false,
        error: 'Internal server error during verification',
      };
    }
  }
}