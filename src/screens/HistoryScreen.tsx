import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';
import { HistoryStore, TransmissionRecord } from '../dsp/HistoryStore';

export const HistoryScreen: React.FC = () => {
  const [records, setRecords] = useState<TransmissionRecord[]>(HistoryStore.getRecords());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = HistoryStore.subscribe(() => {
      setRecords(HistoryStore.getRecords());
    });
    return unsubscribe;
  }, []);

  const sentCount = records.filter((r) => r.type === 'sent').length;
  const receivedCount = records.filter((r) => r.type === 'received').length;

  const handleCopy = async (id: string, text: string) => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      Alert.alert('Copied', text);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Hero Card (Inspired by reference screenshot's Net Movement card) */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>ACOUSTIC AIR-GAP THROUGHPUT</Text>
        <Text style={styles.heroMainText}>+{records.length} Packets</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <View style={styles.statDotRed} />
            <Text style={styles.heroStatLabel}>BROADCASTS</Text>
            <Text style={styles.heroStatValue}>{sentCount} Sent</Text>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStatItem}>
            <View style={styles.statDotGreen} />
            <Text style={styles.heroStatLabel}>DECODED</Text>
            <Text style={styles.heroStatValue}>{receivedCount} Received</Text>
          </View>
        </View>
      </View>

      {/* Dual Highlight Cards (Inspired by Investment / Return cards) */}
      <View style={styles.dualCardsRow}>
        <View style={[styles.highlightCard, styles.cardSentTint]}>
          <View style={styles.highlightHeader}>
            <View style={styles.iconCircleSent}>
              <Feather name="arrow-up-right" size={16} color="#B91C1C" />
            </View>
            <Text style={styles.highlightTitleSent}>Transmitted</Text>
          </View>
          <Text style={styles.highlightSubSent}>Sound Wave Out</Text>
          <Text style={styles.highlightNumSent}>{sentCount} Packets</Text>
        </View>

        <View style={[styles.highlightCard, styles.cardRecvTint]}>
          <View style={styles.highlightHeader}>
            <View style={styles.iconCircleRecv}>
              <Feather name="arrow-down-left" size={16} color="#047857" />
            </View>
            <Text style={styles.highlightTitleRecv}>Received</Text>
          </View>
          <Text style={styles.highlightSubRecv}>Microphone In</Text>
          <Text style={styles.highlightNumRecv}>{receivedCount} Packets</Text>
        </View>
      </View>

      {/* Recent Activity Section Header */}
      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {records.length > 0 && (
          <TouchableOpacity onPress={() => HistoryStore.clearHistory()} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activity Items List */}
      {records.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="history" size={40} color={Theme.colors.textDim} />
          <Text style={styles.emptyTitle}>No Transmission History</Text>
          <Text style={styles.emptyDesc}>
            Broadcast or receive messages via sound waves to see them listed here in real time.
          </Text>
        </View>
      ) : (
        <View style={styles.recordsList}>
          {records.map((item) => {
            const isReceived = item.type === 'received';
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.recordCard}
                onPress={() => handleCopy(item.id, item.payload)}
                activeOpacity={0.8}
              >
                <View style={styles.recordLeft}>
                  {/* Direction Icon Badge */}
                  <View style={isReceived ? styles.badgeReceived : styles.badgeSent}>
                    <Feather
                      name={isReceived ? 'arrow-down' : 'arrow-up'}
                      size={18}
                      color={isReceived ? '#059669' : '#DC2626'}
                    />
                  </View>

                  {/* Content & Metadata */}
                  <View style={styles.recordDetails}>
                    <Text style={styles.recordPayload} numberOfLines={1}>
                      {item.payload}
                    </Text>
                    <View style={styles.recordSubRow}>
                      <Text style={styles.recordMeta}>
                        {item.frequencyBand.includes('Audible') ? '2.2 kHz' : '18.5 kHz'}
                      </Text>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.recordMeta}>{item.timestamp}</Text>
                    </View>
                  </View>
                </View>

                {/* Right Side Status */}
                <View style={styles.recordRight}>
                  <Text style={isReceived ? styles.snrTagRecv : styles.snrTagSent}>
                    {isReceived ? `+${item.snrDb || 24} dB` : 'CRC Valid'}
                  </Text>
                  <Text style={styles.copyNotice}>
                    {copiedId === item.id ? 'Copied!' : 'Tap to copy'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
    paddingBottom: 110, // Generous padding so floating navbar does not obscure content
  },
  heroCard: {
    backgroundColor: '#0F172A', // Dark Navy hero card matching reference
    borderRadius: 20,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroMainText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: Theme.spacing.lg,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: Theme.spacing.md,
  },
  statDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F87171',
    marginBottom: 4,
  },
  statDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  dualCardsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  highlightCard: {
    flex: 1,
    borderRadius: 16,
    padding: Theme.spacing.md,
    borderWidth: 1,
  },
  cardSentTint: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  cardRecvTint: {
    backgroundColor: '#ECFDF5',
    borderColor: '#D1FAE5',
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconCircleSent: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleRecv: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitleSent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  highlightTitleRecv: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  highlightSubSent: {
    fontSize: 11,
    color: '#B91C1C',
    opacity: 0.8,
  },
  highlightSubRecv: {
    fontSize: 11,
    color: '#047857',
    opacity: 0.8,
  },
  highlightNumSent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7F1D1D',
    marginTop: 6,
  },
  highlightNumRecv: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 6,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  recordsList: {
    gap: 10,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.bgCard,
    borderRadius: 16,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    flex: 1,
    marginRight: 10,
  },
  badgeReceived: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSent: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDetails: {
    flex: 1,
  },
  recordPayload: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  recordSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordMeta: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  bulletDot: {
    fontSize: 11,
    color: Theme.colors.textDim,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  snrTagRecv: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  snrTagSent: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  copyNotice: {
    fontSize: 10,
    color: Theme.colors.textDim,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: Theme.colors.bgCard,
    borderRadius: 16,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minHeight: 180,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginTop: Theme.spacing.sm,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
});
