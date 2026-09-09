/**
 * EchoWave 1024-point Fast Fourier Transform (FFT & IFFT)
 * Cooley-Tukey Radix-2 DIT FFT implementation with pre-computed bit reversal & twiddle tables.
 */

export class FFTProcessor {
  private size: number;
  private logSize: number;
  private bitRev: Uint32Array;
  private cosTable: Float32Array;
  private sinTable: Float32Array;

  constructor(size: number = 1024) {
    this.size = size;
    this.logSize = Math.round(Math.log2(size));
    this.bitRev = new Uint32Array(size);
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);

    // Precompute bit-reversal table
    for (let i = 0; i < size; i++) {
      let rev = 0;
      let temp = i;
      for (let j = 0; j < this.logSize; j++) {
        rev = (rev << 1) | (temp & 1);
        temp >>= 1;
      }
      this.bitRev[i] = rev;
    }

    // Precompute twiddle factor sin/cos tables
    for (let i = 0; i < size / 2; i++) {
      const angle = (-2.0 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  /**
   * Forward FFT (Time Domain -> Frequency Domain)
   */
  public forward(real: Float32Array, imag: Float32Array): void {
    this.transform(real, imag, false);
  }

  /**
   * Inverse FFT (Frequency Domain -> Time Domain)
   */
  public inverse(real: Float32Array, imag: Float32Array): void {
    this.transform(real, imag, true);
    // Scale by 1 / size
    const scale = 1.0 / this.size;
    for (let i = 0; i < this.size; i++) {
      real[i] *= scale;
      imag[i] *= scale;
    }
  }

  private transform(real: Float32Array, imag: Float32Array, inverse: boolean): void {
    const N = this.size;

    // Bit-reversal permutation
    for (let i = 0; i < N; i++) {
      const j = this.bitRev[i];
      if (j > i) {
        const tempR = real[i];
        real[i] = real[j];
        real[j] = tempR;

        const tempI = imag[i];
        imag[i] = imag[j];
        imag[j] = tempI;
      }
    }

    // Cooley-Tukey Radix-2 computation
    for (let len = 2; len <= N; len <<= 1) {
      const halfLen = len >> 1;
      const step = N / len;

      for (let i = 0; i < N; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const idx = j * step;
          const cos = this.cosTable[idx];
          const sin = inverse ? -this.sinTable[idx] : this.sinTable[idx];

          const uR = real[i + j];
          const uI = imag[i + j];

          const vR = real[i + j + halfLen] * cos - imag[i + j + halfLen] * sin;
          const vI = real[i + j + halfLen] * sin + imag[i + j + halfLen] * cos;

          real[i + j] = uR + vR;
          imag[i + j] = uI + vI;
          real[i + j + halfLen] = uR - vR;
          imag[i + j + halfLen] = uI - vI;
        }
      }
    }
  }
}
