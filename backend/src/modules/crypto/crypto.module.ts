import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { KeyManagementModule } from '../key-management/key-management.module';
import { CryptoService } from './crypto.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => KeyManagementModule),
  ],
  providers: [CryptoService],
  exports: [
    CryptoService,
    forwardRef(() => KeyManagementModule), // Re-export KeyManagementModule to avoid circular dependency
  ],
})
export class CryptoModule {}
