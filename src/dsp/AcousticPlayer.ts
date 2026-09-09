/**
 * SoundBridge Acoustic Audio Player
 * Plays synthesized ultrasonic or audible PCM sound waves through the device speaker.
 * Uses Web Audio API AudioContext with direct Float32Array PCM buffer playback.
 */

export interface PlayableSignal {
  samples: Float32Array;
  sampleRate: number;
  base64Wav?: string;
}

export class AcousticPlayer {
  private static audioCtx: any = null;

  /**
   * Get or initialize AudioContext with the browser's native hardware sample rate.
   * Using native sample rate avoids Windows WASAPI audio device sleep/silence bugs.
   */
  private static async getAudioContext(): Promise<any> {
    const AudioContextClass =
      (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext));

    if (!AudioContextClass) return null;

    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  /**
   * Play an acoustic burst directly through the device speaker.
   * Guaranteed to resolve within duration + 50ms so UI never gets stuck.
   * Works on 1st click, 2nd click, and every subsequent click.
   */
  public static async playSignal(signal: PlayableSignal): Promise<void> {
    const durationMs = Math.max(150, Math.round((signal.samples.length / signal.sampleRate) * 1000));

    return new Promise<void>(async (resolve) => {
      let isResolved = false;
      const finish = () => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      };

      // Hard safety timer: guaranteed to unlock UI even if audio callback stalls
      const safetyTimer = setTimeout(finish, durationMs + 80);

      try {
        // Attempt 1: Web Audio API (direct Float32Array PCM buffer)
        const ctx = await this.getAudioContext();

        if (ctx) {
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }

          const buffer = ctx.createBuffer(1, signal.samples.length, signal.sampleRate);
          buffer.getChannelData(0).set(signal.samples);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);

          source.onended = () => {
            clearTimeout(safetyTimer);
            finish();
          };

          source.start(0);
          return;
        }

        // Attempt 2: HTML5 Audio Element Fallback
        if (signal.base64Wav && typeof Audio !== 'undefined') {
          const audio = new Audio(signal.base64Wav);
          audio.volume = 1.0;
          audio.onended = () => {
            clearTimeout(safetyTimer);
            finish();
          };
          audio.onerror = () => {
            clearTimeout(safetyTimer);
            finish();
          };
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(finish);
          }
          return;
        }

        clearTimeout(safetyTimer);
        finish();
      } catch (err) {
        console.warn('Web Audio playback error, falling back to HTML5 audio:', err);

        // Fallback to HTML5 Audio if Web Audio API throws
        if (signal.base64Wav && typeof Audio !== 'undefined') {
          try {
            const audio = new Audio(signal.base64Wav);
            audio.volume = 1.0;
            audio.onended = () => {
              clearTimeout(safetyTimer);
              finish();
            };
            audio.onerror = () => {
              clearTimeout(safetyTimer);
              finish();
            };
            audio.play().catch(finish);
            return;
          } catch (e) {
            clearTimeout(safetyTimer);
            finish();
          }
        } else {
          clearTimeout(safetyTimer);
          finish();
        }
      }
    });
  }

  /**
   * Stop playback and suspend audio context
   */
  public static stop(): void {
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend().catch(() => {});
    }
  }
}
