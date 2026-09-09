/**
 * EchoWave Reed-Solomon Error Correction Codec over GF(2^8)
 * Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
 * Includes: Berlekamp-Massey algorithm, Chien search, Forney algorithm, and CRC32 checksum.
 */

export class ReedSolomon {
  private eccCount: number;
  private gfExp: Uint8Array = new Uint8Array(512);
  private gfLog: Uint8Array = new Uint8Array(256);
  private generatorPoly: Uint8Array = new Uint8Array(0);

  constructor(eccCount: number = 16) {
    this.eccCount = eccCount;
    this.initGaloisField();
    this.buildGeneratorPoly();
  }

  private initGaloisField(): void {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.gfExp[i] = x;
      this.gfLog[x] = i;
      let nextX = x << 1;
      if (nextX & 0x100) {
        nextX ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
      }
      x = nextX & 0xff;
    }
    for (let i = 255; i < 512; i++) {
      this.gfExp[i] = this.gfExp[i - 255];
    }
    this.gfLog[0] = 0;
  }

  public gfMul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.gfExp[this.gfLog[a] + this.gfLog[b]];
  }

  public gfDiv(a: number, b: number): number {
    if (a === 0) return 0;
    if (b === 0) return 0;
    return this.gfExp[(this.gfLog[a] + 255 - this.gfLog[b]) % 255];
  }

  public gfInverse(a: number): number {
    if (a === 0) return 0;
    return this.gfExp[255 - this.gfLog[a]];
  }

  public gfPolyMul(p: Uint8Array, q: Uint8Array): Uint8Array {
    const result = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++) {
      if (p[i] === 0) continue;
      for (let j = 0; j < q.length; j++) {
        if (q[j] === 0) continue;
        result[i + j] ^= this.gfMul(p[i], q[j]);
      }
    }
    return result;
  }

  private buildGeneratorPoly(): void {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < this.eccCount; i++) {
      const term = new Uint8Array([1, this.gfExp[i]]);
      poly = new Uint8Array(this.gfPolyMul(poly, term));
    }
    this.generatorPoly = poly;
  }

  /**
   * Encode message bytes and append Reed-Solomon parity bytes
   */
  public encode(message: Uint8Array): Uint8Array {
    const result = new Uint8Array(message.length + this.eccCount);
    result.set(message, 0);

    const parity = new Uint8Array(this.eccCount);
    for (let i = 0; i < message.length; i++) {
      const feedback = message[i] ^ parity[0];
      for (let j = 0; j < this.eccCount - 1; j++) {
        parity[j] =
          parity[j + 1] ^ (feedback !== 0 ? this.gfMul(this.generatorPoly[j + 1], feedback) : 0);
      }
      parity[this.eccCount - 1] =
        feedback !== 0 ? this.gfMul(this.generatorPoly[this.eccCount], feedback) : 0;
    }

    for (let i = 0; i < this.eccCount; i++) {
      result[message.length + i] = parity[i];
    }
    return result;
  }

  /**
   * Decode received message buffer and correct errors in-place using Berlekamp-Massey + Forney
   */
  public decode(
    receivedMsg: Uint8Array
  ): { success: boolean; errorsCorrected: number } {
    const n = receivedMsg.length;
    if (n <= this.eccCount) return { success: false, errorsCorrected: 0 };

    // 1. Calculate syndromes
    const syndromes = new Uint8Array(this.eccCount);
    let hasErrors = false;
    for (let i = 0; i < this.eccCount; i++) {
      const alphaI = this.gfExp[i];
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum = this.gfMul(sum, alphaI) ^ receivedMsg[j];
      }
      syndromes[i] = sum;
      if (sum !== 0) hasErrors = true;
    }

    if (!hasErrors) {
      return { success: true, errorsCorrected: 0 };
    }

    // 2. Berlekamp-Massey Algorithm to find error locator polynomial C(x)
    let C = new Uint8Array([1]);
    let B = new Uint8Array([1]);
    let oldDelta = 1;
    let k = 0;

    for (let i = 0; i < this.eccCount; i++) {
      k++;
      let delta = syndromes[i];
      for (let j = 1; j < C.length; j++) {
        if (i >= j) {
          delta ^= this.gfMul(C[j], syndromes[i - j]);
        }
      }

      if (delta !== 0) {
        const scale = this.gfDiv(delta, oldDelta);
        const newB = new Uint8Array(B.length + k);
        for (let j = 0; j < B.length; j++) {
          newB[j + k] = this.gfMul(B[j], scale);
        }

        const newC = new Uint8Array(Math.max(C.length, newB.length));
        newC.set(C, 0);
        for (let j = 0; j < newB.length; j++) {
          newC[j] ^= newB[j];
        }

        if (2 * (C.length - 1) <= i) {
          B = C;
          oldDelta = delta;
          k = 0;
        }
        C = newC;
      }
    }

    let cLen = C.length;
    while (cLen > 1 && C[cLen - 1] === 0) {
      cLen--;
    }
    if (cLen !== C.length) {
      C = C.subarray(0, cLen);
    }

    const numErrors = C.length - 1;
    if (numErrors * 2 > this.eccCount) {
      return { success: false, errorsCorrected: 0 };
    }

    // 3. Chien Search to find error positions
    const errorPos: number[] = [];
    for (let i = 0; i < n; i++) {
      const xiInv = this.gfExp[(255 - (i % 255)) % 255];
      let val = 0;
      let term = 1;
      for (let j = 0; j < C.length; j++) {
        val ^= this.gfMul(C[j], term);
        term = this.gfMul(term, xiInv);
      }
      if (val === 0) {
        errorPos.push(n - 1 - i);
      }
    }

    if (errorPos.length !== numErrors) {
      return { success: false, errorsCorrected: 0 };
    }

    // 4. Compute error evaluator polynomial Omega(x)
    let omega = this.gfPolyMul(syndromes, C);
    if (omega.length > this.eccCount) {
      omega = omega.subarray(0, this.eccCount);
    }

    // 5. Forney Algorithm to compute error magnitudes
    let errorsCorrected = 0;
    for (const pos of errorPos) {
      const i = n - 1 - pos;
      const Xj = this.gfExp[i % 255];
      const XjInv = this.gfExp[(255 - (i % 255)) % 255];

      let omegaVal = 0;
      let term = 1;
      for (let j = 0; j < omega.length; j++) {
        omegaVal ^= this.gfMul(omega[j], term);
        term = this.gfMul(term, XjInv);
      }

      let deriv = 0;
      term = 1;
      for (let j = 1; j < C.length; j += 2) {
        deriv ^= this.gfMul(C[j], term);
        term = this.gfMul(term, this.gfMul(XjInv, XjInv));
      }

      if (deriv === 0) return { success: false, errorsCorrected: 0 };

      const mag = this.gfMul(Xj, this.gfMul(omegaVal, this.gfInverse(deriv)));
      receivedMsg[pos] ^= mag;
      errorsCorrected++;
    }

    return { success: true, errorsCorrected };
  }

  /**
   * Calculate standard 32-bit CRC32 checksum (0xEDB88320)
   */
  public static calculateCRC32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
