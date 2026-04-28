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
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { Platform } from '../types';
import { BreakdownSkeleton } from '../components/SkeletonLoader';
import { PlatformLogo } from '../components/PlatformLogo';
import { formatCurrency } from '../utils/format';
import { showDetail } from '../utils/showDetail';
import { openAIInsight } from '../utils/openAIInsight';

export default function BreakdownScreen() {
  const navigation = useNavigation();
  const stats = useStore((s) => s.stats);
  const isLoadingData = useStore((s) => s.isLoadingData);

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <BreakdownSkeleton />
      </SafeAreaView>
    );
  }

  const isEmpty = !stats || stats.spendByPlatform.length === 0;
  if (isEmpty) return <EmptyState onSync={() => navigation.navigate('Sync' as never)} />;

  // Pie chart data
  const pieData = stats.spendByPlatform.map((p) => ({
    value: Math.round(p.total),
    color: PLATFORM_CONFIG[p.platform as Platform]?.color ?? '#888',
    label: PLATFORM_CONFIG[p.platform as Platform]?.label ?? p.platform,
    focused: false,
  }));

  // Bar chart data (monthly)
  const barData = stats.monthlySpend.map((m) => ({
    value: Math.round(m.total),
    label: m.month,
    frontColor: COLORS.accent,
    topLabelComponent: () => (
      <Text style={{ color: COLORS.textMuted, fontSize: 9, marginBottom: 2 }}>
        {m.total >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : Math.round(m.total)}
      </Text>
    ),
  }));

  const foodTotal = stats.monthlySpend.reduce((a, m) => a + m.food, 0);
  const groceryTotal = stats.monthlySpend.reduce((a, m) => a + m.grocery, 0);
  const overallTotal = foodTotal + groceryTotal;
  const foodPct = overallTotal > 0 ? Math.round((foodTotal / overallTotal) * 100) : 0;
  const groceryPct = 100 - foodPct;

  // Pre-compute once — used for % bars in Platform Summary
  const platformTotal = stats.spendByPlatform.reduce((a, x) => a + x.total, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Breakdown</Text>

        {/* Category split */}
        <TouchableOpacity
          style={styles.section}
          activeOpacity={0.9}
          onPress={() => openAIInsight({
            insightType: 'food_vs_grocery',
            title: 'Food vs Grocery',
            accent: `${foodPct}% food · ${groceryPct}% grocery`,
            color: COLORS.warning,
            icon: '🍲',
            context: {
              food_spend_inr: Math.round(foodTotal),
              food_share_pct: foodPct,
              grocery_spend_inr: Math.round(groceryTotal),
              grocery_share_pct: groceryPct,
              total_inr: Math.round(overallTotal),
            },
            rows: [
              { label: 'Food spend', value: formatCurrency(foodTotal) },
              { label: 'Food share', value: `${foodPct}%` },
              { label: 'Grocery spend', value: formatCurrency(groceryTotal) },
              { label: 'Grocery share', value: `${groceryPct}%` },
              { label: 'Total', value: formatCurrency(overallTotal) },
            ],
          })}
        >
          <Text style={styles.sectionTitle}>Food vs Grocery</Text>
          <View style={styles.splitBar}>
            <View style={[styles.splitFood, { flex: foodPct }]} />
            <View style={[styles.splitGrocery, { flex: groceryPct }]} />
          </View>
          <View style={styles.splitLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.legendText}>Food {foodPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Grocery {groceryPct}%</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Platform pie */}
        {pieData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spend by Platform</Text>
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={COLORS.surface}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.pieCenterLabel}>Total</Text>
                    <Text style={styles.pieCenterValue}>
                      {formatCurrency(
                        stats.spendByPlatform.reduce((a, p) => a + p.total, 0)
                      )}
                    </Text>
                  </View>
                )}
              />
            </View>
            {/* Legend */}
            <View style={styles.pieLegend}>
              {stats.spendByPlatform.map((p, i) => {
                const cfg = PLATFORM_CONFIG[p.platform as Platform];
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.pieLegendRow}
                    activeOpacity={0.82}
                    onPress={() => openAIInsight({
                      insightType: 'platform_pie_slice',
                      title: cfg.label,
                      accent: `${formatCurrency(p.total)} · ${p.order_count} orders`,
                      color: cfg.color,
                      icon: cfg.emoji,
                      context: {
                        platform: p.platform,
                        total_spend_inr: Math.round(p.total),
                        order_count: p.order_count,
                        avg_order_inr: p.order_count > 0 ? Math.round(p.total / p.order_count) : 0,
                      },
                      rows: [
                        { label: 'Total spend', value: formatCurrency(p.total) },
                        { label: 'Orders', value: p.order_count },
                        { label: 'Average order', value: formatCurrency(p.total / p.order_count) },
                      ],
                    })}
                  >
                    <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                    <Text style={styles.legendText}>{cfg.label}</Text>
                    <Text style={styles.legendAmount}>{formatCurrency(p.total)}</Text>
                    <Text style={styles.legendCount}>{p.order_count} orders</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Monthly bar chart */}
        {barData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Spending</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                barWidth={36}
                spacing={16}
                roundedTop
                xAxisColor={COLORS.border}
                yAxisColor={COLORS.border}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                noOfSections={4}
                isAnimated
                yAxisThickness={0}
                xAxisThickness={1}
                hideRules
                backgroundColor="transparent"
              />
            </ScrollView>
          </View>
        )}

        {/* Per-platform spend list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Summary</Text>
          {stats.spendByPlatform.map((p, i) => {
            const cfg = PLATFORM_CONFIG[p.platform as Platform];
            const pct = platformTotal > 0 ? Math.round((p.total / platformTotal) * 100) : 0;
            return (
              <TouchableOpacity
                key={i}
                style={styles.platformRow}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'platform_summary',
                  title: cfg.label,
                  accent: `${pct}% share · ${p.order_count} orders`,
                  color: cfg.color,
                  icon: cfg.emoji,
                  context: {
                    platform: p.platform,
                    total_spend_inr: Math.round(p.total),
                    share_of_platform_spend_pct: pct,
                    order_count: p.order_count,
                    avg_order_inr: p.order_count > 0 ? Math.round(p.total / p.order_count) : 0,
                  },
                  rows: [
                    { label: 'Total spend', value: formatCurrency(p.total) },
                    { label: 'Share of platform spend', value: `${pct}%` },
                    { label: 'Orders', value: p.order_count },
                    { label: 'Average order', value: formatCurrency(p.total / p.order_count) },
                  ],
                })}
              >
                <PlatformLogo platform={p.platform} size="small" />
                <View style={{ flex: 1 }}>
                  <View style={styles.platformRowHeader}>
                    <Text style={styles.platformName}>{cfg.label}</Text>
                    <Text style={[styles.platformTotal, { color: cfg.color }]}>
                      {formatCurrency(p.total)}
                    </Text>
                  </View>
                  <View style={styles.platformBar}>
                    <View
                      style={[
                        styles.platformBarFill,
                        { width: `${pct}%`, backgroundColor: cfg.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.platformMeta}>
                    {p.order_count} orders · avg {formatCurrency(p.total / p.order_count)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ onSync }: { onSync: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyTitle}>No breakdown yet</Text>
        <Text style={styles.emptyText}>
          Sync your Gmail to see how your spending is distributed across platforms.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={onSync}>
          <Ionicons name="sync-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.emptyBtnText}>Sync Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  splitBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: COLORS.cardStrong,
    marginBottom: 10,
  },
  splitFood: { backgroundColor: COLORS.warning },
  splitGrocery: { backgroundColor: COLORS.success },
  splitLegend: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary },
  pieContainer: { alignItems: 'center', marginVertical: 10 },
  pieCenterLabel: { fontSize: 11, fontFamily: FONTS.labelCaps, color: COLORS.textMuted },
  pieCenterValue: { fontSize: 20, fontFamily: FONTS.displayLg, color: COLORS.textPrimary },
  pieLegend: { marginTop: 16 },
  pieLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  legendAmount: {
    fontSize: 14,
    fontFamily: FONTS.dataMono,
    color: COLORS.textPrimary,
    marginLeft: 'auto',
  },
  legendCount: { fontSize: 12, fontFamily: FONTS.bodyMain, color: COLORS.textMuted, marginLeft: 8 },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformEmoji: { fontSize: 24, width: 32 },
  platformRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  platformName: { fontSize: 15, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  platformTotal: { fontSize: 15, fontFamily: FONTS.dataMono },
  platformBar: {
    height: 4,
    backgroundColor: COLORS.cardStrong,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  platformBarFill: { height: '100%', borderRadius: 999 },
  platformMeta: { fontSize: 12, fontFamily: FONTS.bodyMain, color: COLORS.textMuted },
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
