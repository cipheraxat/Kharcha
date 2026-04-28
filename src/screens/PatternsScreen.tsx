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
import { PatternsSkeleton } from '../components/SkeletonLoader';
import { PlatformLogo } from '../components/PlatformLogo';
import { formatCurrency } from '../utils/format';
import { showDetail } from '../utils/showDetail';
import { openAIInsight } from '../utils/openAIInsight';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

export default function PatternsScreen() {
  const navigation = useNavigation();
  const stats = useStore((s) => s.stats);
  const isLoadingData = useStore((s) => s.isLoadingData);

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <PatternsSkeleton />
      </SafeAreaView>
    );
  }

  if (!stats || stats.spendByPlatform.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📈</Text>
          <Text style={styles.emptyTitle}>No patterns yet</Text>
          <Text style={styles.emptyText}>
            Sync your Gmail to discover when and what you order most.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Sync' as never)}>
            <Ionicons name="sync-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.emptyBtnText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Build heatmap grid (7 days x 24 hours) - grouped into 3-hour slots for readability
  const SLOTS = 8; // 24h / 3h = 8 slots
  const heatmapGrid: number[][] = Array.from({ length: 7 }, () =>
    Array(SLOTS).fill(0)
  );
  for (const cell of stats.heatmap) {
    const slot = Math.floor(cell.hour / 3);
    heatmapGrid[cell.day][slot] += cell.count;
  }
  const maxCount = Math.max(...heatmapGrid.flat(), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Patterns</Text>

        {/* Stitch insight cards */}
        {(() => {
          // Most active time slot
          let maxSlotIdx = 0;
          let maxSlotCount = 0;
          for (let s = 0; s < SLOTS; s++) {
            const slotTotal = heatmapGrid.reduce((a, day) => a + day[s], 0);
            if (slotTotal > maxSlotCount) { maxSlotCount = slotTotal; maxSlotIdx = s; }
          }
          const TIME_NAMES = ['12a–3a','3a–6a','6a–9a','9a–12p','12p–3p','3p–6p','6p–9p','9p–12a'];
          // Most active day
          let maxDayIdx = 0;
          let maxDayCount = 0;
          heatmapGrid.forEach((row, d) => {
            const t = row.reduce((a, v) => a + v, 0);
            if (t > maxDayCount) { maxDayCount = t; maxDayIdx = d; }
          });
          // Quietest day
          let minDayIdx = 0;
          let minDayCount = Infinity;
          heatmapGrid.forEach((row, d) => {
            const t = row.reduce((a, v) => a + v, 0);
            if (t < minDayCount) { minDayCount = t; minDayIdx = d; }
          });
          // Busiest platform by order count
          const busiest = stats.spendByPlatform.reduce((a, p) => p.order_count > a.order_count ? p : a, stats.spendByPlatform[0]);
          return (
            <View style={styles.insightRow}>
              <TouchableOpacity
                style={styles.insightCard}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'most_active_slot',
                  title: 'Most Active',
                  accent: `${DAYS[maxDayIdx]} · ${TIME_NAMES[maxSlotIdx]}`,
                  color: COLORS.accentWarm,
                  icon: '🔥',
                  context: {
                    day: DAYS[maxDayIdx],
                    time_slot: TIME_NAMES[maxSlotIdx],
                    orders_in_slot: maxSlotCount,
                  },
                  rows: [
                    { label: 'Day', value: DAYS[maxDayIdx] },
                    { label: 'Time slot', value: TIME_NAMES[maxSlotIdx] },
                    { label: 'Orders in slot', value: maxSlotCount },
                  ],
                })}
              >
                <Ionicons name="flame-outline" size={20} color={COLORS.accentWarm} style={{ marginBottom: 8 }} />
                <Text style={styles.insightLabel}>MOST ACTIVE</Text>
                <Text style={styles.insightValue}>{DAYS[maxDayIdx]}</Text>
                <Text style={styles.insightSub}>{TIME_NAMES[maxSlotIdx]}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.insightCard}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'busiest_platform',
                  title: 'Busiest Platform',
                  accent: PLATFORM_CONFIG[busiest.platform as Platform]?.label ?? busiest.platform,
                  color: PLATFORM_CONFIG[busiest.platform as Platform]?.color ?? COLORS.accent,
                  icon: PLATFORM_CONFIG[busiest.platform as Platform]?.emoji ?? '🛍️',
                  context: {
                    platform: busiest.platform,
                    order_count: busiest.order_count,
                    total_spend_inr: Math.round(busiest.total),
                    avg_order_inr: busiest.order_count > 0 ? Math.round(busiest.total / busiest.order_count) : 0,
                  },
                  rows: [
                    { label: 'Platform', value: PLATFORM_CONFIG[busiest.platform as Platform]?.label ?? busiest.platform },
                    { label: 'Orders', value: busiest.order_count },
                    { label: 'Total spend', value: formatCurrency(busiest.total) },
                    { label: 'Average order', value: formatCurrency(busiest.total / busiest.order_count) },
                  ],
                })}
              >
                <Ionicons name="bag-outline" size={20} color={COLORS.accentLight} style={{ marginBottom: 8 }} />
                <Text style={styles.insightLabel}>TOP PLATFORM</Text>
                <Text style={styles.insightValue}>{PLATFORM_CONFIG[busiest.platform as Platform]?.label ?? busiest.platform}</Text>
                <Text style={styles.insightSub}>{busiest.order_count} orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.insightCard}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'quiet_day',
                  title: 'Quiet Day',
                  accent: `${DAYS[minDayIdx]} · ${minDayCount} orders`,
                  color: COLORS.success,
                  icon: '🌿',
                  context: {
                    day: DAYS[minDayIdx],
                    order_count: minDayCount,
                    note: 'Lowest activity day in synced orders',
                  },
                  rows: [
                    { label: 'Day', value: DAYS[minDayIdx] },
                    { label: 'Orders', value: minDayCount },
                  ],
                })}
              >
                <Ionicons name="trending-down-outline" size={20} color={COLORS.success} style={{ marginBottom: 8 }} />
                <Text style={styles.insightLabel}>QUIET DAY</Text>
                <Text style={styles.insightValue}>{DAYS[minDayIdx]}</Text>
                <Text style={styles.insightSub}>Low activity</Text>
              </TouchableOpacity>
            </View>
          );
        })()}
        <TouchableOpacity
          style={styles.junkCard}
          activeOpacity={0.82}
          onPress={() => openAIInsight({
            insightType: 'food_choices',
            title: 'Food Choices',
            accent: `${stats.junkFoodPercent}% indulgent`,
            color: stats.junkFoodPercent > 60 ? COLORS.danger : stats.junkFoodPercent > 30 ? COLORS.warning : COLORS.success,
            icon: stats.junkFoodPercent > 60 ? '🍕' : stats.junkFoodPercent > 30 ? '🥗' : '🥦',
            context: {
              indulgent_pct: stats.junkFoodPercent,
              signal: stats.junkFoodPercent > 60
                ? 'Comfort food heavy'
                : stats.junkFoodPercent > 30
                ? 'Balanced mix'
                : 'Mostly healthy choices',
            },
            rows: [
              { label: 'Indulgent food orders', value: `${stats.junkFoodPercent}%` },
              { label: 'Signal', value: stats.junkFoodPercent > 60
                ? 'Comfort food heavy'
                : stats.junkFoodPercent > 30
                ? 'Balanced mix'
                : 'Mostly healthy choices' },
            ],
          })}
        >
          <Text style={styles.junkEmoji}>
            {stats.junkFoodPercent > 60 ? '🍕' : stats.junkFoodPercent > 30 ? '🥗' : '🥦'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.junkTitle}>
              {stats.junkFoodPercent}% of food orders are indulgent
            </Text>
            <Text style={styles.junkDesc}>
              {stats.junkFoodPercent > 60
                ? 'You love your comfort food — no judgment!'
                : stats.junkFoodPercent > 30
                ? 'Pretty balanced mix of food choices'
                : 'Impressive! Mostly healthy choices'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Order heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>When do you order?</Text>
          <View style={styles.heatmapContainer}>
            {/* Hour labels */}
            <View style={styles.heatmapRow}>
              <View style={{ width: 30 }} />
              {HOUR_LABELS.map((h) => (
                <Text key={h} style={styles.heatmapHourLabel}>{h}</Text>
              ))}
            </View>
            {/* Rows */}
            {DAYS.map((day, dayIdx) => (
              <View key={day} style={styles.heatmapRow}>
                <Text style={styles.heatmapDayLabel}>{day}</Text>
                {heatmapGrid[dayIdx].map((count, slot) => {
                  const intensity = count / maxCount;
                  return (
                    <TouchableOpacity
                      key={slot}
                      activeOpacity={0.75}
                      onPress={() => openAIInsight({
                        insightType: 'heatmap_cell',
                        title: `${day} · ${HOUR_LABELS[slot]}`,
                        accent: `${count} orders in this slot`,
                        color: COLORS.accent,
                        icon: '🕒',
                        context: {
                          day,
                          time_slot: `${HOUR_LABELS[slot]} - ${HOUR_LABELS[(slot + 1) % HOUR_LABELS.length]}`,
                          orders: count,
                        },
                        rows: [
                          { label: 'Orders', value: count },
                          { label: 'Time slot', value: `${HOUR_LABELS[slot]} - ${HOUR_LABELS[(slot + 1) % HOUR_LABELS.length]}` },
                        ],
                      })}
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor:
                            intensity === 0
                              ? COLORS.card
                              : `rgba(108, 99, 255, ${0.2 + intensity * 0.8})`,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={styles.heatmapNote}>Darker = more orders in that time slot</Text>
        </View>

        {/* Top vendors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your go-to spots</Text>
          {stats.topVendors.slice(0, 7).map((v, i) => {
            const cfg = PLATFORM_CONFIG[v.platform as Platform];
            return (
              <TouchableOpacity
                key={i}
                style={styles.vendorRow}
                activeOpacity={0.82}
                onPress={() => openAIInsight({
                  insightType: 'top_vendor',
                  title: v.name,
                  accent: `Rank #${i + 1} · ${cfg?.label ?? v.platform}`,
                  color: cfg?.color ?? COLORS.accent,
                  icon: '🏆',
                  context: {
                    vendor_name: v.name,
                    rank: i + 1,
                    platform: v.platform,
                    order_count: v.order_count,
                    total_spend_inr: Math.round(v.total),
                    avg_order_inr: v.order_count > 0 ? Math.round(v.total / v.order_count) : 0,
                  },
                  rows: [
                    { label: 'Rank', value: `#${i + 1}` },
                    { label: 'Platform', value: cfg?.label ?? v.platform },
                    { label: 'Orders', value: v.order_count },
                    { label: 'Total spend', value: formatCurrency(v.total) },
                    { label: 'Average order', value: formatCurrency(v.total / v.order_count) },
                  ],
                })}
              >
                <View style={[styles.rankBadge, { backgroundColor: i < 3 ? COLORS.accent : COLORS.card }]}>
                  <Text style={[styles.rankText, { color: i < 3 ? '#fff' : COLORS.textMuted }]}>
                    {i + 1}
                  </Text>
                </View>
                <PlatformLogo platform={v.platform} size="small" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendorName} numberOfLines={1}>{v.name}</Text>
                  <Text style={styles.vendorMeta}>
                    {v.order_count} orders on {cfg?.label ?? v.platform}
                  </Text>
                </View>
                <Text style={styles.vendorAmount}>{formatCurrency(v.total)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Avg order by platform */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average order value</Text>
          {stats.spendByPlatform.map((p, i) => {
            const cfg = PLATFORM_CONFIG[p.platform as Platform];
            const avg = p.order_count > 0 ? p.total / p.order_count : 0;
            return (
              <TouchableOpacity
                key={i}
                style={styles.avgRow}
                activeOpacity={0.82}
                onPress={() => showDetail(`${cfg.label} Average`, [
                  ['Average order', formatCurrency(avg)],
                  ['Orders', p.order_count],
                  ['Total spend', formatCurrency(p.total)],
                ])}
              >
                <PlatformLogo platform={p.platform} size="small" />
                <Text style={styles.avgLabel}>{cfg.label}</Text>
                <Text style={[styles.avgValue, { color: cfg.color }]}>
                  {formatCurrency(avg)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  insightRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  insightCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightLabel: {
    fontSize: 9,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 16,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  insightSub: {
    fontSize: 11,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textSecondary,
  },
  junkCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  junkEmoji: { fontSize: 32 },
  junkTitle: { fontSize: 15, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary, marginBottom: 2 },
  junkDesc: { fontSize: 13, fontFamily: FONTS.bodyMain, color: COLORS.textSecondary },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  heatmapContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapDayLabel: {
    width: 30,
    fontSize: 10,
    fontFamily: FONTS.dataMono,
    color: COLORS.textMuted,
  },
  heatmapHourLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: FONTS.dataMono,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  heatmapCell: {
    flex: 1,
    height: 22,
    borderRadius: 4,
    marginHorizontal: 1.5,
  },
  heatmapNote: {
    fontSize: 11,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontFamily: FONTS.dataMono },
  vendorEmoji: { fontSize: 18 },
  vendorName: { fontSize: 14, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  vendorMeta: { fontSize: 11, fontFamily: FONTS.bodyMain, color: COLORS.textMuted, marginTop: 1 },
  vendorAmount: { fontSize: 14, fontFamily: FONTS.dataMono, color: COLORS.textPrimary },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  avgEmoji: { fontSize: 20, width: 28 },
  avgLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyStrong, color: COLORS.textPrimary },
  avgValue: { fontSize: 16, fontFamily: FONTS.dataMono },
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
