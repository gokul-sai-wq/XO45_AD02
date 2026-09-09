import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Theme } from './src/theme';
import { Header } from './src/components/Header';
import { FloatingNavBar, TabKey } from './src/components/FloatingNavBar';
import { SenderScreen } from './src/screens/SenderScreen';
import { ReceiverScreen } from './src/screens/ReceiverScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

const TABS: TabKey[] = ['send', 'receive', 'history'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('send');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();

  // Width of each page: on web constrained to max 480px, on mobile full width
  const pageWidth =
    containerWidth || (Platform.OS === 'web' ? Math.min(480, windowWidth) : windowWidth);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const index = TABS.indexOf(tab);
    if (index !== -1 && scrollRef.current && pageWidth > 0) {
      scrollRef.current.scrollTo({
        x: index * pageWidth,
        animated: true,
      });
    }
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    if (pageWidth > 0) {
      const pageIndex = Math.round(offsetX / pageWidth);
      const targetTab = TABS[Math.max(0, Math.min(TABS.length - 1, pageIndex))];
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <View
        style={styles.container}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== containerWidth) {
            setContainerWidth(w);
          }
        }}
      >
        {/* Modern Clean Top Header */}
        <Header stationName="Station 01" />

        {/* Horizontal Swipeable Pager for Send, Receive, History */}
        <View style={styles.pagerWrapper}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            style={styles.scrollView}
          >
            <View style={{ width: pageWidth, flex: 1 }}>
              <SenderScreen />
            </View>
            <View style={{ width: pageWidth, flex: 1 }}>
              <ReceiverScreen />
            </View>
            <View style={{ width: pageWidth, flex: 1 }}>
              <HistoryScreen />
            </View>
          </ScrollView>
        </View>

        {/* Floating Bottom Pill Navbar */}
        <FloatingNavBar activeTab={activeTab} onTabChange={handleTabChange} />
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
    position: 'relative',
  },
  pagerWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
