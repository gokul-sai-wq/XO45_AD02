import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ACOUSTIC_FREQUENCY_CHANNELS, AcousticChannel } from '../dsp/OfdmModulator';

interface AcousticFrequencySelectorProps {
  selectedChannel: AcousticChannel;
  onSelectChannel: (channel: AcousticChannel) => void;
  disabled?: boolean;
}

export const AcousticFrequencySelector: React.FC<AcousticFrequencySelectorProps> = ({
  selectedChannel,
  onSelectChannel,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialCommunityIcons name="waveform" size={18} color="#059669" />
          <Text style={styles.title}>Acoustic Frequency Channel</Text>
        </View>
        <View style={styles.freqBadge}>
          <Text style={styles.freqBadgeText}>{selectedChannel.frequencyLabel}</Text>
        </View>
      </View>

      <Text style={styles.subText}>
        Set your confidential frequency range. The sender and receiver must be set to the exact same frequency channel to pass data over the air.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.channelsList}
      >
        {ACOUSTIC_FREQUENCY_CHANNELS.map((channel) => {
          const isSelected = channel.id === selectedChannel.id;
          return (
            <TouchableOpacity
              key={channel.id}
              style={[
                styles.channelChip,
                isSelected && styles.channelChipSelected,
                disabled && styles.disabledChip,
              ]}
              onPress={() => !disabled && onSelectChannel(channel)}
              activeOpacity={0.8}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.channelName,
                  isSelected && styles.channelNameSelected,
                ]}
              >
                {channel.name}
              </Text>
              <Text
                style={[
                  styles.channelFreq,
                  isSelected && styles.channelFreqSelected,
                ]}
              >
                {channel.frequencyLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  freqBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  freqBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  subText: {
    fontSize: 11,
    color: '#059669',
    lineHeight: 16,
    marginBottom: 10,
  },
  channelsList: {
    gap: 8,
  },
  channelChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  channelChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  disabledChip: {
    opacity: 0.6,
  },
  channelName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 2,
  },
  channelNameSelected: {
    color: '#FFFFFF',
  },
  channelFreq: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  channelFreqSelected: {
    color: '#D1FAE5',
  },
});
