import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

export type TabKey = 'send' | 'receive' | 'history';

interface FloatingNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.floatingCapsule}>
        {/* Send Tab */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'send' && styles.tabItemActive]}
          onPress={() => onTabChange('send')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="waveform"
            size={18}
            color={activeTab === 'send' ? Theme.colors.textPrimary : Theme.colors.textDim}
          />
          {activeTab === 'send' && (
            <Text style={styles.activeLabel}>Send</Text>
          )}
        </TouchableOpacity>

        {/* Receive Tab */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'receive' && styles.tabItemActive]}
          onPress={() => onTabChange('receive')}
          activeOpacity={0.8}
        >
          <Feather
            name="radio"
            size={17}
            color={activeTab === 'receive' ? Theme.colors.textPrimary : Theme.colors.textDim}
          />
          {activeTab === 'receive' && (
            <Text style={styles.activeLabel}>Receive</Text>
          )}
        </TouchableOpacity>

        {/* History Tab */}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => onTabChange('history')}
          activeOpacity={0.8}
        >
          <Feather
            name="bar-chart-2"
            size={17}
            color={activeTab === 'history' ? Theme.colors.textPrimary : Theme.colors.textDim}
          />
          {activeTab === 'history' && (
            <Text style={styles.activeLabel}>History</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  floatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
    gap: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 25,
    minHeight: 38,
  },
  tabItemActive: {
    backgroundColor: '#F1F5F9', // Subtle active chip background matching reference
    gap: 6,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
});
