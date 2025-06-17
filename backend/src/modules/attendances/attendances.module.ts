import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttendancesService } from './services/attendances.service';
import { AztecModule } from '../aztec/aztec.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AttendanceController } from './controllers/attendances.controller';

@Module({
  imports: [
    ConfigModule,
    AztecModule, 
    CryptoModule,
    PrismaModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendancesService],
  exports: [AttendancesService],
})
export class AttendancesModule {}
