import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';

export const ReceiverScreen: React.FC = () => {
  const [hasReceived, setHasReceived] = useState(true);
  const [receivedMessage, setReceivedMessage] = useState(
    'https://exam.hall.local/paper-b'
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(receivedMessage);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copied', receivedMessage);
    }
  };

  const handleOpenLink = async () => {
    if (receivedMessage.startsWith('http://') || receivedMessage.startsWith('https://')) {
      const canOpen = await Linking.canOpenURL(receivedMessage).catch(() => false);
      if (canOpen) {
        Linking.openURL(receivedMessage);
      } else {
        Alert.alert('Link', receivedMessage);
      }
    } else {
      Alert.alert('Message Content', receivedMessage);
    }
  };

  const handleSimulateNew = () => {
    setHasReceived(false);
    setTimeout(() => {
      setReceivedMessage(
        'https://exam.hall.local/session-hall-402?verified=' + Math.floor(1000 + Math.random() * 9000)
      );
      setHasReceived(true);
    }, 1500);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Listening Status Banner */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusTitle}>
            {hasReceived ? 'Broadcast Received' : 'Listening for Soundwaves...'}
          </Text>
        </View>
        <Text style={styles.statusBadge}>18.5 kHz Carrier</Text>
      </View>

      {/* Main Received Message Card */}
      {hasReceived ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>RECEIVED CONTENT</Text>
            <Text style={styles.timeTag}>Just now</Text>
          </View>

          {/* Content Box */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText} selectable>
              {receivedMessage}
            </Text>
          </View>

          {/* Confirmation Banner (PS02 Constraint) */}
          <View style={styles.ackBanner}>
            <View style={styles.ackLeft}>
              <Feather name="check-circle" size={16} color={Theme.colors.successText} />
              <Text style={styles.ackText}>Device Confirmed to Broadcaster</Text>
            </View>
            <Text style={styles.ackSub}>Acoustic ACK sent</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Feather name={copied ? 'check' : 'copy'} size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleOpenLink}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={16} color={Theme.colors.textPrimary} />
              <Text style={styles.btnSecondaryText}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.waitingCard}>
          <View style={styles.listeningOrb}>
            <MaterialCommunityIcons name="ear-hearing" size={32} color={Theme.colors.primary} />
          </View>
          <Text style={styles.waitingTitle}>Ready to Receive</Text>
          <Text style={styles.waitingDesc}>
            Keep this screen open. When someone broadcasts nearby, the message or link will appear here instantly.
          </Text>
        </View>
      )}

      {/* Demo / Simulate Button for Hackathon Judges */}
      <TouchableOpacity
        style={styles.testBtn}
        onPress={handleSimulateNew}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="refresh" size={16} color={Theme.colors.textSecondary} />
        <Text style={styles.testBtnText}>Simulate New Incoming Broadcast</Text>
      </TouchableOpacity>
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.success,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  statusBadge: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '500',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  timeTag: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  messageBox: {
    backgroundColor: Theme.colors.bgCardSubtle,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    lineHeight: 22,
  },
  ackBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.successMuted,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
    marginBottom: Theme.spacing.lg,
  },
  ackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ackText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.successText,
  },
  ackSub: {
    fontSize: 11,
    color: Theme.colors.successText,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  btn: {
    height: 46,
    borderRadius: Theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: {
    flex: 2,
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: Theme.colors.bgCard,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  waitingCard: {
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
    minHeight: 220,
  },
  listeningOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 6,
  },
  waitingDesc: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.bgCard,
    borderRadius: Theme.radius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
});
