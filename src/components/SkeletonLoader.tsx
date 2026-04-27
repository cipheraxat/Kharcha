import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.card,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Overview screen skeleton */
export function OverviewSkeleton() {
  return (
    <View style={skStyles.container}>
      {/* Header */}
      <View style={skStyles.header}>
        <View>
          <SkeletonBlock width={120} height={22} borderRadius={6} />
          <SkeletonBlock width={160} height={14} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBlock width={38} height={38} borderRadius={19} />
      </View>

      {/* Main KPI card */}
      <SkeletonBlock height={120} borderRadius={20} style={{ marginBottom: 14 }} />

      {/* Quick stats row */}
      <View style={skStyles.row}>
        <SkeletonBlock height={90} borderRadius={14} style={{ flex: 1 }} />
        <SkeletonBlock height={90} borderRadius={14} style={{ flex: 1, marginHorizontal: 10 }} />
        <SkeletonBlock height={90} borderRadius={14} style={{ flex: 1 }} />
      </View>

      {/* Nudge card */}
      <SkeletonBlock height={90} borderRadius={16} style={{ marginBottom: 14 }} />

      {/* Section */}
      <SkeletonBlock width={140} height={13} borderRadius={6} style={{ marginBottom: 12 }} />
      <SkeletonBlock height={64} borderRadius={14} style={{ marginBottom: 14 }} />

      {/* Vendors */}
      <SkeletonBlock width={140} height={13} borderRadius={6} style={{ marginBottom: 12 }} />
      <SkeletonBlock height={52} borderRadius={12} style={{ marginBottom: 8 }} />
      <SkeletonBlock height={52} borderRadius={12} style={{ marginBottom: 8 }} />
      <SkeletonBlock height={52} borderRadius={12} />
    </View>
  );
}

/** Breakdown screen skeleton */
export function BreakdownSkeleton() {
  return (
    <View style={skStyles.container}>
      <SkeletonBlock width={160} height={26} borderRadius={8} style={{ marginBottom: 24 }} />

      {/* Category split */}
      <SkeletonBlock width={120} height={13} borderRadius={6} style={{ marginBottom: 14 }} />
      <SkeletonBlock height={10} borderRadius={5} style={{ marginBottom: 20 }} />

      {/* Pie chart placeholder */}
      <SkeletonBlock width={220} height={220} borderRadius={110} style={{ alignSelf: 'center', marginBottom: 24 }} />

      {/* Platform rows */}
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} height={80} borderRadius={14} style={{ marginBottom: 10 }} />
      ))}
    </View>
  );
}

/** Patterns screen skeleton */
export function PatternsSkeleton() {
  return (
    <View style={skStyles.container}>
      <SkeletonBlock width={140} height={26} borderRadius={8} style={{ marginBottom: 24 }} />

      {/* Heatmap */}
      <SkeletonBlock width={120} height={13} borderRadius={6} style={{ marginBottom: 14 }} />
      <SkeletonBlock height={160} borderRadius={14} style={{ marginBottom: 24 }} />

      {/* Junk food */}
      <SkeletonBlock height={72} borderRadius={14} style={{ marginBottom: 20 }} />

      {/* Top vendors */}
      <SkeletonBlock width={140} height={13} borderRadius={6} style={{ marginBottom: 14 }} />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonBlock key={i} height={52} borderRadius={12} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

/** Savings screen skeleton */
export function SavingsSkeleton() {
  return (
    <View style={skStyles.container}>
      <SkeletonBlock width={130} height={26} borderRadius={8} style={{ marginBottom: 24 }} />

      {/* Hero card */}
      <SkeletonBlock height={130} borderRadius={20} style={{ marginBottom: 14 }} />

      {/* Row */}
      <View style={skStyles.row}>
        <SkeletonBlock height={90} borderRadius={14} style={{ flex: 1 }} />
        <SkeletonBlock height={90} borderRadius={14} style={{ flex: 1, marginLeft: 10 }} />
      </View>

      {/* Platform list */}
      <SkeletonBlock width={140} height={13} borderRadius={6} style={{ marginTop: 20, marginBottom: 14 }} />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} height={72} borderRadius={14} style={{ marginBottom: 10 }} />
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  row: { flexDirection: 'row', marginBottom: 14 },
});
