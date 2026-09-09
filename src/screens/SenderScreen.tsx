import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';

interface ConfirmedDevice {
  id: string;
  name: string;
  status: 'confirmed' | 'sending';
  time: string;
}

export const SenderScreen: React.FC = () => {
  const [text, setText] = useState('https://exam.hall.local/paper-b');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [confirmedDevices, setConfirmedDevices] = useState<ConfirmedDevice[]>([
    { id: '1', name: 'Pixel 8 Pro (Desk 01)', status: 'confirmed', time: 'Just now' },
    { id: '2', name: 'Galaxy S24 (Desk 02)', status: 'confirmed', time: 'Just now' },
    { id: '3', name: 'iPad (Desk 03)', status: 'confirmed', time: 'Just now' },
  ]);

  const handleBroadcast = () => {
    if (!text.trim() || isBroadcasting) return;
    setIsBroadcasting(true);

    // Simulate 2-second acoustic broadcast
    setTimeout(() => {
      setIsBroadcasting(false);
      setConfirmedDevices([
        { id: '1', name: 'Pixel 8 Pro (Desk 01)', status: 'confirmed', time: 'Just now' },
        { id: '2', name: 'Galaxy S24 (Desk 02)', status: 'confirmed', time: 'Just now' },
        { id: '3', name: 'iPad (Desk 03)', status: 'confirmed', time: 'Just now' },
      ]);
    }, 2200);
  };

  const handlePaste = async () => {
    try {
      if (Clipboard && Clipboard.getStringAsync) {
        const clip = await Clipboard.getStringAsync();
        if (clip) setText(clip);
      }
    } catch {
      // ignore
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Message Composer Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>MESSAGE OR URL TO BROADCAST</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type message, exam URL, or notice..."
          placeholderTextColor={Theme.colors.textDim}
          multiline
          numberOfLines={3}
        />

        {/* Quick Presets & Actions */}
        <View style={styles.actionRow}>
          <View style={styles.presets}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setText('https://exam.hall.local/paper-b')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>Exam Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setText('WIFI:Pass12345')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>Wi-Fi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setText('Exam ends in 15 minutes.')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>Notice</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputTools}>
            <TouchableOpacity style={styles.toolBtn} onPress={handlePaste} activeOpacity={0.7}>
              <Feather name="clipboard" size={15} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setText('')}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={15} color={Theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Broadcast Trigger */}
      <TouchableOpacity
        style={[styles.broadcastButton, isBroadcasting && styles.broadcastButtonActive]}
        onPress={handleBroadcast}
        activeOpacity={0.85}
        disabled={isBroadcasting}
      >
        <MaterialCommunityIcons
          name={isBroadcasting ? 'waveform' : 'volume-high'}
          size={22}
          color="#FFFFFF"
        />
        <Text style={styles.broadcastButtonText}>
          {isBroadcasting ? 'Broadcasting via Sound...' : 'Broadcast to Nearby Devices'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.offlineNote}>
        Emits inaudible near-ultrasonic sound waves. No Wi-Fi, Bluetooth, or pairing required.
      </Text>

      {/* Confirmed Receivers Section (PS02 Constraint) */}
      <View style={styles.card}>
        <View style={styles.receiversHeader}>
          <View style={styles.receiversHeaderLeft}>
            <View style={styles.greenDot} />
            <Text style={styles.receiversTitle}>
              CONFIRMED RECEIVERS ({confirmedDevices.length})
            </Text>
          </View>
          <Text style={styles.ackLabel}>Acoustic ACK</Text>
        </View>

        <View style={styles.devicesList}>
          {confirmedDevices.map((device) => (
            <View key={device.id} style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <View style={styles.deviceIconBox}>
                  <MaterialCommunityIcons name="cellphone" size={18} color={Theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceTime}>Received {device.time}</Text>
                </View>
              </View>
              <View style={styles.confirmedBadge}>
                <Feather name="check" size={13} color={Theme.colors.successText} />
                <Text style={styles.confirmedBadgeText}>Received</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
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
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: Theme.spacing.sm,
  },
  input: {
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    fontSize: 14,
    color: Theme.colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  presets: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    backgroundColor: Theme.colors.bgCardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  inputTools: {
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.bgCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  broadcastButton: {
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: Theme.spacing.sm,
  },
  broadcastButtonActive: {
    backgroundColor: '#1E40AF',
  },
  broadcastButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  offlineNote: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 16,
    paddingHorizontal: Theme.spacing.md,
  },
  receiversHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  receiversHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.success,
  },
  receiversTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  ackLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  devicesList: {
    gap: Theme.spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  deviceIconBox: {
    width: 34,
    height: 34,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  deviceTime: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.successText,
  },
});
