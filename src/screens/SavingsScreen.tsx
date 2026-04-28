import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { Platform } from '../types';
import { SavingsSkeleton } from '../components/SkeletonLoader';
import { PlatformLogo } from '../components/PlatformLogo';
import { formatCurrency } from '../utils/format';
import { showDetail } from '../utils/showDetail';
import { openAIInsight } from '../utils/openAIInsight';

export default function SavingsScreen() {
  const navigation = useNavigation();
  const stats = useStore((s) => s.stats);
  const isLoadingData = useStore((s) => s.isLoadingData);

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <SavingsSkeleton />
      </SafeAreaView>
    );
  }

  if (!stats || stats.spendByPlatform.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💰</Text>
          <Text style={styles.emptyTitle}>No savings data yet</Text>
          <Text style={styles.emptyText}>
            Sync your Gmail to track discounts and delivery fees across all platforms.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Sync' as never)}>
            <Ionicons name="sync-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.emptyBtnText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalSpend = stats.spendByPlatform.reduce((a, p) => a + p.total, 0);
  const savingsRate =
    totalSpend + stats.totalSavings > 0
      ? Math.round((stats.totalSavings / (totalSpend + stats.totalSavings)) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Savings</Text>

        {/* Total savings hero */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.82}
          onPress={() => openAIInsight({
            insightType: 'savings_summary',
            title: 'Savings Summary',
            accent: `${savingsRate}% savings rate`,
            color: COLORS.success,
            icon: '🎉',
            context: {
              total_savings_inr: Math.round(stats.totalSavings),
              savings_rate_pct: savingsRate,
              total_spend_inr: Math.round(totalSpend),
              total_delivery_fees_inr: Math.round(stats.totalDeliveryFees),
            },
            rows: [
              { label: 'Total saved on discounts', value: formatCurrency(stats.totalSavings) },
              { label: 'Savings rate', value: `${savingsRate}%` },
              { label: 'Total spend', value: formatCurrency(totalSpend) },
              { label: 'Delivery fees paid', value: formatCurrency(stats.totalDeliveryFees) },
            ],
          })}
        >
          <Text style={styles.heroEmoji}>🎉</Text>
          <Text style={styles.heroLabel}>Total saved on discounts</Text>
          <Text style={styles.heroValue}>{formatCurrency(stats.totalSavings)}</Text>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>{savingsRate}% savings rate</Text>
          </View>
        </TouchableOpacity>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <SavingsTile
            icon="car-outline"
            color={COLORS.danger}
            label="Delivery fees paid"
            value={formatCurrency(stats.totalDeliveryFees)}
            note="Across all orders"
            details={[
              ['Delivery fees paid', formatCurrency(stats.totalDeliveryFees)],
              ['Orders included', stats.ordersThisMonth],
            ]}
          />
          <SavingsTile
            icon="pricetag-outline"
            color={COLORS.success}
            label="Discounts captured"
            value={formatCurrency(stats.totalSavings)}
            note="From all platforms"
            details={[
              ['Discounts captured', formatCurrency(stats.totalSavings)],
              ['Savings rate', `${savingsRate}%`],
            ]}
          />
        </View>

        {/* Breakdown by platform */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings by platform</Text>
          {stats.spendByPlatform.map((p, i) => {
            const cfg = PLATFORM_CONFIG[p.platform as Platform];
            // We don't have per-platform savings separately in current data
            // Show delivery fee indicator
            return (
              <TouchableOpacity
                key={i}
                style={styles.platformRow}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'savings_by_platform',
                  title: `${cfg.label} · Savings`,
                  accent: `${p.order_count} orders · ${formatCurrency(p.total)}`,
                  color: cfg.color,
                  icon: cfg.emoji,
                  context: {
                    platform: p.platform,
                    order_count: p.order_count,
                    total_spend_inr: Math.round(p.total),
                    avg_order_inr: p.order_count > 0 ? Math.round(p.total / p.order_count) : 0,
                  },
                  rows: [
                    { label: 'Orders', value: p.order_count },
                    { label: 'Total spend', value: formatCurrency(p.total) },
                    { label: 'Average order', value: formatCurrency(p.total / p.order_count) },
                  ],
                })}
              >
                <PlatformLogo platform={p.platform} size="small" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>{cfg.label}</Text>
                  <Text style={styles.platformMeta}>
                    {p.order_count} orders · {formatCurrency(p.total)} spent
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Money-saving tips</Text>
          {TIPS.map((tip, i) => (
            <TouchableOpacity
              key={i}
              style={styles.tipRow}
              activeOpacity={0.82}
              onPress={() => showDetail('Money-saving Tip', [tip.text])}
            >
              <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SavingsTile({ icon, color, label, value, note, details }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  note: string;
  details: [string, string | number][];
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, { borderTopColor: color }]}
      activeOpacity={0.82}
      onPress={() => openAIInsight({
        insightType: `savings_tile_${label.toLowerCase().replace(/\s+/g, '_')}`,
        title: label,
        accent: value,
        color,
        icon: '✨',
        context: Object.fromEntries(details.map(([k, v]) => [k, v])),
        rows: details.map(([l, v]) => ({ label: l, value: v })),
      })}
    > 
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 8 }} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileNote}>{note}</Text>
    </TouchableOpacity>
  );
}

const TIPS = [
  { emoji: '🕐', text: 'Order during off-peak hours (2-5pm) to avoid surge pricing' },
  { emoji: '📦', text: 'Use BigBasket/Blinkit subscriptions for regular groceries' },
  { emoji: '🎯', text: 'Check Swiggy One or Zomato Gold for free deliveries' },
  { emoji: '💳', text: 'Use HDFC or ICICI credit cards for extra 5-10% cashback' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  pageTitle: {
    fontSize: 28,
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
    paddingTop: 16,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  heroCard: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroLabel: { fontSize: 12, fontFamily: FONTS.labelCaps, color: COLORS.textSecondary, letterSpacing: 0.8 },
  heroValue: {
    fontSize: 40,
    fontFamily: FONTS.displayLg,
    color: COLORS.success,
    letterSpacing: -1,
    marginVertical: 4,
  },
  heroChip: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  heroChipText: { fontSize: 12, fontFamily: FONTS.dataMono, color: COLORS.success },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 2,
  },
  tileValue: { fontSize: 20, fontFamily: FONTS.displayLg, color: COLORS.textPrimary, marginBottom: 2 },
  tileLabel: { fontSize: 11, fontFamily: FONTS.labelCaps, color: COLORS.textSecondary, letterSpacing: 0.5 },
  tileNote: { fontSize: 11, fontFamily: FONTS.bodyMain, color: COLORS.textMuted, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  platformEmoji: { fontSize: 22 },
  platformName: { fontSize: 14, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  platformMeta: { fontSize: 12, fontFamily: FONTS.bodyMain, color: COLORS.textMuted, marginTop: 2 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, fontSize: 13, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary, lineHeight: 19 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontFamily: FONTS.displayLg, color: COLORS.textPrimary, marginBottom: 10 },
  emptyText: { fontSize: 14, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyBtnText: { fontSize: 15, fontFamily: FONTS.bodyStrong, color: '#fff' },
});
