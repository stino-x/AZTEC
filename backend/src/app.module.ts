import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { KeyManagementModule } from './modules/key-management/key-management.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { AztecModule } from './modules/aztec/aztec.module';

@Module({
  imports: [
    // Core modules
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    AppConfigModule,
    
    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // Time window in milliseconds (60,000ms = 1 minute)
          limit: 100, // Max requests per IP in this window
        },
      ],
    }),
    
    // Task scheduling
    ScheduleModule.forRoot(),
    
    // Application modules
    PrismaModule,
    LoggerModule,
    UsersModule,
    StudentsModule,
    AttendancesModule,
    KeyManagementModule,
    ConfigModule.forRoot(),
    PrismaModule,
    CryptoModule,
    AztecModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
