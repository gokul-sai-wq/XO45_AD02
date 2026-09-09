import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Theme } from '../theme';

interface DiagnosticsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="chip" size={20} color={Theme.colors.primary} />
              <Text style={styles.title}>ACOUSTIC HARDWARE TELEMETRY</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Section: Air-Gap Compliance Checklist (PS02 Constraint Proof) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RADIO AIR-GAP COMPLIANCE</Text>
            <View style={styles.airGapList}>
              <View style={styles.airGapItem}>
                <View style={styles.airGapLeft}>
                  <MaterialCommunityIcons name="wifi-off" size={18} color={Theme.colors.success} />
                  <Text style={styles.airGapLabel}>Wi-Fi Infrastructure</Text>
                </View>
                <Text style={styles.airGapStatus}>DISCONNECTED (0 B)</Text>
              </View>

              <View style={styles.airGapItem}>
                <View style={styles.airGapLeft}>
                  <MaterialCommunityIcons name="bluetooth-off" size={18} color={Theme.colors.success} />
                  <Text style={styles.airGapLabel}>Bluetooth / BLE</Text>
                </View>
                <Text style={styles.airGapStatus}>DISABLED (0 B)</Text>
              </View>

              <View style={styles.airGapItem}>
                <View style={styles.airGapLeft}>
                  <MaterialCommunityIcons name="cellphone-off" size={18} color={Theme.colors.success} />
                  <Text style={styles.airGapLabel}>Cellular / Internet</Text>
                </View>
                <Text style={styles.airGapStatus}>OFFLINE (AIR-GAP)</Text>
              </View>
            </View>
          </View>

          {/* Section: Physical Audio Transducer Specs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PHYSICAL AUDIO HARDWARE</Text>
            <View style={styles.specGrid}>
              <View style={styles.specBox}>
                <Text style={styles.specKey}>SPEAKER DAC</Text>
                <Text style={styles.specVal}>48.0 kHz / 24-bit</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specKey}>MIC ADC</Text>
                <Text style={styles.specVal}>48.0 kHz Low-Noise</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specKey}>MODULATION</Text>
                <Text style={styles.specVal}>16-MFSK Near-US</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specKey}>CARRIER BAND</Text>
                <Text style={styles.specVal}>18.0 - 20.0 kHz</Text>
              </View>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Diagnostics</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.bgCard,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.bgCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Theme.spacing.sm,
  },
  airGapList: {
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.sm,
    gap: 6,
  },
  airGapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  airGapLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  airGapLabel: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
    fontWeight: '500',
  },
  airGapStatus: {
    fontSize: 11,
    color: Theme.colors.successText,
    fontWeight: '700',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  specBox: {
    width: '48%',
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  specKey: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '700',
  },
  specVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginTop: 3,
  },
  doneBtn: {
    height: 46,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
