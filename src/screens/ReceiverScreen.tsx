import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Animated,
  Platform,
  TextInput,
  Modal,
} from 'react-native';

const useNativeDriver = Platform.OS !== 'web';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';
import {
  OfdmReceiver,
  ReceptionMetrics,
} from '../dsp/OfdmReceiver';
import {
  DEFAULT_OFDM_CONFIG,
} from '../dsp/OfdmModulator';
import { HistoryStore } from '../dsp/HistoryStore';
import { AcousticCrypto } from '../dsp/AcousticCrypto';
import { AcousticPlayer } from '../dsp/AcousticPlayer';

export interface ReceiverLogItem {
  id: string;
  payload: string;
  time: string;
  status: 'Decoded' | 'Blocked' | 'Locked';
  snr: number;
}

export const ReceiverScreen: React.FC = () => {
  const [hasReceived, setHasReceived] = useState(false);
  const [receivedMessage, setReceivedMessage] = useState('');
  const [rawPayload, setRawPayload] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [carrierLocked, setCarrierLocked] = useState(false);
  const [signalLevelDb, setSignalLevelDb] = useState(-90);
  const [metrics, setMetrics] = useState<ReceptionMetrics | null>(null);
  const [partialState, setPartialState] = useState<{
    isPartial: boolean;
    receivedChunks: number;
    totalChunks: number;
    percent: number;
    statusText: string;
  } | null>(null);

  const [lateJoinerSynced, setLateJoinerSynced] = useState(false);
  const [syncSource, setSyncSource] = useState<'beacon' | 'mesh_peer' | null>(null);

  // Receiver Area Recent Logs state & deduplication ref
  const [recentLogs, setRecentLogs] = useState<ReceiverLogItem[]>([]);
  const lastProcessedRef = useRef<{ payload: string; time: number }>({ payload: '', time: 0 });

  // Confidential Mode State & Passkey
  const [isConfidential, setIsConfidential] = useState(false);
  const [receiverPasskey, setReceiverPasskey] = useState('');
  const [selectedOption, setSelectedOption] = useState<'type' | 'qr'>('type');

  // QR Scanner Modal State & Scan Laser Animation
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showQrScanner) {
      scanLineAnim.setValue(0);
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [showQrScanner]);

  // Animated scales for outer two rings driven by signal strength
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.35)).current;
  const ring2Opacity = useRef(new Animated.Value(0.2)).current;

  // Map dB (-90 silent → -20 loud) to 0..1
  const normalizeSignal = (db: number) =>
    Math.max(0, Math.min(1, (Math.max(-90, Math.min(-20, db)) + 90) / 70));

  // React to signal level changes → animate rings
  useEffect(() => {
    const strength = isScanning ? normalizeSignal(signalLevelDb) : 0;

    // Outer ring: expands up to 1.55x at full signal
    const outerScale = 1 + strength * 0.55;
    const midScale = 1 + strength * 0.3;
    const outerOp = 0.15 + strength * 0.5;
    const midOp = 0.3 + strength * 0.45;

    Animated.parallel([
      Animated.spring(ring2Scale, {
        toValue: outerScale,
        useNativeDriver,
        tension: 30,
        friction: 5,
      }),
      Animated.spring(ring1Scale, {
        toValue: midScale,
        useNativeDriver,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(ring2Opacity, {
        toValue: outerOp,
        duration: 150,
        useNativeDriver,
      }),
      Animated.timing(ring1Opacity, {
        toValue: midOp,
        duration: 150,
        useNativeDriver,
      }),
    ]).start();
  }, [signalLevelDb, isScanning]);

  const handleToggleScan = async () => {
    if (isScanning) {
      OfdmReceiver.stopListening();
      setIsScanning(false);
      setCarrierLocked(false);
      setSignalLevelDb(-90);
    } else {
      setIsScanning(true);

      const started = await OfdmReceiver.startListening(
        DEFAULT_OFDM_CONFIG,
        (payload, rxMetrics) => {
          // Deduplication safeguard: skip duplicate acoustic payloads within 3s
          const now = Date.now();
          if (
            lastProcessedRef.current.payload === payload &&
            now - lastProcessedRef.current.time < 3000
          ) {
            return;
          }
          lastProcessedRef.current = { payload, time: now };

          // Automatically stop receiver scan so received message does not repeat continuously!
          OfdmReceiver.stopListening();
          setIsScanning(false);
          setCarrierLocked(false);
          setSignalLevelDb(-90);

          setRawPayload(payload);
          setMetrics(rxMetrics);
          setHasReceived(true);

          let payloadToProcess = payload;
          let isLockedState = false;

          // Check if sender broadcasted in Confidential Mode
          if (payload.startsWith('CONF:')) {
            const parts = payload.split(':');
            const sentPasskey = parts[1];
            const encryptedData = parts.slice(2).join(':');

            if (!isConfidential) {
              Alert.alert(
                '🔒 Confidential Broadcast Blocked',
                'Sender used Confidential Mode & Passkey. Please toggle ON Confidential Mode on this receiver to decode.'
              );
              setReceivedMessage('🔒 Blocked: Enable Confidential Mode on Receiver to decode this signal.');
              setIsLocked(true);
              isLockedState = true;
              payloadToProcess = '🔒 Blocked Confidential Signal';
            } else if (receiverPasskey.trim() !== sentPasskey.trim()) {
              Alert.alert(
                '⚠️ Passkey Mismatch',
                `Broadcast encrypted with key [${sentPasskey}], but Receiver passkey is set to [${receiverPasskey}].`
              );
              setReceivedMessage(`⚠️ Passkey Mismatch!\nSender Key: ${sentPasskey}\nReceiver Key: ${receiverPasskey}`);
              setIsLocked(true);
              isLockedState = true;
              payloadToProcess = '⚠️ Passkey Mismatch Signal';
            } else {
              // Decrypt with Receiver Passkey
              const decryptRes = AcousticCrypto.decrypt(encryptedData, receiverPasskey.trim());
              if (decryptRes.success) {
                setReceivedMessage(decryptRes.plaintext);
                setIsLocked(false);
                payloadToProcess = decryptRes.plaintext;
              } else {
                setReceivedMessage(encryptedData);
                setIsLocked(true);
                isLockedState = true;
                payloadToProcess = encryptedData;
              }
            }
          } else if (AcousticCrypto.isEncrypted(payloadToProcess)) {
            const res = AcousticCrypto.decrypt(payloadToProcess, receiverPasskey.trim());
            if (res.success) {
              setReceivedMessage(res.plaintext);
              setIsLocked(false);
              payloadToProcess = res.plaintext;
            } else {
              setReceivedMessage(payloadToProcess);
              setIsLocked(true);
              isLockedState = true;
            }
          } else {
            setReceivedMessage(payloadToProcess);
            setIsLocked(false);
          }

          // Push to Receiver Area Recent Logs
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setRecentLogs((prev) => [
            {
              id: `${now}-${Math.random().toString(36).substring(2, 5)}`,
              payload: payloadToProcess,
              time: timeStr,
              status: isLockedState ? 'Locked' : 'Decoded',
              snr: rxMetrics.snr,
            },
            ...prev,
          ]);

          // Save to Global History Store
          HistoryStore.addRecord({
            type: 'received',
            payload: isConfidential ? `🔒 [Confidential] ${payloadToProcess}` : payloadToProcess,
            frequencyBand: '17.0 – 20.4 kHz',
            crcHex: rxMetrics.crcHex,
            crcValid: rxMetrics.crcValid,
            ackStatus: 'confirmed',
            snrDb: rxMetrics.snr,
          });
        },
        (status) => {
          setCarrierLocked(status.carrierLocked);
          setSignalLevelDb(status.rmsLevelDb);
        }
      );
      if (!started) {
        setIsScanning(false);
        Alert.alert(
          'Microphone Access',
          'Could not access the microphone. Please grant permission and try again.'
        );
      }
    }
  };

  const processQrPayload = (qrStr: string) => {
    if (!qrStr || !qrStr.trim()) {
      Alert.alert('Invalid QR Code', 'Please paste or scan a valid QR passkey payload.');
      return;
    }
    let extractedKey = qrStr.trim();
    if (extractedKey.includes('|')) {
      const parts = extractedKey.split('|');
      extractedKey = parts[parts.length - 1];
    } else if (extractedKey.startsWith('ECHOWAVE_PASSKEY:')) {
      extractedKey = extractedKey.replace('ECHOWAVE_PASSKEY:', '');
    }

    setReceiverPasskey(extractedKey);
    setIsConfidential(true);
    setShowQrScanner(false);
    setManualQrInput('');

    Alert.alert(
      '✅ QR Passkey Scanned!',
      `Receiver decryption key updated to [${extractedKey}]. Confidential broadcasts will decode automatically.`
    );
  };

  const handleScanQrPasskey = async () => {
    setShowQrScanner(true);
  };

  const handleAutoScanClipboard = async () => {
    try {
      if (Clipboard && Clipboard.getStringAsync) {
        const clip = await Clipboard.getStringAsync();
        if (clip) {
          processQrPayload(clip);
          return;
        }
      }
      Alert.alert('Clipboard Empty', 'No QR passkey string found on clipboard.');
    } catch {
      Alert.alert('Notice', 'Could not read clipboard.');
    }
  };

  const handleUnlockManual = () => {
    let targetData = rawPayload;
    if (targetData.startsWith('CONF:')) {
      const parts = targetData.split(':');
      targetData = parts.slice(2).join(':');
    }

    const res = AcousticCrypto.decrypt(targetData, receiverPasskey.trim());
    if (res.success) {
      setReceivedMessage(res.plaintext);
      setIsLocked(false);
    } else {
      Alert.alert('Decryption Failed', 'Incorrect passkey. The acoustic payload remains encrypted.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { OfdmReceiver.stopListening(); };
  }, []);

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

  const handleResetListener = () => {
    setHasReceived(false);
    setReceivedMessage('');
    setMetrics(null);
    setLateJoinerSynced(false);
    setSyncSource(null);
  };

  // Signal quality label & bar width
  const strength = normalizeSignal(signalLevelDb);
  const signalQualityText = carrierLocked ? 'Excellent' : strength > 0.5 ? 'Good' : 'Searching';
  const signalBarWidth = `${Math.round(strength * 100)}%`;

  // Orb colors: grey idle → green scanning → cyan carrier locked
  const innerColor  = !isScanning ? '#94A3B8' : carrierLocked ? '#00C853' : '#10B981';
  const midColor    = !isScanning ? '#E2E8F0' : carrierLocked ? '#C8E6C9' : '#DCFCE7';
  const outerColor  = !isScanning ? '#F1F5F9' : carrierLocked ? '#E8F5E9' : '#F0FDF4';
  const signalColor = carrierLocked ? '#00C853' : strength > 0.5 ? '#10B981' : '#94A3B8';

  const handleToggleConfidential = () => {
    if (isConfidential) {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm) {
          const confirmed = window.confirm(
            '🛡️ Turn Off Confidential Mode?\n\nDisabling Confidential Mode will expose your acoustic receiver without passkey decryption protection. Are you sure you want to turn off Confidential Mode?'
          );
          if (confirmed) {
            setIsConfidential(false);
            if (isScanning) {
              OfdmReceiver.stopListening();
              setIsScanning(false);
            }
          }
        } else {
          setIsConfidential(false);
        }
      } else {
        Alert.alert(
          '🛡️ Turn Off Confidential Mode?',
          'Disabling Confidential Mode will expose your acoustic receiver without passkey decryption protection. Are you sure you want to turn off Confidential Mode?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Turn Off',
              style: 'destructive',
              onPress: () => {
                setIsConfidential(false);
                if (isScanning) {
                  OfdmReceiver.stopListening();
                  setIsScanning(false);
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
      {/* 🔒 Confidential Mode Toggle Bar */}
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
            ? "Receiver in Confidential Mode. Choose Option A (Type Passkey) or Option B (Scan QR)."
            : "Toggle ON to decode confidential encrypted broadcasts."}
        </Text>

        {isConfidential && (
          <View style={styles.optionsContainer}>
            {/* Option Selector Tabs */}
            <View style={styles.optionsTabRow}>
              <TouchableOpacity
                style={[styles.optionTabBtn, selectedOption === 'type' && styles.optionTabBtnActive]}
                onPress={() => setSelectedOption('type')}
                activeOpacity={0.8}
              >
                <Feather name="edit-3" size={14} color={selectedOption === 'type' ? "#FFFFFF" : "#94A3B8"} />
                <Text style={[styles.optionTabText, selectedOption === 'type' && styles.optionTabTextActive]}>
                  Option A: Type Passkey
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionTabBtn, selectedOption === 'qr' && styles.optionTabBtnActive]}
                onPress={() => setSelectedOption('qr')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={14} color={selectedOption === 'qr' ? "#FFFFFF" : "#94A3B8"} />
                <Text style={[styles.optionTabText, selectedOption === 'qr' && styles.optionTabTextActive]}>
                  Option B: Scan QR
                </Text>
              </TouchableOpacity>
            </View>

            {/* Option A: Type Passkey (Manual Input) */}
            {selectedOption === 'type' && (
              <View style={styles.optionContentBox}>
                <Text style={styles.optionLabel}>Enter Secret Decryption Passkey:</Text>
                <View style={styles.passkeyInputRow}>
                  <Feather name="key" size={16} color="#10B981" />
                  <TextInput
                    style={styles.passkeyInput}
                    value={receiverPasskey}
                    onChangeText={setReceiverPasskey}
                    placeholder="Type secret passkey..."
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* Option B: Scan QR containing Passkey */}
            {selectedOption === 'qr' && (
              <View style={styles.optionContentBox}>
                <Text style={styles.optionLabel}>Scan Sender QR Code to Load Passkey:</Text>
                <TouchableOpacity
                  style={styles.scanQrBtn}
                  onPress={handleScanQrPasskey}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="qrcode" size={18} color="#FFFFFF" />
                  <Text style={styles.scanQrBtnText}>Scan QR containing Passkey</Text>
                </TouchableOpacity>
                <Text style={styles.activeKeyText}>
                  Current Loaded Key: <Text style={styles.activeKeyHighlight}>{receiverPasskey}</Text>
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {hasReceived ? (
        /* ── Decoded Payload View ─────────────────────────────────── */
        <View style={[styles.card, isConfidential && styles.darkCard]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, isConfidential && styles.darkTextSub]}>
              {isLocked ? '🔒 LOCKED / ENCRYPTED ACOUSTIC SIGNAL' : 'DECODED ACOUSTIC PAYLOAD'}
            </Text>
            <Text style={styles.timeTag}>Just now</Text>
          </View>

          {isLocked ? (
            <View style={[styles.messageBox, styles.lockedBox]}>
              <Feather name="lock" size={28} color="#DC2626" style={{ alignSelf: 'center', marginBottom: 8 }} />
              <Text style={styles.lockedTitle}>Encrypted Signal Received</Text>
              <Text style={styles.lockedSub}>
                {receivedMessage}
              </Text>
              <View style={styles.unlockRow}>
                <TextInput
                  style={styles.unlockInput}
                  value={receiverPasskey}
                  onChangeText={setReceiverPasskey}
                  placeholder="Enter passkey..."
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlockManual} activeOpacity={0.8}>
                  <Text style={styles.unlockBtnText}>Unlock 🔓</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.messageBox, isConfidential && styles.darkMessageBox]}>
              <Text style={[styles.messageText, isConfidential && styles.darkTextMain]} selectable>
                {receivedMessage}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, isConfidential && styles.darkTextSub]}>
              CRC-16: <Text style={[styles.metaBold, isConfidential && styles.darkTextMain]}>{metrics?.crcHex || '0x9AF2'}</Text>
            </Text>
            <Text style={[styles.metaText, isConfidential && styles.darkTextSub]}>
              SNR: <Text style={[styles.metaBold, isConfidential && styles.darkTextMain]}>+{metrics?.snr || 24} dB</Text>
            </Text>
            <Text style={[styles.metaText, isConfidential && styles.darkTextSub]}>
              Latency: <Text style={[styles.metaBold, isConfidential && styles.darkTextMain]}>{metrics?.transferTimeMs || 160} ms</Text>
            </Text>
          </View>

          <View style={styles.ackBanner}>
            <View style={styles.ackLeft}>
              <Feather name="check-circle" size={16} color="#059669" />
              <Text style={styles.ackText}>Device Confirmed to Broadcaster</Text>
            </View>
            <Text style={styles.ackSub}>Acoustic ACK sent</Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, isConfidential && styles.darkBtnPrimary]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Feather name={copied ? 'check' : 'copy'} size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, isConfidential && styles.darkBtnSecondary]}
              onPress={handleOpenLink}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={16} color={isConfidential ? "#F8FAFC" : "#0F172A"} />
              <Text style={[styles.btnSecondaryText, isConfidential && styles.darkTextMain]}>Open</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetListener}
            activeOpacity={0.7}
          >
            <Text style={[styles.resetBtnText, isConfidential && styles.darkTextSub]}>
              Clear & Listen for Next Broadcast
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Listening / Idle View ────────────────────────────────── */
        <View style={styles.listeningContainer}>

          {/* ── Animated Orb ──────────────────────────────────────── */}
          <View style={styles.orbWrapper}>
            <Animated.View
              style={[
                styles.outerOrb,
                { backgroundColor: outerColor },
                { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.middleOrb,
                { backgroundColor: midColor },
                { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
              ]}
            />
            <View style={[styles.innerOrb, { backgroundColor: innerColor }]}>
              <MaterialCommunityIcons name="microphone" size={40} color="#FFFFFF" />
            </View>
          </View>

          {/* Status text */}
          <Text style={[styles.listeningTitle, isConfidential && styles.darkTextMain]}>
            {!isScanning
              ? 'Tap to start receiver'
              : carrierLocked
              ? 'Signal Detected!'
              : 'Listening for acoustic sound waves...'}
          </Text>
          <Text style={[styles.listeningSubtitle, isConfidential && styles.darkTextSub]}>
            {!isScanning
              ? 'Press the button below to start listening for sound waves.'
              : 'Keep your device within range of the sender.'}
          </Text>

          {/* ── Start / Stop Button ────────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.scanBtn,
              isConfidential && styles.darkScanBtn,
              isScanning && styles.scanBtnStop,
            ]}
            onPress={handleToggleScan}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isScanning ? 'stop-circle-outline' : 'ear-hearing'}
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.scanBtnText}>
              {isScanning ? 'Stop Receiver' : 'Start Receiver'}
            </Text>
          </TouchableOpacity>

          {/* Signal Strength Card */}
          <View style={[styles.signalCard, isConfidential && styles.darkCard]}>
            <View style={styles.signalCardHeader}>
              <MaterialCommunityIcons name="waveform" size={20} color={signalColor} />
              <Text style={[styles.signalTitle, isConfidential && styles.darkTextMain]}>Signal Strength</Text>
              <Text style={[styles.signalStatusText, { color: signalColor }]}>
                {isScanning ? signalQualityText : '—'}
              </Text>
            </View>
            <View style={styles.signalTrack}>
              <Animated.View
                style={[
                  styles.signalFill,
                  {
                    width: isScanning ? (signalBarWidth as any) : '0%',
                    backgroundColor: signalColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* Info Banner */}
          <View style={[styles.infoBanner, isConfidential && styles.darkInfoBanner]}>
            <View style={styles.infoIconCircle}>
              <Feather name="info" size={16} color="#2563EB" />
            </View>
            <Text style={[styles.infoBannerText, isConfidential && styles.darkTextSub]}>
              Use a quiet environment and keep volume at max on the sender device.
            </Text>
          </View>
        </View>
      )}

      {/* 📋 Receiver Area Recent Logs Section with Clear Button */}
      <View style={[styles.recentLogsCard, isConfidential && styles.darkCard]}>
        <View style={styles.recentLogsHeader}>
          <View style={styles.recentLogsTitleGroup}>
            <MaterialCommunityIcons name="receipt-text-outline" size={18} color={isConfidential ? "#10B981" : "#0066FF"} />
            <Text style={[styles.recentLogsTitle, isConfidential && styles.darkTextMain]}>
              Recent Logs
            </Text>
          </View>
          {recentLogs.length > 0 && (
            <TouchableOpacity
              style={styles.clearRecentBtn}
              onPress={() => setRecentLogs([])}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={13} color="#EF4444" />
              <Text style={styles.clearRecentBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentLogs.length === 0 ? (
          <View style={styles.emptyRecentLogs}>
            <Text style={[styles.emptyRecentText, isConfidential && styles.darkTextSub]}>
              No recent logs recorded. Received acoustic signals will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.recentLogsList}>
            {recentLogs.map((log) => (
              <View key={log.id} style={[styles.recentLogItem, isConfidential && styles.darkLogItem]}>
                <View style={styles.logLeft}>
                  <Text style={[styles.logPayloadText, isConfidential && styles.darkTextMain]} numberOfLines={1}>
                    {log.payload}
                  </Text>
                  <Text style={styles.logTimeText}>{log.time} • SNR +{log.snr} dB</Text>
                </View>
                <View style={[styles.logStatusBadge, log.status === 'Decoded' ? styles.statusDecoded : styles.statusLocked]}>
                  <Text style={log.status === 'Decoded' ? styles.statusDecodedText : styles.statusLockedText}>
                    {log.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 📸 Visual QR Code Scanner Modal */}
      <Modal
        visible={showQrScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowQrScanner(false)}
      >
        <View style={styles.qrScannerContainer}>
          {/* Top Header */}
          <View style={styles.qrScannerHeader}>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setShowQrScanner(false)}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.qrScannerTitle}>Visual QR Key Scanner</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.qrScannerBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.qrInstructionText}>
              Position the Sender device's Passkey QR Code within the viewfinder frame to pair automatically.
            </Text>

            {/* Viewfinder Frame */}
            <View style={styles.viewfinderFrame}>
              {/* Corner Brackets */}
              <View style={[styles.cornerBracket, styles.bracketTL]} />
              <View style={[styles.cornerBracket, styles.bracketTR]} />
              <View style={[styles.cornerBracket, styles.bracketBL]} />
              <View style={[styles.cornerBracket, styles.bracketBR]} />

              {/* Center Camera Icon */}
              <MaterialCommunityIcons name="qrcode-scan" size={64} color="#10B981" />

              {/* Animated Emerald Laser Scan Line */}
              <Animated.View
                style={[
                  styles.laserScanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [10, 190],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>

            <Text style={styles.scanningStatusText}>
              <Feather name="eye" size={14} color="#10B981" /> Active Optical Camera Scan...
            </Text>

            {/* Quick Scanner Action Buttons */}
            <View style={styles.qrActionCard}>
              <TouchableOpacity
                style={styles.qrActionBtnPrimary}
                onPress={handleAutoScanClipboard}
                activeOpacity={0.8}
              >
                <Feather name="clipboard" size={18} color="#FFFFFF" />
                <Text style={styles.qrActionBtnPrimaryText}>Detect QR Payload from Clipboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrActionBtnSecondary}
                onPress={() => {
                  if (receiverPasskey) {
                    processQrPayload(`ECHOWAVE_PASSKEY|${receiverPasskey}`);
                  } else {
                    processQrPayload('ECHOWAVE_PASSKEY|EchoKey99');
                  }
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#10B981" />
                <Text style={styles.qrActionBtnSecondaryText}>Simulate Instant Camera Scan</Text>
              </TouchableOpacity>
            </View>

            {/* Manual QR String Input Fallback */}
            <View style={styles.manualInputCard}>
              <Text style={styles.manualInputLabel}>Or Paste / Type QR Code String:</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualQrTextInput}
                  value={manualQrInput}
                  onChangeText={setManualQrInput}
                  placeholder="Paste QR string (e.g. ECHOWAVE_PASSKEY|Key)"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.applyQrBtn}
                  onPress={() => processQrPayload(manualQrInput)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyQrBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  // ── Orb ──────────────────────────────────────────────────────────
  orbWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  outerOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  middleOrb: {
    position: 'absolute',
    width: 158,
    height: 158,
    borderRadius: 79,
  },
  innerOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(16, 185, 129, 0.35)',
      } as any,
      default: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  listeningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  listeningSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    marginBottom: 28,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 6px rgba(37, 99, 235, 0.25)',
      } as any,
      default: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  darkScanBtn: {
    backgroundColor: '#059669',
  },
  scanBtnStop: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  scanBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Dark mode text helpers
  darkTextMain: {
    color: '#F8FAFC',
  },
  darkTextSub: {
    color: '#94A3B8',
  },
  // ── Confidential Mode Card ──────────────────────────────────────
  confidentialCard: {
    width: '100%',
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
    marginBottom: 12,
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
  optionsContainer: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  optionsTabRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  optionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionTabBtnActive: {
    backgroundColor: '#059669',
  },
  optionTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  optionTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionContentBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
    marginBottom: 8,
  },
  passkeyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  passkeyInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  scanQrBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeKeyText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  activeKeyHighlight: {
    color: '#34D399',
    fontWeight: '700',
  },
  // ── Signal Card ───────────────────────────────────────────────────
  signalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  signalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  signalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  signalStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  signalTrack: {
    width: '100%',
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 5,
  },
  // ── Info Banner ───────────────────────────────────────────────────
  infoBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
    marginBottom: 20,
  },
  darkInfoBanner: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#2563EB',
    lineHeight: 17,
    fontWeight: '500',
  },
  // ── Decoded Card ──────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 20,
  },
  darkCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  timeTag: {
    fontSize: 11,
    color: '#94A3B8',
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  darkMessageBox: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  metaBold: {
    fontWeight: '600',
    color: '#0F172A',
  },
  dynamicGroupBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  dynamicGroupText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  dynamicGroupSub: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '500',
  },
  ackBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  ackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ackText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  ackSub: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#2563EB',
  },
  darkBtnPrimary: {
    backgroundColor: '#059669',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  darkBtnSecondary: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  lockedBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    padding: 18,
    alignItems: 'center',
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
    textAlign: 'center',
  },
  lockedSub: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  pairNowBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unlockRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  unlockInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  unlockBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recentLogsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  recentLogsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentLogsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentLogsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearRecentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  clearRecentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyRecentLogs: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: 13,
    color: '#64748B',
  },
  recentLogsList: {
    gap: 8,
  },
  recentLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  darkLogItem: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  logLeft: {
    flex: 1,
    marginRight: 10,
  },
  logPayloadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  logTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDecoded: {
    backgroundColor: '#D1FAE5',
  },
  statusDecodedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusLocked: {
    backgroundColor: '#FEE2E2',
  },
  statusLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  // ── QR Scanner Modal Styles ──────────────────────────────────
  qrScannerContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  qrScannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  qrCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  qrScannerBody: {
    padding: 24,
    alignItems: 'center',
  },
  qrInstructionText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  viewfinderFrame: {
    width: 230,
    height: 230,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10B981',
  },
  bracketTL: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  bracketTR: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bracketBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bracketBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  laserScanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: '#10B981',
    borderRadius: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 8px #10B981',
      } as any,
      default: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
      },
    }),
  },
  scanningStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 24,
  },
  qrActionCard: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  qrActionBtnPrimary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrActionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qrActionBtnSecondary: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrActionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  manualInputCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  manualInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualQrTextInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
  },
  applyQrBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyQrBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#090D16',
  },
  partialCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    marginBottom: 16,
  },
  partialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  partialTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.5,
    flex: 1,
  },
  partialStatusText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 12,
  },
  partialTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    overflow: 'hidden',
    marginBottom: 12,
  },
  partialFill: {
    height: '100%',
    borderRadius: 4,
  },
  nackStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
  },
  nackStatusText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
