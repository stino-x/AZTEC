import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagementService.name);
  private keyRotationInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // Initialize key rotation on module init
      await this.initializeKeyRotation();
      // Schedule key rotation
      this.scheduleKeyRotation();
    } catch (error) {
      this.logger.error('Failed to initialize key management', error);
    }
  }

  /**
   * Initialize key rotation by ensuring we have at least one active key
   */
  private async initializeKeyRotation() {
    const activeKey = await this.getCurrentKey();
    
    if (!activeKey) {
      this.logger.log('No active key found, generating a new one...');
      await this.generateNewKey();
    } else {
      this.logger.log(`Active key found: ${activeKey.id}`);
    }
  }

  /**
   * Schedule key rotation based on configuration
   */
  private scheduleKeyRotation() {
    const rotationIntervalMs = this.configService.get<number>(
      'KEY_ROTATION_INTERVAL_MS', 
      30 * 24 * 60 * 60 * 1000 // Default: 30 days
    );
    
    this.keyRotationInterval = setInterval(async () => {
      try {
        await this.rotateKeys();
      } catch (error) {
        this.logger.error('Failed to rotate keys', error);
      }
    }, rotationIntervalMs);
  }

  /**
   * Generate a new signing key pair
   */
  async generateNewKey() {
    const keyPair = await this.cryptoService.generateKeyPair();
    const keyExpiryDays = this.configService.get<number>('SIGNING_KEY_EXPIRY_DAYS', 90);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + keyExpiryDays);

    // Store only the public key (private key remains in env variable)
    return this.prisma.signingKey.create({
      data: {
        publicKey: keyPair.publicKey,
        expiresAt,
        revoked: false,
      },
    });
  }

  /**
   * Rotate keys by generating a new one and revoking expired keys
   */
  async rotateKeys() {
    this.logger.log('Starting key rotation...');
    
    // Generate a new key
    const newKey = await this.generateNewKey();
    
    // Revoke expired keys (not including the new key)
    const { count } = await this.prisma.signingKey.updateMany({
      where: {
        id: { not: newKey.id },
        revoked: false,
        expiresAt: { lt: new Date() },
      },
      data: {
        revoked: true,
      },
    });

    this.logger.log(`Key rotation completed. Generated new key ${newKey.id}, revoked ${count} expired keys.`);
    return { newKey, revokedCount: count };
  }

  /**
   * Get the current active key
   */
  async getCurrentKey() {
    return this.prisma.signingKey.findFirst({
      where: { 
        revoked: false, 
        expiresAt: { gt: new Date() } 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get public key by ID
   */
  async getPublicKey(keyId: string) {
    const key = await this.prisma.signingKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (key.revoked) {
      throw new Error(`Key has been revoked: ${keyId}`);
    }

    if (key.expiresAt < new Date()) {
      throw new Error(`Key has expired: ${keyId}`);
    }

    return key.publicKey;
  }

  /**
   * Clean up resources on module destruction
   */
  onModuleDestroy() {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
    }
  }
}