import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

interface HeaderProps {
  mode: 'broadcast' | 'receive';
  onModeChange: (mode: 'broadcast' | 'receive') => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeChange }) => {
  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.brandRow}>
        <View style={styles.logoGroup}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="waveform" size={20} color={Theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>SoundBridge</Text>
            <Text style={styles.subtitle}>Offline Acoustic Communication</Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.statusBadgeText}>Ready</Text>
        </View>
      </View>

      {/* Clean Mode Switcher */}
      <View style={styles.tabTrack}>
        <TouchableOpacity
          style={[styles.tabBtn, mode === 'broadcast' && styles.tabBtnActive]}
          onPress={() => onModeChange('broadcast')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="arrow-up-circle"
            size={16}
            color={mode === 'broadcast' ? Theme.colors.primary : Theme.colors.textMuted}
          />
          <Text style={[styles.tabText, mode === 'broadcast' && styles.tabTextActive]}>
            Send
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, mode === 'receive' && styles.tabBtnActive]}
          onPress={() => onModeChange('receive')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="arrow-down-circle"
            size={16}
            color={mode === 'receive' ? Theme.colors.primary : Theme.colors.textMuted}
          />
          <Text style={[styles.tabText, mode === 'receive' && styles.tabTextActive]}>
            Receive
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.success,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.successText,
  },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Theme.radius.md - 2,
  },
  tabBtnActive: {
    backgroundColor: Theme.colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textMuted,
  },
  tabTextActive: {
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
});
