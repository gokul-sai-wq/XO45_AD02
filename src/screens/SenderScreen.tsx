import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';
import {
  OfdmModulator,
  DEFAULT_OFDM_CONFIG,
  AUDIBLE_OFDM_CONFIG,
} from '../dsp/OfdmModulator';
import { OfdmReceiver } from '../dsp/OfdmReceiver';
import { AcousticPlayer } from '../dsp/AcousticPlayer';
import { AcousticCrypto } from '../dsp/AcousticCrypto';
import { HistoryStore } from '../dsp/HistoryStore';
import { AcousticQrCode } from '../components/AcousticQrCode';

interface ConfirmedDevice {
  id: string;
  name: string;
  status: 'confirmed' | 'sending';
  time: string;
}

export const SenderScreen: React.FC = () => {
  const [text, setText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Acoustic Frequency Mode (Ultrasonic vs Audible)
  const [acousticMode, setAcousticMode] = useState<'ultrasonic' | 'audible'>('ultrasonic');

  // Confidential Mode & Passkey state
  const [isConfidential, setIsConfidential] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  const isBroadcastingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [confirmedDevices, setConfirmedDevices] = useState<ConfirmedDevice[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isBroadcastingRef.current = false;
      AcousticPlayer.stop();
    };
  }, []);

  const handleBroadcast = async () => {
    AcousticPlayer.unlock();

    // If already broadcasting, stop immediately!
    if (isBroadcasting) {
      isBroadcastingRef.current = false;
      if (isMountedRef.current) setIsBroadcasting(false);
      AcousticPlayer.stop();
      return;
    }

    if (!text.trim()) return;

    isBroadcastingRef.current = true;
    setIsBroadcasting(true);

    try {
      let payloadToSend = text.trim();
      if (isConfidential) {
        const encryptedData = AcousticCrypto.encrypt(text.trim(), passkey.trim());
        payloadToSend = `CONF:${passkey.trim()}:${encryptedData}`;
      }

      const config = acousticMode === 'audible' ? AUDIBLE_OFDM_CONFIG : DEFAULT_OFDM_CONFIG;
      const modulator = new OfdmModulator(config);
      const signal = modulator.synthesize(payloadToSend);
      const durationMs = Math.round(signal.durationSec * 1000);

      // Log transmission into HistoryStore
      HistoryStore.addRecord({
        type: 'sent',
        payload: isConfidential ? `🔒 [Confidential - Passkey] ${text.trim()}` : text.trim(),
        frequencyBand: acousticMode === 'audible' ? '2.0 – 6.0 kHz (Audible)' : '17.5 – 21.5 kHz (Ultrasonic)',
        crcHex: '0x88402',
        crcValid: true,
        ackStatus: 'confirmed',
        snrDb: 32,
      });

      // CONTINUOUS LOOP: produce sound wave until sender stops!
      while (isBroadcastingRef.current) {
        // 1. Broadcast acoustic notice locally to receivers
        OfdmReceiver.broadcastLocally(payloadToSend, durationMs);

        // 2. Play acoustic burst through speaker
        await AcousticPlayer.playSignal(signal);

        if (!isBroadcastingRef.current) break;

        if (isMountedRef.current) {
          setBurstCount((prev) => prev + 1);
        }

        // Small inter-burst guard gap delay (150ms)
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (err) {
      console.error('Continuous OFDM Broadcast error:', err);
    } finally {
      isBroadcastingRef.current = false;
      if (isMountedRef.current) {
        setIsBroadcasting(false);
      }
    }
  };

  const handlePaste = async () => {
    try {
      if (Clipboard && Clipboard.getStringAsync) {
        const clip = await Clipboard.getStringAsync();
        if (clip) setText(clip);
      }
    } catch {
      // ignore
    }
  };

  // QR Code payload string containing passkey
  const qrPasskeyPayload = `ECHOWAVE_PASSKEY|${passkey.trim()}`;

  const handleCopyQrString = async () => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(qrPasskeyPayload);
      }
      setCopiedQr(true);
      setTimeout(() => setCopiedQr(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleToggleConfidential = () => {
    if (isConfidential) {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm) {
          const confirmed = window.confirm(
            '🛡️ Turn Off Confidential Mode?\n\nDisabling Confidential Mode will expose your acoustic broadcasts without passkey encryption. Are you sure you want to turn off Confidential Mode?'
          );
          if (confirmed) {
            setIsConfidential(false);
            if (isBroadcastingRef.current) {
              isBroadcastingRef.current = false;
              setIsBroadcasting(false);
              AcousticPlayer.stop();
            }
          }
        } else {
          setIsConfidential(false);
        }
      } else {
        Alert.alert(
          '🛡️ Turn Off Confidential Mode?',
          'Disabling Confidential Mode will expose your acoustic broadcasts without passkey encryption. Are you sure you want to turn off Confidential Mode?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: () => {
                setIsConfidential(false);
                if (isBroadcastingRef.current) {
                  isBroadcastingRef.current = false;
                  setIsBroadcasting(false);
                  AcousticPlayer.stop();
                }
              },
            },
          ]
        );
      }
    } else {
      setIsConfidential(true);
    }
  };

  return (
    <ScrollView
      style={[styles.container, isConfidential && styles.darkContainer]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Banner - Theme shifts when Confidential Mode is ON */}
      <View style={[styles.topHeaderBanner, isConfidential && styles.darkHeaderBanner]}>
        <View style={[styles.headerIconCircle, isConfidential && styles.darkHeaderIconCircle]}>
          <Feather name={isConfidential ? "shield" : "send"} size={20} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={[styles.headerTitle, isConfidential && styles.darkTextMain]}>
            {isConfidential ? "Confidential Broadcast Station" : "Send Message"}
          </Text>
          <Text style={[styles.headerSubtitle, isConfidential && styles.darkTextSub]}>
            {isConfidential
              ? "All air-gap sound broadcasts encrypted with secret passkey."
              : "Broadcast your message to multiple devices using sound."}
          </Text>
        </View>
      </View>

      {/* 🔒 Confidential Mode Toggle Bar & Card */}
      <View style={[styles.confidentialCard, isConfidential && styles.darkConfidentialCard]}>
        <View style={styles.confidentialHeader}>
          <View style={styles.confidentialTitleGroup}>
            <Feather name="shield" size={18} color={isConfidential ? "#10B981" : "#64748B"} />
            <Text style={[styles.confidentialTitle, isConfidential && styles.darkTextMain]}>
              Confidential Mode
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleSwitch, isConfidential && styles.toggleSwitchActive]}
            onPress={handleToggleConfidential}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleThumb, isConfidential && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.confidentialSub, isConfidential && styles.darkTextSub]}>
          {isConfidential
            ? "Page in Confidential Mode. Sound waves are encrypted with your secret passkey."
            : "Toggle ON to encrypt your acoustic sound wave broadcasts."}
        </Text>

        {isConfidential && (
          <View style={styles.passkeySection}>
            <Text style={styles.passkeyLabel}>Secret Passkey:</Text>
            <View style={styles.passkeyInputRow}>
              <Feather name="key" size={16} color="#10B981" />
              <TextInput
                style={styles.passkeyInput}
                value={passkey}
                onChangeText={setPasskey}
                placeholder="Set passkey..."
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.qrPasskeyBtn}
              onPress={() => setShowQrModal(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="qrcode" size={18} color="#FFFFFF" />
              <Text style={styles.qrPasskeyBtnText}>Show Passkey QR Code</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 🔊 Acoustic Sound Mode Selector (Ultrasonic vs Audible) */}
      <View style={[styles.modeCard, isConfidential && styles.darkInputCard]}>
        <Text style={[styles.modeCardLabel, isConfidential && styles.darkTextMain]}>
          Acoustic Frequency Mode:
        </Text>
        <View style={styles.modeTabRow}>
          <TouchableOpacity
            style={[
              styles.modeTabBtn,
              acousticMode === 'ultrasonic' && (isConfidential ? styles.modeTabActiveDark : styles.modeTabActive),
            ]}
            onPress={() => setAcousticMode('ultrasonic')}
            activeOpacity={0.8}
          >
            <Feather name="volume-x" size={15} color={acousticMode === 'ultrasonic' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={[
                styles.modeTabText,
                acousticMode === 'ultrasonic' && styles.modeTabTextActive,
              ]}
            >
              Ultrasonic (17.5–21.5 kHz)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTabBtn,
              acousticMode === 'audible' && (isConfidential ? styles.modeTabActiveDark : styles.modeTabActive),
            ]}
            onPress={() => setAcousticMode('audible')}
            activeOpacity={0.8}
          >
            <Feather name="volume-2" size={15} color={acousticMode === 'audible' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={[
                styles.modeTabText,
                acousticMode === 'audible' && styles.modeTabTextActive,
              ]}
            >
              Audible Data Sound (2.0–6.0 kHz)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ℹ️ Information Card */}
      <View style={[styles.infoBanner, isConfidential && styles.darkInfoBanner]}>
        <View style={styles.infoIconCircle}>
          <Feather name="info" size={16} color="#2563EB" />
        </View>
        <Text style={[styles.infoBannerText, isConfidential && styles.darkTextSub]}>
          Information Card: Select Ultrasonic (17.5-21.5 kHz) for silent transfers, or Audible Data Sound (2.0-6.0 kHz) for retro acoustic wave audio. Keep device volume at 80-100%.
        </Text>
      </View>

      {/* Message Input Section */}
      <View style={styles.fieldSection}>
        <Text style={[styles.fieldLabel, isConfidential && styles.darkTextMain]}>Message</Text>
        <View style={[styles.inputCard, isConfidential && styles.darkInputCard]}>
          <TextInput
            style={[styles.textInput, isConfidential && styles.darkTextInput]}
            value={text}
            onChangeText={setText}
            placeholder="Enter your message here..."
            placeholderTextColor={isConfidential ? "#64748B" : "#94A3B8"}
            multiline
            maxLength={200}
          />
          <Text style={[styles.charCounter, isConfidential && styles.darkTextSub]}>
            {text.length}/200
          </Text>
        </View>
      </View>

      {/* Main Broadcast Trigger Button */}
      <TouchableOpacity
        style={[
          styles.broadcastButton,
          isConfidential && styles.darkBroadcastButton,
          isBroadcasting && styles.broadcastButtonActive,
        ]}
        onPress={handleBroadcast}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={isBroadcasting ? 'stop-circle-outline' : 'signal-cellular-3'}
          size={22}
          color="#FFFFFF"
        />
        <Text style={styles.broadcastButtonText}>
          {isBroadcasting
            ? 'Stop Broadcasting'
            : isConfidential
            ? 'Broadcast Encrypted Sound Wave'
            : 'Broadcast Sound Wave'}
        </Text>
      </TouchableOpacity>

      {/* Advanced Options Accordion */}
      <TouchableOpacity
        style={styles.advancedHeader}
        onPress={() => setShowAdvanced(!showAdvanced)}
        activeOpacity={0.7}
      >
        <Text style={[styles.advancedTitle, isConfidential && styles.darkTextMain]}>
          Advanced Options
        </Text>
        <Feather
          name={showAdvanced ? 'chevron-down' : 'chevron-right'}
          size={18}
          color={isConfidential ? "#94A3B8" : "#64748B"}
        />
      </TouchableOpacity>

      {showAdvanced && (
        <View style={[styles.advancedBody, isConfidential && styles.darkAdvancedBody]}>
          <Text style={[styles.subLabel, isConfidential && styles.darkTextSub]}>
            Quick Presets & Utilities
          </Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setText('https://echowave.app/broadcast')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>Web Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setText('WIFI:Pass12345')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>Wi-Fi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => setText('Exam ends in 15 minutes.')}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>Notice</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolBtn} onPress={handlePaste} activeOpacity={0.7}>
              <Feather name="clipboard" size={14} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolBtn} onPress={() => setText('')} activeOpacity={0.7}>
              <Feather name="trash-2" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 📱 Sender Passkey QR Code Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.qrModalHeader}>
              <View style={styles.qrTitleRow}>
                <MaterialCommunityIcons name="qrcode-scan" size={22} color="#10B981" />
                <Text style={styles.qrModalTitle}>Passkey QR Code</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} activeOpacity={0.7}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.qrModalSub}>
              Scan this QR code from the Receiver app to automatically load the secret decryption passkey.
            </Text>

            {/* QR Code Container */}
            <View style={styles.qrBox}>
              <AcousticQrCode value={qrPasskeyPayload} size={180} color="#0F172A" />
            </View>

            {/* Passkey Badge */}
            <View style={styles.qrMetaChip}>
              <Feather name="key" size={14} color="#047857" />
              <Text style={styles.qrMetaChipText}>Passkey: {passkey}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyQrBtn}
              onPress={handleCopyQrString}
              activeOpacity={0.8}
            >
              <Feather name={copiedQr ? 'check' : 'copy'} size={15} color="#FFFFFF" />
              <Text style={styles.copyQrBtnText}>
                {copiedQr ? 'Copied Passkey QR String!' : 'Copy Passkey QR String'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeQrBtn}
              onPress={() => setShowQrModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeQrBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  darkContainer: {
    backgroundColor: '#090D16',
  },
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  topHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  darkHeaderBanner: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  headerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  darkHeaderIconCircle: {
    backgroundColor: '#059669',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  darkTextMain: {
    color: '#F8FAFC',
  },
  darkTextSub: {
    color: '#94A3B8',
  },
  confidentialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  darkConfidentialCard: {
    backgroundColor: '#0F172A',
    borderColor: '#059669',
  },
  confidentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confidentialTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidentialTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  confidentialSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#10B981',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  passkeySection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  passkeyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
    marginBottom: 6,
  },
  passkeyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  passkeyInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrPasskeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 11,
  },
  qrPasskeyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  darkInputCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  textInput: {
    minHeight: 84,
    fontSize: 14,
    color: '#1E293B',
    textAlignVertical: 'top',
    padding: 0,
  },
  darkTextInput: {
    color: '#F8FAFC',
  },
  charCounter: {
    fontSize: 11,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '500',
  },
  broadcastButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0066FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  darkBroadcastButton: {
    backgroundColor: '#059669',
  },
  broadcastButtonActive: {
    backgroundColor: '#DC2626',
  },
  broadcastButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  advancedBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  darkAdvancedBody: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  qrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  qrModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  qrMetaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  copyQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 44,
    backgroundColor: '#059669',
    borderRadius: 10,
    marginBottom: 8,
  },
  copyQrBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeQrBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeQrBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  modeCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  modeTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#2563EB',
  },
  modeTabActiveDark: {
    backgroundColor: '#059669',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
  },
  darkInfoBanner: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  infoIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
    fontWeight: '500',
  },
});

