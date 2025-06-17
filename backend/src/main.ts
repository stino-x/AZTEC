import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { Logger as WinstonLogger } from 'winston';
import { LoggerService } from './common/logger/logger.service';
import Config from './config/configuration';

async function bootstrap() {
  // Create app with Winston logger
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get config service
  const configService = app.get(ConfigService);
  const config = configService.get<ReturnType<typeof Config>>('config');
  if (!config) {
    throw new Error('Configuration not found');
  }
  const logger = app.get(LoggerService);

  // Set global logger
  app.useLogger(logger);

  // Enable CORS
  app.enableCors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    credentials: config.cors.credentials,
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Cookie parser
  app.use(cookieParser());

  // Swagger documentation
  if (config.swagger.enabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AZTEC API')
      .setDescription('AZTEC School Management System API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Start the application
  const port = config.port;
  await app.listen(port, '0.0.0.0');
  
  // Log application start
  logger.log(`Application is running in ${config.nodeEnv} mode`);
  logger.log(`Application is running on: http://localhost:${port}`);
  
  if (config.swagger.enabled) {
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Start the application
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${error.message}`, error.stack);
  process.exit(1);
});
