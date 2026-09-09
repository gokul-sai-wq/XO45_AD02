/**
 * EchoWave Acoustic OFDM Modulator
 * Encodes payloads into near-ultrasonic (18.5 kHz - 21.5 kHz) OFDM soundwaves with 48 parallel DBPSK subcarriers,
 * 512-sample Cyclic Prefix multipath echo shield, LFM up-chirp preamble, Reed-Solomon GF(2^8) error correction, and CRC32.
 */

import { ReedSolomon } from './ReedSolomon';
import { FFTProcessor } from './FFTProcessor';

export interface ModemConfig {
  sampleRate: number;        // 48000 Hz or 44100 Hz
  fftSize: number;           // 1024
  cpSize: number;            // 512 (10.67 ms cyclic prefix indoor multipath echo shield)
  numCarriers: number;       // 48 parallel subcarriers
  startCarrierBin: number;   // 395 (~18,515 Hz at 48kHz)
  chirpStartFreq: number;    // 18000 Hz
  chirpEndFreq: number;      // 21500 Hz
  chirpSize: number;         // 1024 samples
  guardSize: number;         // 256 samples
  rsParitySymbols: number;   // 16 parity bytes (corrects 8 byte errors)
}

export const DEFAULT_OFDM_CONFIG: ModemConfig = {
  sampleRate: 48000,
  fftSize: 1024,
  cpSize: 512,
  numCarriers: 48,
  startCarrierBin: 373,      // ~17,500 Hz at 48kHz
  chirpStartFreq: 17500,     // 17.5 kHz
  chirpEndFreq: 21500,       // 21.5 kHz
  chirpSize: 1024,
  guardSize: 256,
  rsParitySymbols: 16,
};

export interface AcousticChannel {
  id: string;
  name: string;
  frequencyLabel: string;
  chirpStartFreq: number;
  chirpEndFreq: number;
  startCarrierBin: number;
  description: string;
}

export const ACOUSTIC_FREQUENCY_CHANNELS: AcousticChannel[] = [
  {
    id: 'chan_1',
    name: 'Channel 1 (Standard)',
    frequencyLabel: '17.0 – 18.2 kHz',
    chirpStartFreq: 17000,
    chirpEndFreq: 18200,
    startCarrierBin: 363,
    description: 'Standard confidential frequency channel',
  },
  {
    id: 'chan_2',
    name: 'Channel 2 (Alpha Band)',
    frequencyLabel: '17.8 – 19.0 kHz',
    chirpStartFreq: 17800,
    chirpEndFreq: 19000,
    startCarrierBin: 380,
    description: 'Alpha stealth frequency channel',
  },
  {
    id: 'chan_3',
    name: 'Channel 3 (Secure Shield)',
    frequencyLabel: '18.6 – 19.8 kHz',
    chirpStartFreq: 18600,
    chirpEndFreq: 19800,
    startCarrierBin: 397,
    description: 'High-security acoustic shield channel',
  },
  {
    id: 'chan_4',
    name: 'Channel 4 (Ultra Stealth)',
    frequencyLabel: '19.2 – 20.4 kHz',
    chirpStartFreq: 19200,
    chirpEndFreq: 20400,
    startCarrierBin: 410,
    description: 'Ultra stealth high-frequency channel',
  },
];

export function createModemConfigForChannel(channel: AcousticChannel): ModemConfig {
  return {
    ...DEFAULT_OFDM_CONFIG,
    startCarrierBin: channel.startCarrierBin,
    chirpStartFreq: channel.chirpStartFreq,
    chirpEndFreq: channel.chirpEndFreq,
  };
}

export const MID_BAND_OFDM_CONFIG: ModemConfig = {
  sampleRate: 48000,
  fftSize: 1024,
  cpSize: 512,
  numCarriers: 48,
  startCarrierBin: 341,       // ~16,000 Hz
  chirpStartFreq: 15500,
  chirpEndFreq: 19000,
  chirpSize: 1024,
  guardSize: 256,
  rsParitySymbols: 16,
};

export const AUDIBLE_OFDM_CONFIG: ModemConfig = {
  sampleRate: 48000,
  fftSize: 1024,
  cpSize: 512,
  numCarriers: 48,
  startCarrierBin: 43,        // ~2,015 Hz at 48kHz (2.0 kHz - 6.0 kHz)
  chirpStartFreq: 2000,       // 2.0 kHz
  chirpEndFreq: 6000,         // 6.0 kHz
  chirpSize: 1024,
  guardSize: 256,
  rsParitySymbols: 16,
};

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bufferToBase64(buffer: Uint8Array): string {
  let result = '';
  const len = buffer.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = buffer[i];
    const b1 = i + 1 < len ? buffer[i + 1] : 0;
    const b2 = i + 2 < len ? buffer[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return result;
}

export function createWavBuffer(samples: Float32Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * (bitsPerSample / 8);
  const bufferSize = 44 + dataSize;
  const buffer = new Uint8Array(bufferSize);
  const view = new DataView(buffer.buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

export class OfdmModulator {
  private config: ModemConfig;
  private fft: FFTProcessor;
  private rs: ReedSolomon;
  private referenceChirp: Float32Array;
  private referencePhases: Float32Array;

  constructor(config: ModemConfig = DEFAULT_OFDM_CONFIG) {
    this.config = config;
    this.fft = new FFTProcessor(config.fftSize);
    this.rs = new ReedSolomon(config.rsParitySymbols);

    this.referenceChirp = this.generateReferenceChirp();
    this.referencePhases = this.generateReferencePhases();
  }

  /**
   * Generate 1024-sample LFM Up-Chirp (18.0 kHz -> 21.5 kHz) with Hann Window
   */
  private generateReferenceChirp(): Float32Array {
    const size = this.config.chirpSize;
    const chirp = new Float32Array(size);
    const T = size / this.config.sampleRate;
    const k = (this.config.chirpEndFreq - this.config.chirpStartFreq) / T;
    const twoPi = 2.0 * Math.PI;

    for (let i = 0; i < size; i++) {
      const t = i / this.config.sampleRate;
      const phase = twoPi * (this.config.chirpStartFreq * t + 0.5 * k * t * t);
      const window = 0.5 * (1.0 - Math.cos((twoPi * i) / (size - 1)));
      chirp[i] = Math.sin(phase) * window;
    }
    return chirp;
  }

  /**
   * Pseudo-random BPSK carrier reference phases to minimize PAPR
   */
  private generateReferencePhases(): Float32Array {
    const phases = new Float32Array(this.config.numCarriers);
    let lfsr = 0xace1;
    for (let i = 0; i < this.config.numCarriers; i++) {
      lfsr = (lfsr >> 1) ^ (-(lfsr & 1) & 0xb400);
      phases[i] = (lfsr & 1) ? Math.PI : 0.0;
    }
    return phases;
  }

  /**
   * Packetize message string: [Magic 0xEA] + [Len] + [Payload] + [CRC32 (4B)] + [RS Parity (16B)]
   */
  private packetize(message: string): Uint8Array {
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const msgBytes = encoder ? encoder.encode(message.slice(0, 64)) : new Uint8Array(Array.from(message.slice(0, 64)).map((c) => c.charCodeAt(0)));

    const packet = new Uint8Array(2 + msgBytes.length + 4);
    packet[0] = 0xea; // EchoWave Magic Byte
    packet[1] = msgBytes.length;
    packet.set(msgBytes, 2);

    const crc = ReedSolomon.calculateCRC32(packet.subarray(0, 2 + msgBytes.length));
    const crcOffset = 2 + msgBytes.length;
    packet[crcOffset] = crc & 0xff;
    packet[crcOffset + 1] = (crc >> 8) & 0xff;
    packet[crcOffset + 2] = (crc >> 16) & 0xff;
    packet[crcOffset + 3] = (crc >> 24) & 0xff;

    // Apply Reed-Solomon encoding
    return this.rs.encode(packet);
  }

  /**
   * Synthesize complete OFDM acoustic transmission buffer
   */
  public synthesize(message: string): {
    samples: Float32Array;
    sampleRate: number;
    base64Wav: string;
    durationSec: number;
    totalSamples: number;
  } {
    const codedPacket = this.packetize(message);

    // Unpack packet bytes into bit array
    const bits: number[] = [];
    for (let i = 0; i < codedPacket.length; i++) {
      const byte = codedPacket[i];
      for (let b = 7; b >= 0; b--) {
        bits.push((byte >> b) & 1);
      }
    }

    // Pad bits to a multiple of numCarriers (48)
    const rem = bits.length % this.config.numCarriers;
    if (rem !== 0) {
      const padLen = this.config.numCarriers - rem;
      for (let p = 0; p < padLen; p++) bits.push(0);
    }

    const numDataSymbols = bits.length / this.config.numCarriers;
    const audioOutput: number[] = [];

    // 1. Lead-in guard silence
    for (let g = 0; g < this.config.guardSize; g++) audioOutput.push(0.0);

    // 2. LFM Up-Chirp Preamble
    for (let c = 0; c < this.referenceChirp.length; c++) audioOutput.push(this.referenceChirp[c]);

    // 3. Inter-preamble guard silence
    for (let g = 0; g < this.config.guardSize; g++) audioOutput.push(0.0);

    // Helper: generate 1024-point IFFT OFDM symbol with 512-sample Cyclic Prefix
    const currentPhases = new Float32Array(this.referencePhases);
    const generateOfdmSymbol = (phases: Float32Array): number[] => {
      const real = new Float32Array(this.config.fftSize);
      const imag = new Float32Array(this.config.fftSize);

      for (let k = 0; k < this.config.numCarriers; k++) {
        const bin = this.config.startCarrierBin + k;
        const ph = phases[k];
        const r = Math.cos(ph);
        const im = Math.sin(ph);

        real[bin] = r;
        imag[bin] = im;

        // Hermitian symmetry for real-valued time-domain signal
        const conjBin = this.config.fftSize - bin;
        real[conjBin] = r;
        imag[conjBin] = -im;
      }

      this.fft.inverse(real, imag);

      // Prepend Cyclic Prefix (512 samples)
      const fullSymbol = new Array(this.config.cpSize + this.config.fftSize);
      const cpStart = this.config.fftSize - this.config.cpSize;

      for (let i = 0; i < this.config.cpSize; i++) {
        fullSymbol[i] = real[cpStart + i];
      }
      for (let i = 0; i < this.config.fftSize; i++) {
        fullSymbol[this.config.cpSize + i] = real[i];
      }

      return fullSymbol;
    };

    // 4. Reference OFDM Symbol
    const refSym = generateOfdmSymbol(currentPhases);
    audioOutput.push(...refSym);

    // 5. Data OFDM Symbols (DBPSK phase shifting)
    for (let s = 0; s < numDataSymbols; s++) {
      for (let k = 0; k < this.config.numCarriers; k++) {
        const bit = bits[s * this.config.numCarriers + k];
        if (bit === 1) {
          currentPhases[k] += Math.PI;
          if (currentPhases[k] > Math.PI) {
            currentPhases[k] -= 2.0 * Math.PI;
          }
        }
      }
      const dataSym = generateOfdmSymbol(currentPhases);
      audioOutput.push(...dataSym);
    }

    // 6. Lead-out guard silence
    for (let g = 0; g < this.config.guardSize; g++) audioOutput.push(0.0);

    // Normalize output to prevent speaker clipping
    const samples = new Float32Array(audioOutput);
    let maxPeak = 0.0;
    for (let i = 0; i < samples.length; i++) {
      const absS = Math.abs(samples[i]);
      if (absS > maxPeak) maxPeak = absS;
    }
    if (maxPeak > 0) {
      const gain = 0.85 / maxPeak;
      for (let i = 0; i < samples.length; i++) samples[i] *= gain;
    }

    const wavBytes = createWavBuffer(samples, this.config.sampleRate);
    const base64 = bufferToBase64(wavBytes);

    return {
      samples,
      sampleRate: this.config.sampleRate,
      base64Wav: `data:audio/wav;base64,${base64}`,
      durationSec: samples.length / this.config.sampleRate,
      totalSamples: samples.length,
    };
  }
}
