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
import { PatternsSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '../utils/format';

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

        {/* Junk food indicator */}
        <View style={styles.junkCard}>
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
        </View>

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
                    <View
                      key={slot}
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
              <View key={i} style={styles.vendorRow}>
                <View style={[styles.rankBadge, { backgroundColor: i < 3 ? COLORS.accent : COLORS.card }]}>
                  <Text style={[styles.rankText, { color: i < 3 ? '#fff' : COLORS.textMuted }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={styles.vendorEmoji}>{cfg?.emoji ?? '🛍️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vendorName} numberOfLines={1}>{v.name}</Text>
                  <Text style={styles.vendorMeta}>
                    {v.order_count} orders on {cfg?.label ?? v.platform}
                  </Text>
                </View>
                <Text style={styles.vendorAmount}>{formatCurrency(v.total)}</Text>
              </View>
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
              <View key={i} style={styles.avgRow}>
                <Text style={styles.avgEmoji}>{cfg.emoji}</Text>
                <Text style={styles.avgLabel}>{cfg.label}</Text>
                <Text style={[styles.avgValue, { color: cfg.color }]}>
                  {formatCurrency(avg)}
                </Text>
              </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingTop: 16,
    marginBottom: 20,
  },
  junkCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  junkEmoji: { fontSize: 32 },
  junkTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  junkDesc: { fontSize: 13, color: COLORS.textSecondary },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  heatmapContainer: { backgroundColor: COLORS.card, borderRadius: 14, padding: 12 },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapDayLabel: {
    width: 30,
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  heatmapHourLabel: {
    flex: 1,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  heatmapCell: {
    flex: 1,
    height: 22,
    borderRadius: 3,
    marginHorizontal: 1.5,
  },
  heatmapNote: {
    fontSize: 11,
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
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '800' },
  vendorEmoji: { fontSize: 18 },
  vendorName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  vendorMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  vendorAmount: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  avgEmoji: { fontSize: 20, width: 28 },
  avgLabel: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  avgValue: { fontSize: 16, fontWeight: '800' },
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
