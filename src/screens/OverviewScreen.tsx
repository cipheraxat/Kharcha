import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { Platform } from '../types';
import { fetchAllOrders, computeDashboardStats } from '../services/analyticsService';
import { generateNudge } from '../services/nudgeService';
import { isGmailUnauthorizedError } from '../services/gmail';
import { OverviewSkeleton } from '../components/SkeletonLoader';
import { PlatformLogo } from '../components/PlatformLogo';
import { formatCurrency } from '../utils/format';
import { showDetail } from '../utils/showDetail';
import { openAIInsight } from '../utils/openAIInsight';

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
    gmailAccounts,
    stats,
    nudge,
    isSyncing,
    setOrders,
    setStats,
    setNudge,
    setIsLoadingData,
    isLoadingData,
    updateAccountToken,
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
    const activeAccounts = gmailAccounts.filter((a) => a.accessToken && a.assignedPlatforms.length > 0);
    if (activeAccounts.length === 0 || !session?.user?.id) {
      navigation.navigate('Sync' as never);
      return;
    }
    const primaryAccount = gmailAccounts.find((a) => a.isPrimary);
    if (primaryAccount?.email && session.user.email !== primaryAccount.email) {
      navigation.navigate('Sync' as never);
      return;
    }
    setRefreshing(true);
    try {
      const { syncOrders } = await import('../services/syncService');
      const result = await syncOrders(activeAccounts, session.user.id, undefined, {
        onAccountTokenRefresh: updateAccountToken,
      });
      const expiredAccounts = [...new Set(result.expiredAccounts)];
      if (expiredAccounts.length > 0) {
        Alert.alert(
          'Gmail needs reconnecting',
          `Please reconnect ${expiredAccounts.join(', ')} from Profile, then sync again.`
        );
      }
      // Use returned stats directly to avoid stale closure on `stats`
      const freshStats = await loadData();
      if (freshStats) {
        const n = await generateNudge(freshStats);
        setNudge(n);
      }
    } catch (e) {
      if (isGmailUnauthorizedError(e)) {
        console.warn('[OverviewScreen] Gmail auth expired during refresh:', e);
        Alert.alert('Gmail needs reconnecting', 'Please reconnect the affected Gmail account from Profile, then sync again.');
      } else {
        console.warn('[OverviewScreen] Refresh failed:', e);
      }
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
            <TouchableOpacity
              style={styles.mainCard}
              activeOpacity={0.82}
              onPress={() => openAIInsight({
                insightType: 'monthly_pulse',
                title: 'Monthly Pulse',
                accent: `${stats.ordersThisMonth} orders this month`,
                color: COLORS.accent,
                icon: '📊',
                context: {
                  total_spend_this_month_inr: Math.round(stats.totalSpendThisMonth),
                  total_spend_last_month_inr: Math.round(stats.totalSpendLastMonth),
                  orders_this_month: stats.ordersThisMonth,
                  avg_order_value_inr: Math.round(stats.avgOrderValue),
                  total_savings_inr: Math.round(stats.totalSavings),
                  total_delivery_fees_inr: Math.round(stats.totalDeliveryFees),
                  platforms_active: stats.spendByPlatform.length,
                },
                rows: [
                  { label: 'Spent this month', value: formatCurrency(stats.totalSpendThisMonth) },
                  { label: 'Spent last month', value: formatCurrency(stats.totalSpendLastMonth) },
                  { label: 'Orders this month', value: stats.ordersThisMonth },
                  { label: 'Average order', value: formatCurrency(stats.avgOrderValue) },
                ],
              })}
            >
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
            </TouchableOpacity>

            {/* Quick stats row */}
            <View style={styles.statsRow}>
              <StatCard
                label="Orders"
                value={String(stats.ordersThisMonth)}
                icon="bag-outline"
                color={COLORS.accent}
                details={[
                  ['Orders this month', stats.ordersThisMonth],
                  ['Tracked across', `${stats.spendByPlatform.length} platforms`],
                ]}
              />
              <StatCard
                label="Avg order"
                value={formatCurrency(stats.avgOrderValue)}
                icon="receipt-outline"
                color={COLORS.warning}
                details={[
                  ['Average order value', formatCurrency(stats.avgOrderValue)],
                  ['This month orders', stats.ordersThisMonth],
                ]}
              />
              <StatCard
                label="Saved"
                value={formatCurrency(stats.totalSavings)}
                icon="pricetag-outline"
                color={COLORS.success}
                details={[
                  ['Total saved', formatCurrency(stats.totalSavings)],
                  ['Delivery fees paid', formatCurrency(stats.totalDeliveryFees)],
                ]}
              />
            </View>

            {/* AI Nudge card */}
            {nudge && (
              <TouchableOpacity
                style={styles.nudgeCard}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'ai_nudge',
                  title: 'Today’s AI Nudge',
                  accent: 'Personalised for you',
                  color: COLORS.accentLight,
                  icon: '🤖',
                  context: {
                    current_nudge: nudge.message,
                    total_spend_this_month_inr: Math.round(stats.totalSpendThisMonth),
                    orders_this_month: stats.ordersThisMonth,
                    top_platform: stats.topPlatform,
                  },
                  rows: [
                    { label: 'Nudge', value: nudge.message },
                    { label: 'Generated on', value: nudge.generated_at },
                  ],
                })}
              >
                <View style={styles.nudgeHeader}>
                  <Text style={styles.nudgeIcon}>🤖</Text>
                  <Text style={styles.nudgeTitle}>AI Insight</Text>
                </View>
                <Text style={styles.nudgeText}>{nudge.message}</Text>
              </TouchableOpacity>
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
                  <TouchableOpacity
                    key={i}
                    style={styles.vendorRow}
                    activeOpacity={0.82}
                    onPress={() => openAIInsight({
                      insightType: 'top_vendor',
                      title: v.name,
                      accent: `Rank #${i + 1} · ${PLATFORM_CONFIG[v.platform as keyof typeof PLATFORM_CONFIG]?.label ?? v.platform}`,
                      color: PLATFORM_CONFIG[v.platform as keyof typeof PLATFORM_CONFIG]?.color ?? COLORS.accent,
                      icon: '🏆',
                      context: {
                        vendor_name: v.name,
                        rank: i + 1,
                        platform: v.platform,
                        total_spend_inr: Math.round(v.total),
                        order_count: v.order_count,
                        avg_order_inr: v.order_count > 0 ? Math.round(v.total / v.order_count) : 0,
                      },
                      rows: [
                        { label: 'Rank', value: `#${i + 1}` },
                        { label: 'Platform', value: PLATFORM_CONFIG[v.platform as keyof typeof PLATFORM_CONFIG]?.label ?? v.platform },
                        { label: 'Total spend', value: formatCurrency(v.total) },
                        { label: 'Orders', value: v.order_count },
                      ],
                    })}
                  >
                    <View style={styles.vendorRank}>
                      <Text style={styles.vendorRankText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.vendorName} numberOfLines={1}>
                      {v.name}
                    </Text>
                    <Text style={styles.vendorAmount}>
                      {formatCurrency(v.total)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color, details }: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  details: [string, string | number][];
}) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      activeOpacity={0.82}
      onPress={() => openAIInsight({
        insightType: `quick_stat_${label.toLowerCase().replace(/\s+/g, '_')}`,
        title: label,
        accent: value,
        color,
        icon: '✨',
        context: Object.fromEntries(details.map(([k, v]) => [k, v])),
        rows: details.map(([l, v]) => ({ label: l, value: v })),
      })}
    >
      <View style={[styles.statIconWrap, { backgroundColor: `${color}22` }]}> 
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
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
    <TouchableOpacity
      style={styles.platformCard}
      activeOpacity={0.82}
      onPress={() => openAIInsight({
        insightType: 'top_platform',
        title: cfg.label,
        accent: `${pct}% of your total spend`,
        color: cfg.color,
        icon: cfg.emoji,
        context: {
          platform: platform,
          share_of_total_pct: pct,
          total_spend_inr: Math.round(spend?.total ?? 0),
          order_count: spend?.order_count ?? 0,
          avg_order_inr: spend && spend.order_count > 0 ? Math.round(spend.total / spend.order_count) : 0,
        },
        rows: [
          { label: 'Share of total spend', value: `${pct}%` },
          { label: 'Total spend', value: formatCurrency(spend?.total ?? 0) },
          { label: 'Orders', value: spend?.order_count ?? 0 },
        ],
      })}
    > 
      <PlatformLogo platform={platform as Platform} size="regular" />
      <View style={{ flex: 1 }}>
        <Text style={styles.platformLabel}>{cfg.label}</Text>
        <Text style={styles.platformPct}>{pct}% of your total spend</Text>
      </View>
      <Text style={[styles.platformAmount, { color: cfg.color }]}>
        ₹{Math.round(spend?.total ?? 0).toLocaleString('en-IN')}
      </Text>
    </TouchableOpacity>
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
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 14, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary, marginTop: 4, maxWidth: 230, lineHeight: 20 },
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
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  kpiEyebrow: {
    color: COLORS.accentGold,
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 13,
    fontFamily: FONTS.dataMono,
    color: COLORS.textSecondary,
  },
  kpiValue: {
    fontSize: 48,
    fontFamily: FONTS.displayLg,
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
  chipText: { fontSize: 12, fontFamily: FONTS.dataMono },
  kpiFooterRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  kpiFooterLabel: { fontSize: 12, fontFamily: FONTS.bodyMain, color: COLORS.textMuted, marginBottom: 4 },
  kpiFooterValue: { fontSize: 14, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  kpiFooterCaption: { fontSize: 11, fontFamily: FONTS.bodyMain, color: COLORS.textDim, maxWidth: 110, textAlign: 'right' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
  },
  statLabel: { fontSize: 11, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary, marginTop: 3, lineHeight: 15 },
  nudgeCard: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  nudgeIcon: { fontSize: 16 },
  nudgeTitle: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.accentLight,
    letterSpacing: 0.8,
  },
  nudgeText: {
    fontSize: 14,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vendorRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.cardStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorRankText: { fontSize: 13, fontFamily: FONTS.dataMono, color: COLORS.textMuted },
  vendorName: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  vendorAmount: { fontSize: 14, fontFamily: FONTS.dataMono, color: COLORS.textPrimary },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformEmoji: { fontSize: 24 },
  platformLabel: { fontSize: 15, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  platformPct: { fontSize: 12, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary, marginTop: 2 },
  platformAmount: { fontSize: 18, fontFamily: FONTS.dataMono },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: FONTS.bodyMain,
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
  emptyBtnText: { fontSize: 15, fontFamily: FONTS.bodyStrong, color: '#fff' },
});
