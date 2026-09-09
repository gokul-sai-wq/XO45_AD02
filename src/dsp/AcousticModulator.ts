/**
 * SoundBridge Acoustic Modulator
 * Encodes text/URLs into ultrasonic (or audible) FSK audio signals.
 * Includes: 11-bit Barker code preamble, packet framing, CRC-16 checksum, and Hann-windowed PCM synthesis.
 */

export interface ModulationConfig {
  sampleRate: number;      // 44100 or 48000 Hz
  baseFreq: number;        // e.g. 18500 Hz (ultrasonic) or 2200 Hz (audible)
  freqStep: number;        // Frequency gap between symbols (e.g. 150 Hz)
  symbolDurationMs: number;// Tone duration per symbol (e.g. 40ms)
  guardIntervalMs: number; // Silence between frames (e.g. 100ms)
}

export const DEFAULT_ULTRASONIC_CONFIG: ModulationConfig = {
  sampleRate: 44100,
  baseFreq: 18000,
  freqStep: 150,
  symbolDurationMs: 40,
  guardIntervalMs: 120,
};

export const DEFAULT_AUDIBLE_CONFIG: ModulationConfig = {
  sampleRate: 44100,
  baseFreq: 2200,
  freqStep: 150,
  symbolDurationMs: 40,
  guardIntervalMs: 120,
};

// 11-bit Barker code preamble: [+1, +1, +1, -1, -1, -1, +1, -1, -1, +1, -1]
export const BARKER_11 = [1, 1, 1, -1, -1, -1, 1, -1, -1, 1, -1];

// CRC-16 CCITT (0x1021)
export function computeCRC16(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

/**
 * Generate 16-bit Mono PCM WAV buffer from raw audio samples
 */
export function createWavBuffer(samples: Float32Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * (bitsPerSample / 8);
  const bufferSize = 44 + dataSize;
  const buffer = new Uint8Array(bufferSize);
  const view = new DataView(buffer.buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // FMT sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // DATA sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Pure bitwise Base64 encoder (works on React Native Hermes, V8, and Web with 0 dependencies)
 */
export function bufferToBase64(buffer: Uint8Array): string {
  let result = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return result;
}

export function stringToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) utf8.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return new Uint8Array(utf8);
}

/**
 * Synthesizes an acoustic transmission packet:
 * [11-bit Barker Preamble] + [Length Byte] + [Payload Bytes (4-bit nibbles)] + [CRC16 (4 nibbles)]
 */
export function synthesizeAcousticWav(
  payload: string,
  config: ModulationConfig = DEFAULT_ULTRASONIC_CONFIG
): {
  samples: Float32Array;
  sampleRate: number;
  base64Wav: string;
  durationSec: number;
  totalSamples: number;
} {
  const rawPayloadBytes = stringToBytes(payload.slice(0, 128)); // cap payload to 128 bytes

  // Compute CRC16
  const crc = computeCRC16(rawPayloadBytes);

  // Build symbols list:
  // We use 16-MFSK (16 discrete frequencies, representing 4 bits / 1 nibble per symbol)
  const symbols: number[] = [];

  // Length symbol (2 nibbles for length up to 255 bytes)
  symbols.push((rawPayloadBytes.length >> 4) & 0x0f);
  symbols.push(rawPayloadBytes.length & 0x0f);

  // Payload symbols (high nibble, then low nibble)
  for (let i = 0; i < rawPayloadBytes.length; i++) {
    symbols.push((rawPayloadBytes[i] >> 4) & 0x0f);
    symbols.push(rawPayloadBytes[i] & 0x0f);
  }

  // CRC-16 symbols (4 nibbles)
  symbols.push((crc >> 12) & 0x0f);
  symbols.push((crc >> 8) & 0x0f);
  symbols.push((crc >> 4) & 0x0f);
  symbols.push(crc & 0x0f);

  const sampleRate = config.sampleRate;
  const symbolSamplesCount = Math.floor((sampleRate * config.symbolDurationMs) / 1000);
  const barkerBitSamplesCount = Math.floor((sampleRate * 25) / 1000); // 25ms per Barker bit
  const guardSamplesCount = Math.floor((sampleRate * config.guardIntervalMs) / 1000);

  // Total samples: Preamble + Guard + Data symbols
  const totalSamples =
    BARKER_11.length * barkerBitSamplesCount +
    guardSamplesCount +
    symbols.length * symbolSamplesCount;

  const samples = new Float32Array(totalSamples);
  let sampleIdx = 0;

  // 1. Synthesize 11-bit Barker Preamble (BPSK on baseFreq)
  const preambleFreq = config.baseFreq;
  for (let b = 0; b < BARKER_11.length; b++) {
    const polarity = BARKER_11[b];
    for (let s = 0; s < barkerBitSamplesCount; s++) {
      const t = s / sampleRate;
      // Hann window envelope to prevent clicking
      const envelope = 0.5 * (1 - Math.cos((2 * Math.PI * s) / barkerBitSamplesCount));
      samples[sampleIdx++] = polarity * envelope * Math.sin(2 * Math.PI * preambleFreq * t) * 0.8;
    }
  }

  // 2. Guard Interval (silence to let reverberation decay)
  for (let g = 0; g < guardSamplesCount; g++) {
    samples[sampleIdx++] = 0;
  }

  // 3. Synthesize Data Symbols (16-MFSK)
  for (let symIdx = 0; symIdx < symbols.length; symIdx++) {
    const symbolValue = symbols[symIdx]; // 0 to 15
    const freq = config.baseFreq + (symbolValue + 1) * config.freqStep;

    for (let s = 0; s < symbolSamplesCount; s++) {
      const t = s / sampleRate;
      // Hann window to smooth tone boundaries
      const envelope = 0.5 * (1 - Math.cos((2 * Math.PI * s) / symbolSamplesCount));
      samples[sampleIdx++] = envelope * Math.sin(2 * Math.PI * freq * t) * 0.85;
    }
  }

  // Create WAV and Base64 Data URI
  const wavBytes = createWavBuffer(samples, sampleRate);
  const base64 = bufferToBase64(wavBytes);
  const base64Wav = `data:audio/wav;base64,${base64}`;

  return {
    samples,
    sampleRate,
    base64Wav,
    durationSec: totalSamples / sampleRate,
    totalSamples,
  };
}

/**
 * Synthesizes a brief 30ms Acoustic ACK confirmation chirp
 */
export function synthesizeAckChirpWav(
  freq: number = 19800,
  sampleRate: number = 44100
): { samples: Float32Array; sampleRate: number; base64Wav: string } {
  const durationMs = 30;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const envelope = 0.5 * (1 - Math.cos((2 * Math.PI * i) / sampleCount));
    samples[i] = envelope * Math.sin(2 * Math.PI * freq * t) * 0.9;
  }

  const wavBytes = createWavBuffer(samples, sampleRate);
  return {
    samples,
    sampleRate,
    base64Wav: `data:audio/wav;base64,${bufferToBase64(wavBytes)}`,
  };
}
