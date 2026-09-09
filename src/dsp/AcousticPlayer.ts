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
  private static currentSource: any = null;
  private static currentAudio: any = null;

  /**
   * Synchronously unlock AudioContext within a user interaction gesture (click/touch)
   */
  public static unlock(): void {
    const AudioContextClass =
      (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext));

    if (AudioContextClass) {
      try {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Get or initialize AudioContext with the browser's native hardware sample rate.
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
        await this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  /**
   * Play an acoustic burst directly through the device speaker.
   */
  public static async playSignal(signal: PlayableSignal): Promise<void> {
    const durationMs = Math.max(150, Math.round((signal.samples.length / signal.sampleRate) * 1000));

    return new Promise<void>(async (resolve) => {
      let isResolved = false;
      const finish = () => {
        if (!isResolved) {
          isResolved = true;
          this.currentSource = null;
          this.currentAudio = null;
          resolve();
        }
      };

      const safetyTimer = setTimeout(finish, durationMs + 300);

      // 1. Web Audio API / HTML5 Audio (Primary for Web platform)
      const isWeb = typeof window !== 'undefined' && (window as any).navigator?.product !== 'ReactNative';
      if (isWeb) {
        try {
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
            this.currentSource = source;

            source.onended = () => {
              clearTimeout(safetyTimer);
              finish();
            };

            source.start(0);
            return;
          }

          if (signal.base64Wav && typeof Audio !== 'undefined') {
            const audio = new Audio(signal.base64Wav);
            audio.volume = 1.0;
            this.currentAudio = audio;
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
        } catch (err) {
          console.warn('Web Audio playback error:', err);
        }
      }

      // 2. Native Expo AV (Primary for Expo Go mobile app on Android/iOS if native module is present)
      if (signal.base64Wav) {
        try {
          const { NativeModules } = require('react-native');
          const hasNativeAV = NativeModules && (NativeModules.ExponentAV || NativeModules.ExpoAV || NativeModules.ExponentAudio);
          if (hasNativeAV) {
            const { Audio: ExpoAudio } = require('expo-av');
            await ExpoAudio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldRouteThroughEarpiece: false,
            });

            const { sound } = await ExpoAudio.Sound.createAsync(
              { uri: signal.base64Wav },
              { shouldPlay: true, volume: 1.0 }
            );

            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync().catch(() => {});
                clearTimeout(safetyTimer);
                finish();
              }
            });
            return;
          }
        } catch (e) {
          // Fall through cleanly
        }
      }

      clearTimeout(safetyTimer);
      finish();
    });
  }

  /**
   * Stop playback immediately and cancel active audio nodes
   */
  public static stop(): void {
    try {
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
    } catch (e) {
      // ignore
    }

    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }
    } catch (e) {
      // ignore
    }

    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend().catch(() => {});
    }
  }

  /**
   * Play a direct audible confirmation tone (e.g. 1000 Hz or 2200 Hz tone)
   */
  public static async playTone(freq: number = 1200, durationMs: number = 150): Promise<void> {
    const ctx = await this.getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      // ignore
    }
  }
}
