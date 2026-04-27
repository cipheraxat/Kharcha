import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { fetchAllOrders, computeDashboardStats } from '../services/analyticsService';
import { generateNudge } from '../services/nudgeService';
import { OverviewSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../utils/format';

function SpendChangeChip({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  if (lastMonth === 0) return null;
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const isUp = pct > 0;
  return (
    <View style={[styles.chip, { backgroundColor: isUp ? '#2D1B1B' : '#1B2D1B' }]}>
      <Ionicons
        name={isUp ? 'trending-up' : 'trending-down'}
        size={12}
        color={isUp ? COLORS.danger : COLORS.success}
      />
      <Text style={[styles.chipText, { color: isUp ? COLORS.danger : COLORS.success }]}>
        {Math.abs(pct)}% vs last month
      </Text>
    </View>
  );
}

export default function OverviewScreen() {
  const navigation = useNavigation();
  const {
    session,
    googleAccessToken,
    stats,
    nudge,
    isSyncing,
    setOrders,
    setStats,
    setNudge,
    setIsLoadingData,
    isLoadingData,
  } = useStore();

  const [refreshing, setRefreshing] = React.useState(false);

  // Load data on mount if not loaded yet
  useEffect(() => {
    if (!stats && session?.user?.id) {
      loadData();
    }
  }, [session]);

  const loadData = async (): Promise<ReturnType<typeof computeDashboardStats> | null> => {
    const userId = session?.user?.id;
    if (!userId) return null;
    setIsLoadingData(true);
    try {
      const orders = await fetchAllOrders(userId);
      setOrders(orders);
      const s = computeDashboardStats(orders);
      setStats(s);
      if (!nudge) {
        const n = await generateNudge(s);
        setNudge(n);
      }
      return s;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setIsLoadingData(false);
    }
  };

  const onRefresh = async () => {
    if (!googleAccessToken || !session?.user?.id) {
      navigation.navigate('Sync' as never);
      return;
    }
    setRefreshing(true);
    try {
      const { syncOrders } = await import('../services/syncService');
      await syncOrders(googleAccessToken, session.user.id);
      // Use returned stats directly to avoid stale closure on `stats`
      const freshStats = await loadData();
      if (freshStats) {
        const n = await generateNudge(freshStats);
        setNudge(n);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Empty only when there is genuinely no data across all time — not just this month
  const isEmpty = !stats || stats.spendByPlatform.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.heroGlow} />
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey there</Text>
            <Text style={styles.subtitle}>Your spending dashboard is reading the room.</Text>
          </View>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={() => navigation.navigate('Sync' as never)}
          >
            <Ionicons name="sync-outline" size={18} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {isLoadingData ? (
          <OverviewSkeleton />
        ) : isEmpty ? (
          <EmptyState onSync={() => navigation.navigate('Sync' as never)} />
        ) : (
          <>
            {/* Main KPI card */}
            <View style={styles.mainCard}>
              <Text style={styles.kpiEyebrow}>MONTHLY PULSE</Text>
              <Text style={styles.kpiLabel}>Spent this month</Text>
              <Text style={styles.kpiValue}>
                {formatCurrency(stats.totalSpendThisMonth)}
              </Text>
              <SpendChangeChip
                thisMonth={stats.totalSpendThisMonth}
                lastMonth={stats.totalSpendLastMonth}
              />
              <View style={styles.kpiFooterRow}>
                <View>
                  <Text style={styles.kpiFooterLabel}>This month</Text>
                  <Text style={styles.kpiFooterValue}>{stats.ordersThisMonth} orders tracked</Text>
                </View>
                <Text style={styles.kpiFooterCaption}>Updated from Gmail receipts</Text>
              </View>
            </View>

            {/* Quick stats row */}
            <View style={styles.statsRow}>
              <StatCard
                label="Orders"
                value={String(stats.ordersThisMonth)}
                icon="bag-outline"
                color={COLORS.accent}
              />
              <StatCard
                label="Avg order"
                value={formatCurrency(stats.avgOrderValue)}
                icon="receipt-outline"
                color={COLORS.warning}
              />
              <StatCard
                label="Saved"
                value={formatCurrency(stats.totalSavings)}
                icon="pricetag-outline"
                color={COLORS.success}
              />
            </View>

            {/* AI Nudge card */}
            {nudge && (
              <View style={styles.nudgeCard}>
                <View style={styles.nudgeHeader}>
                  <Text style={styles.nudgeIcon}>🤖</Text>
                  <Text style={styles.nudgeTitle}>AI Insight</Text>
                </View>
                <Text style={styles.nudgeText}>{nudge.message}</Text>
              </View>
            )}

            {/* Top platform */}
            {stats.topPlatform && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top platform this month</Text>
                <TopPlatformCard
                  platform={stats.topPlatform}
                  spendByPlatform={stats.spendByPlatform}
                />
              </View>
            )}

            {/* Top vendors */}
            {stats.topVendors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your favourites</Text>
                {stats.topVendors.slice(0, 3).map((v, i) => (
                  <View key={i} style={styles.vendorRow}>
                    <View style={styles.vendorRank}>
                      <Text style={styles.vendorRankText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.vendorName} numberOfLines={1}>
                      {v.name}
                    </Text>
                    <Text style={styles.vendorAmount}>
                      {formatCurrency(v.total)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}22` }]}> 
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TopPlatformCard({ platform, spendByPlatform }: {
  platform: string;
  spendByPlatform: any[];
}) {
  const cfg = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
  const spend = spendByPlatform.find((p) => p.platform === platform);
  const total = spendByPlatform.reduce((a, p) => a + p.total, 0);
  const pct = total > 0 ? Math.round((spend?.total ?? 0) / total * 100) : 0;

  return (
    <View style={styles.platformCard}> 
      <Text style={styles.platformEmoji}>{cfg.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.platformLabel}>{cfg.label}</Text>
        <Text style={styles.platformPct}>{pct}% of your total spend</Text>
      </View>
      <Text style={[styles.platformAmount, { color: cfg.color }]}>
        ₹{Math.round(spend?.total ?? 0).toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

function EmptyState({ onSync }: { onSync: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>📬</Text>
      <Text style={styles.emptyTitle}>No data yet</Text>
      <Text style={styles.emptyDesc}>
        Sync your Gmail to pull in order history from Swiggy, Zomato, Blinkit and more.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onSync}>
        <Ionicons name="sync-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.emptyBtnText}>Start Syncing</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  heroGlow: {
    position: 'absolute',
    top: -10,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124, 92, 255, 0.12)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, maxWidth: 230, lineHeight: 20 },
  syncBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainCard: {
    backgroundColor: COLORS.cardStrong,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 16,
  },
  kpiEyebrow: {
    color: COLORS.accentGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1.5,
    marginTop: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  kpiFooterRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  kpiFooterLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  kpiFooterValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  kpiFooterCaption: { fontSize: 11, color: COLORS.textDim, maxWidth: 110, textAlign: 'right' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, lineHeight: 15 },
  nudgeCard: {
    backgroundColor: '#161B31',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#2D2F50',
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  nudgeIcon: { fontSize: 16 },
  nudgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nudgeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vendorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorRankText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  vendorName: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  vendorAmount: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformEmoji: { fontSize: 24 },
  platformLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  platformPct: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  platformAmount: { fontSize: 18, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
