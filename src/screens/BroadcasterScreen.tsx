import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';
import { AcousticTransducer } from '../components/AcousticTransducer';
import { CarrierSelector, CARRIERS, CarrierOption } from '../components/CarrierSelector';
import { ConfirmedReceiversList, ReceiverNode } from '../components/ConfirmedReceiversList';

const INITIAL_RECEIVERS: ReceiverNode[] = [
  {
    id: '1',
    name: 'Pixel 8 Pro (Room A - Desk 01)',
    deviceType: 'phone',
    range: '~1.2m',
    snr: 24,
    status: 'verified',
    latency: '12ms',
  },
  {
    id: '2',
    name: 'Galaxy S24 (Room A - Desk 02)',
    deviceType: 'phone',
    range: '~1.9m',
    snr: 21,
    status: 'verified',
    latency: '14ms',
  },
  {
    id: '3',
    name: 'iPad Pro (Room A - Desk 03)',
    deviceType: 'tablet',
    range: '~2.8m',
    snr: 16,
    status: 'listening',
    latency: '--',
  },
];

export const BroadcasterScreen: React.FC = () => {
  const [payload, setPayload] = useState('https://exam.hall.local/session/hall-402-paper-b');
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierOption>(CARRIERS[0]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [receivers, setReceivers] = useState<ReceiverNode[]>(INITIAL_RECEIVERS);

  // Compute metrics
  const byteCount = typeof Blob !== 'undefined' ? new Blob([payload]).size : encodeURI(payload).split(/%..|./).length - 1;
  const burstDurationSec = Math.max(0.8, Number((byteCount * 0.028).toFixed(1)));

  const handleStartBroadcast = () => {
    if (isBroadcasting) return;
    setIsBroadcasting(true);

    // Simulate 2.4s acoustic transmission burst
    setTimeout(() => {
      setIsBroadcasting(false);

      // Verify all receivers
      setReceivers((prev) =>
        prev.map((r) => ({
          ...r,
          status: 'verified',
          latency: `${Math.floor(Math.random() * 8) + 10}ms`,
        }))
      );
    }, 2400);
  };

  const handlePaste = async () => {
    try {
      if (Clipboard && Clipboard.getStringAsync) {
        const text = await Clipboard.getStringAsync();
        if (text) setPayload(text);
      }
    } catch {
      // ignore
    }
  };

  const setPreset = (type: 'exam' | 'wifi' | 'notice') => {
    if (type === 'exam') {
      setPayload('https://exam.hall.local/session/hall-402-paper-b');
    } else if (type === 'wifi') {
      setPayload('WIFI:S:ExamSecureNet;T:WPA;P:SonicShield2026;;');
    } else {
      setPayload('NOTICE: 15 minutes remaining. Please submit booklets to invigilator.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Visualizer & Dynamic Transducer */}
      <AcousticTransducer
        mode="broadcast"
        isBroadcasting={isBroadcasting}
        carrierFreq={selectedCarrier.freq}
        rmsLevel={isBroadcasting ? -1.8 : -18.4}
        snr={28}
      />

      {/* Payload Composer Bay */}
      <View style={styles.composerCard}>
        <View style={styles.composerHeader}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="text-box-outline" size={18} color={Theme.colors.primary} />
            <Text style={styles.composerTitle}>BROADCAST PAYLOAD</Text>
          </View>
          <View style={styles.fecBadge}>
            <Text style={styles.fecBadgeText}>RS-FEC L3 ENCODED</Text>
          </View>
        </View>

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={3}
          value={payload}
          onChangeText={setPayload}
          placeholder="Enter broadcast URL, exam token, or alert message..."
          placeholderTextColor={Theme.colors.textDim}
          selectionColor={Theme.colors.primary}
        />

        {/* Quick Presets Bar */}
        <View style={styles.presetsRow}>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => setPreset('exam')}
            activeOpacity={0.7}
          >
            <Feather name="link-2" size={13} color={Theme.colors.primary} />
            <Text style={styles.presetChipText}>Exam URL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => setPreset('wifi')}
            activeOpacity={0.7}
          >
            <Feather name="wifi" size={13} color={Theme.colors.textSecondary} />
            <Text style={styles.presetChipText}>Wi-Fi Key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => setPreset('notice')}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={13} color={Theme.colors.textSecondary} />
            <Text style={styles.presetChipText}>Notice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetChip}
            onPress={handlePaste}
            activeOpacity={0.7}
          >
            <Feather name="clipboard" size={13} color={Theme.colors.textSecondary} />
            <Text style={styles.presetChipText}>Paste</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.presetChip, styles.clearChip]}
            onPress={() => setPayload('')}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={13} color={Theme.colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Payload Metrics Footer */}
        <View style={styles.metricsFooter}>
          <View style={styles.metricsLeft}>
            <Text style={styles.metricText}>
              <Text style={styles.metricBold}>{byteCount}</Text> / 256 Bytes
            </Text>
            <Text style={styles.metricDivider}>•</Text>
            <Text style={styles.metricText}>~{burstDurationSec}s Audio Burst</Text>
          </View>
          <Text style={styles.crcStatus}>CRC-16 Framed</Text>
        </View>
      </View>

      {/* Carrier Frequency Protocol */}
      <CarrierSelector
        selectedId={selectedCarrier.id}
        onSelect={(carrier) => setSelectedCarrier(carrier)}
      />

      {/* Confirmed Receiving Nodes (PS02 Constraint) */}
      <ConfirmedReceiversList nodes={receivers} isAwaitingAcks={isBroadcasting} />

      {/* Main Broadcast Action Button */}
      <TouchableOpacity
        style={[styles.broadcastButton, isBroadcasting && styles.broadcastingButtonActive]}
        onPress={handleStartBroadcast}
        activeOpacity={0.85}
        disabled={isBroadcasting}
      >
        <MaterialCommunityIcons
          name={isBroadcasting ? 'waveform' : 'volume-high'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.broadcastButtonText}>
          {isBroadcasting ? 'Emitting Ultrasonic Burst...' : 'Transmit Audio Payload'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.disclaimerText}>
        Sound waves are transmitted via built-in smartphone speakers. Nearby receivers will decode automatically without Wi-Fi, Bluetooth, or pairing.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bg,
  },
  content: {
    padding: Theme.spacing.lg,
    paddingBottom: 40,
  },
  composerCard: {
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
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  composerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.6,
  },
  fecBadge: {
    backgroundColor: Theme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(29, 78, 216, 0.2)',
  },
  fecBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  textInput: {
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    color: Theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 74,
    textAlignVertical: 'top',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
    flexWrap: 'wrap',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.bgCardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  clearChip: {
    paddingHorizontal: 8,
    marginLeft: 'auto',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  metricsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  metricsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  metricBold: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
  },
  metricDivider: {
    color: Theme.colors.textDim,
  },
  crcStatus: {
    fontSize: 11,
    color: Theme.colors.successText,
    fontWeight: '600',
  },
  broadcastButton: {
    height: 50,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: Theme.spacing.sm,
  },
  broadcastingButtonActive: {
    backgroundColor: '#1E40AF',
  },
  broadcastButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  disclaimerText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Theme.spacing.md,
  },
});
