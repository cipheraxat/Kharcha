import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants';
import { useStore } from '../store';
import { syncOrders } from '../services/syncService';
import { fetchAllOrders, computeDashboardStats } from '../services/analyticsService';
import { generateNudge } from '../services/nudgeService';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function SyncScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    session,
    googleAccessToken,
    setIsSyncing,
    setSyncProgress,
    setLastSyncedAt,
    setOrders,
    setStats,
    setNudge,
    setIsLoadingData,
  } = useStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [statusText, setStatusText] = useState('Reading your order emails...');
  const [progress, setProgress] = useState<{ total: number; processed: number } | null>(null);

  // Pulse animation for the emoji
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    runSync();
  }, []);

  const runSync = async () => {
    const userId = session?.user?.id;
    if (!userId || !googleAccessToken) {
      Alert.alert('Error', 'Not signed in');
      navigation.goBack();
      return;
    }

    setIsSyncing(true);

    try {
      setStatusText('Scanning your Gmail inbox...');

      await syncOrders(googleAccessToken, userId, (p) => {
        setSyncProgress({ total: p.total, processed: p.processed });
        setProgress({ total: p.total, processed: p.processed });
        if (p.done) {
          setStatusText(`Found ${p.inserted} new orders!`);
        } else if (p.total > 0) {
          setStatusText(`Processing ${p.processed} of ${p.total} emails...`);
        }
      });

      setStatusText('Crunching the numbers...');
      setIsLoadingData(true);

      const orders = await fetchAllOrders(userId);
      setOrders(orders);

      const stats = computeDashboardStats(orders);
      setStats(stats);

      setStatusText('Getting your AI insight...');
      const nudge = await generateNudge(stats);
      setNudge(nudge);

      setLastSyncedAt(new Date().toISOString());
      setStatusText('All done! ✨');
    } catch (err: any) {
      console.error('[SyncScreen]', err);
      setStatusText('Sync completed (some emails may have been skipped)');
    } finally {
      setIsSyncing(false);
      setIsLoadingData(false);

      setTimeout(() => {
        navigation.navigate('Main');
      }, 800);
    }
  };

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topOrb} />
      <View style={styles.bottomOrb} />
      <View style={styles.content}>
        <View style={styles.shell}>
          <Animated.Text
            style={[styles.emoji, { transform: [{ scale: pulseAnim }] }]}
          >
            📬
          </Animated.Text>

          <Text style={styles.kicker}>SYNC IN PROGRESS</Text>
          <Text style={styles.title}>Building your order archive</Text>
          <Text style={styles.status}>{statusText}</Text>

          {percent !== null && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressFootnote}>Receipt scan progress</Text>
                <Text style={styles.progressLabel}>{percent}%</Text>
              </View>
            </View>
          )}

          <Text style={styles.note}>
            First sync takes longer because every matching Gmail receipt is inspected once.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topOrb: {
    position: 'absolute',
    top: 70,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(124, 92, 255, 0.14)',
  },
  bottomOrb: {
    position: 'absolute',
    bottom: 80,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(79, 209, 168, 0.10)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  shell: {
    width: '100%',
    backgroundColor: COLORS.cardStrong,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
  },
  emoji: { fontSize: 66, marginBottom: 18 },
  kicker: {
    color: COLORS.accentGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  status: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 23,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accentWarm,
    borderRadius: 999,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressFootnote: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  note: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
});
