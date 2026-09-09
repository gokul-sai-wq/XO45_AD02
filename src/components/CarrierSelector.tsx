import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

export interface CarrierOption {
  id: string;
  freq: string;
  name: string;
  description: string;
  inaudible: boolean;
  tag: string;
}

export const CARRIERS: CarrierOption[] = [
  {
    id: '18.5',
    freq: '18.5 kHz',
    name: 'Standard Ultrasound',
    description: 'Inaudible • Balanced Range',
    inaudible: true,
    tag: 'RECOMMENDED',
  },
  {
    id: '19.2',
    freq: '19.2 kHz',
    name: 'High Density Burst',
    description: 'Fast Baud • Minimal Echo',
    inaudible: true,
    tag: 'FAST',
  },
  {
    id: '20.0',
    freq: '20.0 kHz',
    name: 'Stealth Inaudible',
    description: '100% Silent • Short Range',
    inaudible: true,
    tag: 'SILENT',
  },
  {
    id: '3.2',
    freq: '3.2 kHz',
    name: 'Audible Penetration',
    description: 'Noisy Venues • Long Range',
    inaudible: false,
    tag: 'AUDIBLE',
  },
];

interface CarrierSelectorProps {
  selectedId: string;
  onSelect: (carrier: CarrierOption) => void;
}

export const CarrierSelector: React.FC<CarrierSelectorProps> = ({
  selectedId,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MODULATION CARRIER PROTOCOL</Text>
        <Text style={styles.sectionChannel}>Channel 04 • 48 kHz DAC</Text>
      </View>

      <View style={styles.grid}>
        {CARRIERS.map((c) => {
          const isSelected = c.id === selectedId;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onSelect(c)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.freqText, isSelected && styles.freqTextSelected]}>
                  {c.freq}
                </Text>
                <MaterialCommunityIcons
                  name={isSelected ? 'check-circle' : 'radiobox-blank'}
                  size={18}
                  color={isSelected ? Theme.colors.primary : Theme.colors.textDim}
                />
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardDesc}>{c.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  sectionChannel: {
    fontSize: 11,
    color: Theme.colors.textDim,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  card: {
    width: '48.5%',
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    minHeight: 84,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    backgroundColor: Theme.colors.primaryMuted,
    borderColor: Theme.colors.primary,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freqText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  freqTextSelected: {
    color: Theme.colors.primary,
  },
  cardBottom: {
    marginTop: 6,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    lineHeight: 16,
  },
  cardDesc: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
});
