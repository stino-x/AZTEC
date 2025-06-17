import { Injectable, Inject, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

interface LoggerConfig {
  level: string;
  logToFile: boolean;
  logFilePath: string;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private config: LoggerConfig;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const defaultConfig: LoggerConfig = {
      level: 'info',
      logToFile: false,
      logFilePath: './logs/app.log',
    };
    
    const config = this.configService.get<LoggerConfig>('logging');
    this.config = { ...defaultConfig, ...config };
    this.initializeLogger();
  }

  private initializeLogger() {
    const { level, logToFile, logFilePath } = this.config;
    
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(
            ({ level, message, context, timestamp, stack, ...meta }) => {
              const contextStr = context ? `[${context}]` : '';
              const stackStr = stack ? `\n${stack}` : '';
              const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
              return `${timestamp} ${level}: ${contextStr} ${message}${metaStr}${stackStr}`;
            },
          ),
        ),
      }),
    ];

    if (logToFile) {
      const fileTransport = new DailyRotateFile({
        filename: `${logFilePath}.%DATE%`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      });
      transports.push(fileTransport as unknown as winston.transport);
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports,
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }
}
