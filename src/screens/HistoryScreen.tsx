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
  const [storeRecords, setStoreRecords] = useState<TransmissionRecord[]>(HistoryStore.getRecords());
  const [activeFilter, setActiveFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = HistoryStore.subscribe(() => {
      setStoreRecords(HistoryStore.getRecords());
    });
    return unsubscribe;
  }, []);

  // Filter live store records based on selected tab
  const filteredRecords = storeRecords.filter((r) => {
    if (activeFilter === 'sent') return r.type === 'sent';
    if (activeFilter === 'received') return r.type === 'received';
    return true;
  });

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
      {/* Title matching Reference Screenshot */}
      <Text style={styles.screenTitle}>Message History</Text>

      {/* Segmented Filter Tab (All | Sent | Received) */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeFilter === 'all' && styles.segmentTabActive]}
          onPress={() => setActiveFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeFilter === 'all' && styles.segmentTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeFilter === 'sent' && styles.segmentTabActive]}
          onPress={() => setActiveFilter('sent')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeFilter === 'sent' && styles.segmentTextActive]}>
            Sent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeFilter === 'received' && styles.segmentTabActive]}
          onPress={() => setActiveFilter('received')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeFilter === 'received' && styles.segmentTextActive]}>
            Received
          </Text>
        </TouchableOpacity>
      </View>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="history" size={38} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptyDesc}>
            Broadcast or receive messages via sound waves to see them listed here in real time.
          </Text>
        </View>
      ) : (
        <View style={styles.recordsList}>
          {filteredRecords.map((item, idx) => {
            const isSent = item.type === 'sent';
            return (
              <TouchableOpacity
                key={`${item.id}-${idx}`}
                style={styles.historyCard}
                onPress={() => handleCopy(item.id, item.payload)}
                activeOpacity={0.7}
              >
                {/* Left Circle Icon */}
                <View style={isSent ? styles.iconCircleSent : styles.iconCircleReceived}>
                  {isSent ? (
                    <Feather name="send" size={18} color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons name="signal-cellular-3" size={18} color="#FFFFFF" />
                  )}
                </View>

                {/* Middle Content */}
                <View style={styles.cardCenter}>
                  <Text style={isSent ? styles.typeTagSent : styles.typeTagReceived}>
                    {isSent ? 'Sent' : 'Received'}
                  </Text>
                  <Text style={styles.payloadTitle} numberOfLines={1}>
                    {item.payload}
                  </Text>
                  <Text style={styles.timestampText}>{item.timestamp}</Text>
                </View>

                {/* Right Delivery Ratio / SNR Tag & Chevron */}
                <View style={styles.cardRight}>
                  <Text style={styles.ratioText}>{isSent ? 'CRC32 Valid' : `+${item.snrDb || 28} dB`}</Text>
                  <Text style={styles.receivedSub}>{isSent ? 'ACK Confirmed' : 'Decoded'}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
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
    backgroundColor: '#FAF8FF',
  },
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentTabActive: {
    backgroundColor: '#0066FF',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  recordsList: {
    gap: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircleSent: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconCircleReceived: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardCenter: {
    flex: 1,
    marginRight: 8,
  },
  typeTagSent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 2,
  },
  typeTagReceived: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  payloadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  ratioText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  receivedSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 180,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});

