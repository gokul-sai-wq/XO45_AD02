import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

interface TransducerProps {
  isBroadcasting?: boolean;
  carrierFreq?: string;
  rmsLevel?: number;
  snr?: number;
  coherence?: number;
  mode: 'broadcast' | 'receive';
}

export const AcousticTransducer: React.FC<TransducerProps> = ({
  isBroadcasting = false,
  carrierFreq = '18.5 kHz',
  rmsLevel = -52,
  snr = 24,
  coherence = 0.994,
  mode,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const ringAnim = useRef(new Animated.Value(0.85)).current;

  // Spectrum bars (16 bars)
  const barHeights = useRef(
    Array.from({ length: 16 }, () => new Animated.Value(14))
  ).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: isBroadcasting ? 450 : 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.08,
            duration: isBroadcasting ? 450 : 1600,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 1.35,
            duration: isBroadcasting ? 450 : 1600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: isBroadcasting ? 450 : 1600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.5,
            duration: isBroadcasting ? 450 : 1600,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0.85,
            duration: isBroadcasting ? 450 : 1600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [isBroadcasting]);

  // Spectrum bar fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      barHeights.forEach((bar, index) => {
        const isCarrier = index >= 6 && index <= 9;
        const targetHeight = isBroadcasting
          ? isCarrier
            ? Math.floor(Math.random() * 46) + 38
            : Math.floor(Math.random() * 24) + 8
          : isCarrier
          ? 34 + Math.floor(Math.random() * 10)
          : 6 + Math.floor(Math.random() * 12);

        Animated.timing(bar, {
          toValue: targetHeight,
          duration: 90,
          useNativeDriver: false,
        }).start();
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isBroadcasting]);

  return (
    <View style={styles.card}>
      {/* Top Card Telemetry Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.eyebrow}>
            {mode === 'broadcast' ? 'ACOUSTIC TRANSMITTER' : 'ACOUSTIC TRANSDUCER'}
          </Text>
          <View style={styles.freqRow}>
            <Text style={styles.carrierValue}>{carrierFreq}</Text>
            <Text style={styles.carrierSub}>CARRIER FREQUENCY</Text>
          </View>
        </View>

        <View style={[styles.lockPill, isBroadcasting && styles.broadcastingPill]}>
          <View style={[styles.lockDot, isBroadcasting && styles.broadcastingDot]} />
          <Text style={[styles.lockText, isBroadcasting && styles.broadcastingText]}>
            {isBroadcasting ? 'TRANSMITTING' : 'CARRIER LOCKED'}
          </Text>
        </View>
      </View>

      {/* Clean Acoustic Ripple Canvas */}
      <View style={styles.stage}>
        {/* Outer Ripple */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: ringAnim }],
              opacity: pulseOpacity,
              borderColor: isBroadcasting ? Theme.colors.primary : 'rgba(29, 78, 216, 0.25)',
            },
          ]}
        />

        {/* Inner Ripple */}
        <Animated.View
          style={[
            styles.pulseRingInner,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: isBroadcasting ? Theme.colors.primary : 'rgba(29, 78, 216, 0.4)',
            },
          ]}
        />

        {/* Central Physical Transducer Orb */}
        <View style={[styles.coreOrb, isBroadcasting && styles.coreOrbActive]}>
          <MaterialCommunityIcons
            name={mode === 'broadcast' ? 'volume-high' : 'ear-hearing'}
            size={26}
            color="#FFFFFF"
          />
        </View>

        {/* Clean corner indicators */}
        <View style={styles.topLeftCorner}>
          <Text style={styles.cornerTag}>16-MFSK</Text>
          <Text style={styles.cornerTag}>48 kHz DAC</Text>
        </View>

        <View style={styles.bottomRightCorner}>
          <Text style={styles.cornerTag}>SNR: +{snr} dB</Text>
          <Text style={styles.cornerTag}>COH: {coherence.toFixed(3)}</Text>
        </View>
      </View>

      {/* Real-time Spectrum Waterfall */}
      <View style={styles.spectrumWrapper}>
        <View style={styles.spectrumHeader}>
          <Text style={styles.spectrumRange}>18.0 kHz</Text>
          <Text style={styles.spectrumCenter}>{carrierFreq} (Peak)</Text>
          <Text style={styles.spectrumRange}>20.0 kHz</Text>
        </View>

        <View style={styles.spectrumBarsRow}>
          {barHeights.map((hAnim, i) => {
            const isCarrier = i >= 6 && i <= 9;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.spectrumBar,
                  {
                    height: hAnim,
                    backgroundColor: isCarrier
                      ? Theme.colors.primary
                      : Theme.colors.borderLight,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Ambient Decibel Meter */}
      <View style={styles.meterContainer}>
        <View style={styles.meterLabels}>
          <Text style={styles.meterText}>
            Ambient Sound Level: <Text style={styles.meterBold}>{rmsLevel} dBFS</Text>
          </Text>
          <Text style={styles.gateText}>Threshold: -28 dBFS</Text>
        </View>

        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${Math.min(100, Math.max(10, rmsLevel + 90))}%` }]} />
          <View style={styles.gateLine} />
        </View>

        <View style={styles.meterScale}>
          <Text style={styles.scaleTick}>-90 dB</Text>
          <Text style={styles.scaleTick}>-60 dB</Text>
          <Text style={styles.scaleTick}>-28 dB (Gate)</Text>
          <Text style={styles.scaleTick}>0 dB</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  carrierValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  carrierSub: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.primary,
    letterSpacing: 0.3,
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.successMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  broadcastingPill: {
    backgroundColor: Theme.colors.primaryMuted,
    borderColor: 'rgba(29, 78, 216, 0.3)',
  },
  lockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.success,
  },
  broadcastingDot: {
    backgroundColor: Theme.colors.primary,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.successText,
    letterSpacing: 0.3,
  },
  broadcastingText: {
    color: Theme.colors.primary,
  },
  stage: {
    height: 130,
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginVertical: Theme.spacing.xs,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
  },
  pulseRingInner: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
  },
  coreOrb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  coreOrbActive: {
    backgroundColor: '#1E40AF',
  },
  topLeftCorner: {
    position: 'absolute',
    top: 8,
    left: 10,
  },
  bottomRightCorner: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    alignItems: 'flex-end',
  },
  cornerTag: {
    fontSize: 9,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    lineHeight: 14,
  },
  spectrumWrapper: {
    marginTop: Theme.spacing.md,
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  spectrumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spectrumRange: {
    fontSize: 10,
    fontWeight: '500',
    color: Theme.colors.textMuted,
  },
  spectrumCenter: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  spectrumBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 46,
    gap: 3,
  },
  spectrumBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  meterContainer: {
    marginTop: Theme.spacing.md,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meterText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
  },
  meterBold: {
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
  gateText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.warningText,
  },
  meterTrack: {
    height: 6,
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: Theme.colors.success,
    borderRadius: 3,
  },
  gateLine: {
    position: 'absolute',
    left: '68%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Theme.colors.warning,
  },
  meterScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleTick: {
    fontSize: 9,
    color: Theme.colors.textDim,
  },
});
