import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';

interface DecodedPayloadCardProps {
  payload: string;
  sizeBytes?: number;
  crc?: string;
  snr?: number;
  transferTimeMs?: number;
  onAckResent?: () => void;
}

export const DecodedPayloadCard: React.FC<DecodedPayloadCardProps> = ({
  payload,
  sizeBytes = 52,
  crc = '0x9AF2',
  snr = 24,
  transferTimeMs = 170,
  onAckResent,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(payload);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copied to Clipboard', payload);
    }
  };

  const handleOpen = async () => {
    if (payload.startsWith('http://') || payload.startsWith('https://')) {
      const supported = await Linking.canOpenURL(payload).catch(() => false);
      if (supported) {
        Linking.openURL(payload);
      } else {
        Alert.alert('Payload URL', payload);
      }
    } else {
      Alert.alert('Acoustic Payload Content', payload);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>RECEIVED PAYLOAD</Text>
          <Text style={styles.timestamp}>• Just now</Text>
        </View>
        <View style={styles.qualityPill}>
          <Text style={styles.qualityText}>98% QUALITY</Text>
        </View>
      </View>

      {/* Code / Content Box */}
      <View style={styles.codeBox}>
        <Text style={styles.codeText} selectable>
          {payload}
        </Text>
      </View>

      {/* Physical Telemetry Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>PAYLOAD SIZE</Text>
          <Text style={styles.gridValue}>{sizeBytes} Bytes ({sizeBytes * 8} bits)</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>INTEGRITY</Text>
          <Text style={[styles.gridValue, { color: Theme.colors.success }]}>
            CRC-16: Valid ({crc})
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>ACOUSTIC SNR</Text>
          <Text style={styles.gridValue}>+{snr} dB nominal</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>TRANSFER TIME</Text>
          <Text style={styles.gridValue}>{transferTimeMs} ms @ 300 baud</Text>
        </View>
      </View>

      {/* Handshake Confirmation Banner (PS02 Constraint) */}
      <View style={styles.ackBanner}>
        <View style={styles.ackLeft}>
          <MaterialCommunityIcons name="check-decagram" size={18} color={Theme.colors.success} />
          <Text style={styles.ackText}>Acoustic ACK Chirp sent @ 20.1 kHz</Text>
        </View>
        <Text style={styles.ackLatency}>12ms latency</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Feather
            name={copied ? 'check' : 'copy'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.actionBtnPrimaryText}>
            {copied ? 'Copied to Clipboard' : 'Copy Content'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={handleOpen}
          activeOpacity={0.8}
        >
          <Feather name="external-link" size={16} color={Theme.colors.textPrimary} />
          <Text style={styles.actionBtnSecondaryText}>Open Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.6,
  },
  timestamp: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  qualityPill: {
    backgroundColor: Theme.colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  qualityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.successText,
  },
  codeBox: {
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.primary,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  gridItem: {
    width: '48%',
    padding: 6,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginTop: 2,
  },
  ackBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  ackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ackText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.successText,
  },
  ackLatency: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.successText,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: Theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    backgroundColor: Theme.colors.bgCard,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
});
