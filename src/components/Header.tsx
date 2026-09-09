import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Theme } from '../theme';

interface HeaderProps {
  userName?: string;
  stationName?: string;
  isOnline?: boolean;
  onOpenOnboarding?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = '',
  stationName = 'Station 01',
  onOpenOnboarding,
  onLogout,
}) => {
  const displayName = userName.trim() ? `${userName.trim()}'s Station` : stationName;
  const initial = userName.trim() ? userName.trim().charAt(0).toUpperCase() : 'S';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.brandGroup}>
          <Text style={styles.greeting}>Offline Acoustic Air-Gap</Text>
          <View style={styles.titleRow}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="waveform" size={18} color={Theme.colors.primary} />
            </View>
            <Text style={styles.title}>EchoWave</Text>
          </View>
        </View>

        {/* Right Actions Group: Avatar Pill + Logout Button */}
        <View style={styles.rightActionsGroup}>
          <TouchableOpacity
            style={styles.avatarPill}
            onPress={onOpenOnboarding}
            activeOpacity={0.75}
          >
            <View style={styles.greenPulseDot} />
            <Text style={styles.stationText} numberOfLines={1}>{displayName}</Text>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          </TouchableOpacity>

          {onLogout && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.7}
              accessibilityLabel="Log out station"
            >
              <Feather name="log-out" size={15} color="#EF4444" />
            </TouchableOpacity>
          )}
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
  rightActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
