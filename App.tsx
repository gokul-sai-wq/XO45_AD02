import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Theme } from './src/theme';
import { Header } from './src/components/Header';
import { SenderScreen } from './src/screens/SenderScreen';
import { ReceiverScreen } from './src/screens/ReceiverScreen';

export default function App() {
  const [mode, setMode] = useState<'broadcast' | 'receive'>('broadcast');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <View style={styles.container}>
        {/* Simple Header with Send / Receive */}
        <Header mode={mode} onModeChange={setMode} />

        {/* Focused Screen Body */}
        <View style={styles.body}>
          {mode === 'broadcast' ? <SenderScreen /> : <ReceiverScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: Theme.colors.bg,
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: Theme.colors.border,
  },
  body: {
    flex: 1,
  },
});
