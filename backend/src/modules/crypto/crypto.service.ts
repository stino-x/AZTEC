import { Injectable, Inject, forwardRef } from '@nestjs/common';
import * as ed from 'noble-ed25519';
import { KeyManagementService } from '../key-management/key-management.service';

@Injectable()
export class CryptoService {
  constructor(
    @Inject(forwardRef(() => KeyManagementService))
    private readonly keyManagementService: KeyManagementService,
  ) {}

  /**
   * Generate a new key pair
   */
  async generateKeyPair() {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKey(privateKey);
    return {
      privateKey: Buffer.from(privateKey).toString('base64'),
      publicKey: Buffer.from(publicKey).toString('base64'),
    };
  }

  async signData(data: string, privateKey: string) {
    return ed.sign(Buffer.from(data), Buffer.from(privateKey, 'base64'));
  }

  async verifySignature(data: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      // Convert base64 signature to Uint8Array
      const signatureBuffer = Buffer.from(signature, 'base64');
      const dataBuffer = Buffer.from(data);
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');
      
      return await ed.verify(signatureBuffer, dataBuffer, publicKeyBuffer);
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Get the current active signing key
   */
  async getCurrentSigningKey() {
    return this.keyManagementService.getCurrentKey();
  }

  /**
   * Get public key by ID
   */
  async getPublicKey(keyId: string) {
    return this.keyManagementService.getPublicKey(keyId);
  }
}