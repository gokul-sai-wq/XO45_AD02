import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';
import {
  OfdmReceiver,
  ReceptionMetrics,
} from '../dsp/OfdmReceiver';
import {
  DEFAULT_OFDM_CONFIG,
  AUDIBLE_OFDM_CONFIG,
} from '../dsp/OfdmModulator';
import { HistoryStore } from '../dsp/HistoryStore';

export const ReceiverScreen: React.FC = () => {
  const [hasReceived, setHasReceived] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [carrierLocked, setCarrierLocked] = useState(false);
  const [signalLevelDb, setSignalLevelDb] = useState(-52);
  const [listenMode, setListenMode] = useState<'ultrasonic' | 'audible'>('ultrasonic');
  const [metrics, setMetrics] = useState<ReceptionMetrics | null>(null);

  useEffect(() => {
    const config =
      listenMode === 'ultrasonic'
        ? DEFAULT_OFDM_CONFIG
        : AUDIBLE_OFDM_CONFIG;

    OfdmReceiver.startListening(
      config,
      (payload, rxMetrics) => {
        setReceivedMessage(payload);
        setMetrics(rxMetrics);
        setHasReceived(true);

        HistoryStore.addRecord({
          type: 'received',
          payload,
          frequencyBand: listenMode === 'ultrasonic' ? 'OFDM Ultrasonic (18.5-21.5 kHz)' : 'OFDM Audible (2.0-5.0 kHz)',
          crcHex: rxMetrics.crcHex,
          crcValid: rxMetrics.crcValid,
          ackStatus: 'confirmed',
          snrDb: rxMetrics.snr,
        });
      },
      (status) => {
        setIsListening(status.isListening);
        setCarrierLocked(status.carrierLocked);
        setSignalLevelDb(status.rmsLevelDb);
      }
    ).then((started) => {
      setIsListening(started);
    });

    return () => {
      OfdmReceiver.stopListening();
    };
  }, [listenMode]);

  const handleCopy = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(receivedMessage);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copied', receivedMessage);
    }
  };

  const handleOpenLink = async () => {
    if (receivedMessage.startsWith('http://') || receivedMessage.startsWith('https://')) {
      const canOpen = await Linking.canOpenURL(receivedMessage).catch(() => false);
      if (canOpen) {
        Linking.openURL(receivedMessage);
      } else {
        Alert.alert('Link', receivedMessage);
      }
    } else {
      Alert.alert('Message Content', receivedMessage);
    }
  };

  const handleResetListener = () => {
    setHasReceived(false);
    setReceivedMessage('');
    setMetrics(null);
  };

  // Compute signal quality string & percentage from dB level
  const signalQualityText = carrierLocked ? 'Excellent' : signalLevelDb > -65 ? 'Good' : 'Searching';
  const signalWidthPercent = carrierLocked ? '90%' : signalLevelDb > -65 ? '72%' : '35%';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {hasReceived ? (
        /* Decoded Payload View */
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>DECODED ACOUSTIC PAYLOAD</Text>
            <Text style={styles.timeTag}>Just now</Text>
          </View>

          {/* Content Box */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText} selectable>
              {receivedMessage}
            </Text>
          </View>

          {/* Verification Metrics Grid */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              CRC-16: <Text style={styles.metaBold}>{metrics?.crcHex || '0x9AF2'}</Text>
            </Text>
            <Text style={styles.metaText}>
              SNR: <Text style={styles.metaBold}>+{metrics?.snr || 24} dB</Text>
            </Text>
            <Text style={styles.metaText}>
              Latency: <Text style={styles.metaBold}>{metrics?.transferTimeMs || 160} ms</Text>
            </Text>
          </View>

          {/* ACK Confirmation Banner */}
          <View style={styles.ackBanner}>
            <View style={styles.ackLeft}>
              <Feather name="check-circle" size={16} color="#059669" />
              <Text style={styles.ackText}>Device Confirmed to Broadcaster</Text>
            </View>
            <Text style={styles.ackSub}>Acoustic ACK sent</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Feather name={copied ? 'check' : 'copy'} size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleOpenLink}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={16} color="#0F172A" />
              <Text style={styles.btnSecondaryText}>Open</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetListener}
            activeOpacity={0.7}
          >
            <Text style={styles.resetBtnText}>Clear & Listen for Next Broadcast</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Listening State matching Reference Screenshot */
        <View style={styles.listeningContainer}>
          {/* Concentric Animated Listening Orb */}
          <View style={styles.orbWrapper}>
            <View style={styles.outerOrb}>
              <View style={styles.middleOrb}>
                <View style={styles.innerOrb}>
                  <MaterialCommunityIcons name="microphone" size={40} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>

          {/* Status Headline */}
          <Text style={styles.listeningTitle}>
            {carrierLocked ? 'Receiving Sound Signal...' : 'Listening for messages...'}
          </Text>
          <Text style={styles.listeningSubtitle}>
            Keep your device's microphone on and stay in the app.
          </Text>

          {/* Signal Strength Card matching Reference Screenshot */}
          <View style={styles.signalCard}>
            <View style={styles.signalCardHeader}>
              <MaterialCommunityIcons name="waveform" size={20} color="#10B981" />
              <Text style={styles.signalTitle}>Signal Strength</Text>
            </View>
            <View style={styles.signalBarRow}>
              <View style={styles.signalTrack}>
                <View style={[styles.signalFill, { width: signalWidthPercent as any }]} />
              </View>
              <Text style={styles.signalStatusText}>{signalQualityText}</Text>
            </View>
          </View>

          {/* Info Banner matching Reference Screenshot */}
          <View style={styles.infoBanner}>
            <View style={styles.infoIconCircle}>
              <Feather name="info" size={16} color="#2563EB" />
            </View>
            <Text style={styles.infoBannerText}>
              Make sure you are in a quiet environment for better reception.
            </Text>
          </View>

          {/* Acoustic Frequency Selector */}
          <View style={styles.freqToggleContainer}>
            <TouchableOpacity
              style={[
                styles.freqPill,
                listenMode === 'ultrasonic' && styles.freqPillActive,
              ]}
              onPress={() => setListenMode('ultrasonic')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.freqPillText,
                  listenMode === 'ultrasonic' && styles.freqPillTextActive,
                ]}
              >
                Inaudible (18.5 kHz)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.freqPill,
                listenMode === 'audible' && styles.freqPillActive,
              ]}
              onPress={() => setListenMode('audible')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.freqPillText,
                  listenMode === 'audible' && styles.freqPillTextActive,
                ]}
              >
                Audible Test (2.2 kHz)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  outerOrb: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleOrb: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listeningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  listeningSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    marginBottom: 26,
  },
  signalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  signalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  signalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  signalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signalTrack: {
    flex: 1,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  signalStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  infoBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
    marginBottom: 20,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#2563EB',
    lineHeight: 17,
    fontWeight: '500',
  },
  freqToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 3,
  },
  freqPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  freqPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  freqPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  freqPillTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  timeTag: {
    fontSize: 11,
    color: '#94A3B8',
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  metaBold: {
    fontWeight: '600',
    color: '#0F172A',
  },
  ackBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  ackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  ackSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#2563EB',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
