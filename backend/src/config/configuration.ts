import { registerAs } from '@nestjs/config';

interface DatabaseConfig {
  url: string;
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

interface SecurityConfig {
  bcryptSaltRounds: number;
  rateLimitTtl: number;
  rateLimitMax: number;
}

interface QrCodeConfig {
  errorCorrectionLevel: number;
  keyExpirationDays: number;
  qrCodeExpirationMinutes: number;
}

interface EmailConfig {
  from: string;
  host: string | undefined;
  port: number;
  user: string | undefined;
  password: string | undefined;
}

interface SmsConfig {
  accountSid: string | undefined;
  authToken: string | undefined;
  phoneNumber: string | undefined;
}

interface UploadsConfig {
  maxFileSize: number;
  uploadPath: string;
}

interface LoggingConfig {
  level: string;
  logToFile: boolean;
  logFilePath: string;
}

interface CorsConfig {
  origin: string[];
  methods: string[];
  credentials: boolean;
}

interface SwaggerConfig {
  enabled: boolean;
  username: string;
  password: string;
}

interface Config {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
  security: SecurityConfig;
  qrCode: QrCodeConfig;
  email: EmailConfig;
  sms: SmsConfig;
  uploads: UploadsConfig;
  logging: LoggingConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
}

export default registerAs('config', (): Config => ({
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: process.env.JWT_EXPIRATION_TIME || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },

  // Security
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // QR Code
  qrCode: {
    errorCorrectionLevel: parseInt(process.env.AZTEC_ERROR_CORRECTION_LEVEL || '23', 10),
    keyExpirationDays: parseInt(process.env.KEY_EXPIRATION_DAYS || '30', 10),
    qrCodeExpirationMinutes: parseInt(process.env.QR_CODE_EXPIRATION_MINUTES || '5', 10),
  },

  // Email
  email: {
    from: process.env.MAIL_FROM || 'noreply@aztecschool.com',
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
  },

  // SMS (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // File Uploads
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || (5 * 1024 * 1024).toString(), 10), // 5MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3001'],
    methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Swagger
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    username: process.env.SWAGGER_USERNAME || 'admin',
    password: process.env.SWAGGER_PASSWORD || 'admin',
  },
}));
