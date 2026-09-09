import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

interface HeaderProps {
  stationName?: string;
  isOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stationName = 'Station 01',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.brandGroup}>
          <Text style={styles.greeting}>Offline Acoustic Air-Gap</Text>
          <View style={styles.titleRow}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="waveform" size={18} color={Theme.colors.primary} />
            </View>
            <Text style={styles.title}>SoundBridge</Text>
          </View>
        </View>

        {/* Right Station Avatar Pill (Matching the 'A' avatar in the reference screenshot) */}
        <View style={styles.avatarPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.stationText}>{stationName}</Text>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>S</Text>
          </View>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    gap: 2,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.textMuted,
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  avatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: 25,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Theme.colors.success,
  },
  stationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
});
