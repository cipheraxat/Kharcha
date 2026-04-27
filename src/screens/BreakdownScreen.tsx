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
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { Platform } from '../types';
import { BreakdownSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../utils/format';

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
        <View style={styles.section}>
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
        </View>

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
                  <View key={i} style={styles.pieLegendRow}>
                    <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                    <Text style={styles.legendText}>{cfg.label}</Text>
                    <Text style={styles.legendAmount}>{formatCurrency(p.total)}</Text>
                    <Text style={styles.legendCount}>{p.order_count} orders</Text>
                  </View>
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
              <View key={i} style={styles.platformRow}>
                <Text style={styles.platformEmoji}>{cfg.emoji}</Text>
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
              </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingTop: 16,
    marginBottom: 20,
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  splitBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginBottom: 10,
  },
  splitFood: { backgroundColor: COLORS.warning },
  splitGrocery: { backgroundColor: COLORS.success },
  splitLegend: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: COLORS.textSecondary },
  pieContainer: { alignItems: 'center', marginVertical: 10 },
  pieCenterLabel: { fontSize: 11, color: COLORS.textMuted },
  pieCenterValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
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
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 'auto',
  },
  legendCount: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  platformEmoji: { fontSize: 24, width: 32 },
  platformRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  platformName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  platformTotal: { fontSize: 15, fontWeight: '800' },
  platformBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  platformBarFill: { height: '100%', borderRadius: 2 },
  platformMeta: { fontSize: 12, color: COLORS.textMuted },
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
