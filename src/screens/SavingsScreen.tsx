import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { Platform } from '../types';
import { SavingsSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../utils/format';

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
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🎉</Text>
          <Text style={styles.heroLabel}>Total saved on discounts</Text>
          <Text style={styles.heroValue}>{formatCurrency(stats.totalSavings)}</Text>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>{savingsRate}% savings rate</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <SavingsTile
            icon="car-outline"
            color={COLORS.danger}
            label="Delivery fees paid"
            value={formatCurrency(stats.totalDeliveryFees)}
            note="Across all orders"
          />
          <SavingsTile
            icon="pricetag-outline"
            color={COLORS.success}
            label="Discounts captured"
            value={formatCurrency(stats.totalSavings)}
            note="From all platforms"
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
              <View key={i} style={styles.platformRow}>
                <Text style={styles.platformEmoji}>{cfg.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>{cfg.label}</Text>
                  <Text style={styles.platformMeta}>
                    {p.order_count} orders · {formatCurrency(p.total)} spent
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
              </View>
            );
          })}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Money-saving tips</Text>
          {TIPS.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SavingsTile({ icon, color, label, value, note }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <View style={[styles.tile, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 8 }} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileNote}>{note}</Text>
    </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingTop: 16,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: '#1B2D1B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D4A2D',
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: -1,
    marginVertical: 4,
  },
  heroChip: {
    backgroundColor: '#2D4A2D',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  heroChipText: { fontSize: 12, color: COLORS.success, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 2,
  },
  tileValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  tileLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  tileNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  platformName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  platformMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
