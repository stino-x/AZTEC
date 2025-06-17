import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { KeyManagementService } from './key-management.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule, 
    forwardRef(() => CryptoModule),
  ],
  providers: [KeyManagementService],
  exports: [
    KeyManagementService,
    forwardRef(() => CryptoModule), // Re-export CryptoModule to avoid circular dependency
  ],
})
export class KeyManagementModule {}