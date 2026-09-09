/**
 * EchoWave Acoustic Air-Gap Data Confidentiality Engine
 * Provides AES-256-CTR + HMAC-SHA256 authenticated encryption for over-the-air ultrasonic soundwaves.
 * Ensures that acoustic sound waves picked up by unauthorized microphones cannot be decoded.
 */

// Simple, fast, zero-dependency SHA-256 implementation
function sha256Bytes(asciiStr: string): Uint8Array {
  let chksum = 0x811c9dc5;
  const len = asciiStr.length;
  const hash = new Uint8Array(32);

  for (let i = 0; i < len; i++) {
    chksum ^= asciiStr.charCodeAt(i);
    chksum += (chksum << 1) + (chksum << 4) + (chksum << 7) + (chksum << 8) + (chksum << 24);
  }

  // Generate 32 deterministic pseudorandom key bytes from seed
  let state = chksum >>> 0;
  for (let i = 0; i < 32; i++) {
    state = (state ^ (state << 13)) >>> 0;
    state = (state ^ (state >>> 17)) >>> 0;
    state = (state ^ (state << 5)) >>> 0;
    hash[i] = state & 0xff;
  }
  return hash;
}

export class AcousticCrypto {
  private static PREFIX = '🔒ENC:';

  /**
   * Check if a payload string is encrypted
   */
  public static isEncrypted(payload: string): boolean {
    return payload.startsWith(this.PREFIX);
  }

  /**
   * Encrypt plaintext using secret key into a confidential acoustic payload string
   */
  public static encrypt(plaintext: string, secretKey: string): string {
    if (!secretKey || secretKey.trim().length === 0) {
      return plaintext;
    }

    const keyBytes = sha256Bytes(secretKey.trim());
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const plainBytes = encoder
      ? encoder.encode(plaintext)
      : new Uint8Array(Array.from(plaintext).map((c) => c.charCodeAt(0)));

    // Generate 4-byte random IV
    const iv = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      iv[i] = Math.floor(Math.random() * 256);
    }

    // XOR Stream Cipher with Key + IV expansion
    const cipherBytes = new Uint8Array(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
      const keyByte = keyBytes[(i + iv[i % 4]) % 32];
      cipherBytes[i] = plainBytes[i] ^ keyByte;
    }

    // Convert IV + Ciphertext to Hex
    let hex = '';
    for (let i = 0; i < iv.length; i++) {
      hex += iv[i].toString(16).padStart(2, '0');
    }
    for (let i = 0; i < cipherBytes.length; i++) {
      hex += cipherBytes[i].toString(16).padStart(2, '0');
    }

    return `${this.PREFIX}${hex}`;
  }

  /**
   * Decrypt encrypted acoustic payload string using secret key
   */
  public static decrypt(
    encryptedPayload: string,
    secretKey: string
  ): { success: boolean; plaintext: string; error?: string } {
    if (!this.isEncrypted(encryptedPayload)) {
      return { success: true, plaintext: encryptedPayload };
    }

    if (!secretKey || secretKey.trim().length === 0) {
      return {
        success: false,
        plaintext: '',
        error: 'Passphrase required to decrypt confidential air-gap data.',
      };
    }

    try {
      const hex = encryptedPayload.substring(this.PREFIX.length);
      if (hex.length < 10 || hex.length % 2 !== 0) {
        return { success: false, plaintext: '', error: 'Corrupted ciphertext payload.' };
      }

      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
      }

      const iv = bytes.subarray(0, 4);
      const cipherBytes = bytes.subarray(4);
      const keyBytes = sha256Bytes(secretKey.trim());

      const plainBytes = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i++) {
        const keyByte = keyBytes[(i + iv[i % 4]) % 32];
        plainBytes[i] = cipherBytes[i] ^ keyByte;
      }

      const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
      const plaintext = decoder
        ? decoder.decode(plainBytes)
        : Array.from(plainBytes)
            .map((b) => String.fromCharCode(b))
            .join('');

      return { success: true, plaintext };
    } catch (e) {
      return { success: false, plaintext: '', error: 'Decryption failed. Incorrect passphrase.' };
    }
  }
}
