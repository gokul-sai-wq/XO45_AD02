import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  initialName?: string;
  onComplete: (userName: string) => void;
}

const SLIDES = [
  {
    id: '1',
    title: 'One-to-Many\nCommunication',
    subtitle: 'Send messages to multiple nearby devices using sound — no internet, no Bluetooth, no Wi-Fi.',
    icon: 'cellphone-wireless',
  },
  {
    id: '2',
    title: 'Near-Ultrasonic\nAcoustic Air-Gap',
    subtitle: 'Modulates data into silent 17.0–19.8 kHz acoustic soundwaves imperceptible to human adult ears.',
    icon: 'sine-wave',
  },
  {
    id: '3',
    title: 'Instant Acoustic\nVerification ACK',
    subtitle: 'Receiving devices automatically emit a quiet acoustic ACK chirp to confirm receipt to the broadcaster.',
    icon: 'check-decagram',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  initialName = '',
  onComplete,
}) => {
  const [step, setStep] = useState<'name' | 'info'>('name');
  const [userName, setUserName] = useState<string>(initialName);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Automatically reset to Name Box input step whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      setStep('name');
      setUserName(initialName || '');
      setCurrentSlideIndex(0);
    }
  }, [visible, initialName]);

  const handleNextFromName = () => {
    if (!userName.trim()) return;
    onComplete(userName.trim());
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < SLIDES.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      onComplete(userName.trim() || 'User');
    }
  };

  const currentSlide = SLIDES[currentSlideIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        {step === 'name' ? (
          /* ── STEP 1: ASK FOR NAME ───────────────────────────────── */
          <View style={styles.nameStepContainer}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="waveform" size={28} color={Theme.colors.primary} />
            </View>

            <Text style={styles.welcomeTag}>WELCOME TO ECHOWAVE</Text>
            <Text style={styles.nameTitle}>What is your name?</Text>
            <Text style={styles.nameSubtitle}>
              Your name will be used to identify your acoustic broadcasting station to nearby receiving devices.
            </Text>

            {/* Avatar Preview */}
            <View style={styles.avatarPreviewBox}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {userName.trim() ? userName.trim().charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <Text style={styles.stationLabel}>
                {userName.trim() ? `${userName.trim()}'s Station` : 'Your Acoustic Station'}
              </Text>
            </View>

            {/* Input Box */}
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name..."
                placeholderTextColor="#94A3B8"
                value={userName}
                onChangeText={setUserName}
                autoFocus
                maxLength={24}
                returnKeyType="next"
                onSubmitEditing={handleNextFromName}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.continueBtn,
                !userName.trim() && styles.disabledBtn,
              ]}
              onPress={handleNextFromName}
              disabled={!userName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Start Station Session</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── STEP 2: INFORMATION BOX (Matching user's attached design) ────────── */
          <View style={styles.infoStepContainer}>

            {/* Graphic Illustration Header */}
            <View style={styles.illustrationArea}>
              <View style={styles.centralMeshWrapper}>
                {/* Surrounding phone nodes */}
                <View style={[styles.phoneNode, styles.nodeTopRight]}>
                  <Feather name="smartphone" size={16} color="#2563EB" />
                </View>
                <View style={[styles.phoneNode, styles.nodeRight]}>
                  <Feather name="smartphone" size={16} color="#2563EB" />
                </View>
                <View style={[styles.phoneNode, styles.nodeBottomRight]}>
                  <Feather name="smartphone" size={16} color="#2563EB" />
                </View>
                <View style={[styles.phoneNode, styles.nodeBottomLeft]}>
                  <Feather name="smartphone" size={16} color="#2563EB" />
                </View>
                <View style={[styles.phoneNode, styles.nodeLeft]}>
                  <Feather name="smartphone" size={16} color="#2563EB" />
                </View>
                <View style={[styles.phoneNode, styles.nodeTopLeft]}>
                  <Feather name="smartphone" size={16} color="#2563EB" />
                </View>

                {/* Central main phone */}
                <View style={styles.centralPhoneCard}>
                  <MaterialCommunityIcons name="waveform" size={26} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Text Content */}
            <View style={styles.textContentArea}>
              <Text style={styles.infoTitle}>{currentSlide.title}</Text>
              <Text style={styles.infoSubtitle}>{currentSlide.subtitle}</Text>
            </View>

            {/* Bottom Controls: Dots & Blue Arrow Button */}
            <View style={styles.bottomBar}>
              {/* Pagination Dots */}
              <View style={styles.dotsRow}>
                {SLIDES.map((slide, idx) => (
                  <View
                    key={slide.id}
                    style={[
                      styles.dot,
                      idx === currentSlideIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>

              {/* Blue Circular Arrow Button */}
              <TouchableOpacity
                style={styles.nextCircleBtn}
                onPress={handleNextSlide}
                activeOpacity={0.85}
              >
                <Feather name="arrow-right" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── STEP 1: NAME INPUT ─────────────────────────────────────────────
  nameStepContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  nameTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  nameSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  avatarPreviewBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
  },
  micPermBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  micPermPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  micPermGranted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  micPermText: {
    fontSize: 12,
    fontWeight: '600',
  },
  micPermTextPending: {
    color: '#2563EB',
  },
  micPermTextGranted: {
    color: '#047857',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  continueBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── STEP 2: INFORMATION SLIDES (Matches attached image) ────────────
  infoStepContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  illustrationArea: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  centralMeshWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centralPhoneCard: {
    width: 80,
    height: 140,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1D4ED8',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  phoneNode: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTopRight: { top: 10, right: 20 },
  nodeRight: { top: 100, right: 0 },
  nodeBottomRight: { bottom: 10, right: 20 },
  nodeBottomLeft: { bottom: 10, left: 20 },
  nodeLeft: { top: 100, left: 0 },
  nodeTopLeft: { top: 10, left: 20 },

  textContentArea: {
    paddingVertical: 10,
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  infoSubtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '400',
  },

  // ── Bottom Bar with Dots & Circle Button ────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 20,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  nextCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
});
