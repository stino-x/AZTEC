import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CryptoModule } from '../crypto/crypto.module';
import { KeyManagementModule } from '../key-management/key-management.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AztecService } from './aztec.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => CryptoModule),
    forwardRef(() => KeyManagementModule),
    PrismaModule,
  ],
  providers: [AztecService],
  exports: [AztecService],
})
export class AztecModule {}
