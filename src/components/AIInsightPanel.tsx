import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS } from '../constants';
import { useStore } from '../store';

const SHIMMER_LINES = [78, 92, 65];

export function AIInsightPanel() {
  const isOpen = useStore((s) => s.isOpen);
  const isLoading = useStore((s) => s.isLoading);
  const request = useStore((s) => s.request);
  const explanation = useStore((s) => s.explanation);
  const closeAIInsight = useStore((s) => s.closeAIInsight);

  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slide.setValue(0);
      fade.setValue(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isLoading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shimmer, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLoading]);

  if (!isOpen || !request) return null;

  const headerColor = request.color ?? COLORS.accent;
  const icon = request.icon ?? '✨';

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.85],
  });

  return (
    <Animated.View
      style={[styles.backdrop, { opacity: fade }]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      <Pressable style={styles.backdropTouch} onPress={closeAIInsight} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* Drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Gradient header */}
          <LinearGradient
            colors={[hexWithAlpha(headerColor, 0.35), hexWithAlpha(headerColor, 0.05)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={[styles.iconBubble, { backgroundColor: hexWithAlpha(headerColor, 0.25), borderColor: hexWithAlpha(headerColor, 0.5) }]}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={10} color={COLORS.accent} />
                <Text style={styles.aiBadgeText}>AI INSIGHT</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {request.title}
              </Text>
              {request.accent && (
                <Text style={styles.headerAccent} numberOfLines={1}>
                  {request.accent}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={closeAIInsight} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* AI Headline + Summary */}
            {isLoading ? (
              <View style={styles.section}>
                {SHIMMER_LINES.map((width, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.shimmerBar,
                      { width: `${width}%`, opacity: shimmerOpacity },
                    ]}
                  />
                ))}
                <View style={styles.thinkingRow}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text style={styles.thinkingText}>Thinking through your data…</Text>
                </View>
              </View>
            ) : explanation ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.headline}>{explanation.headline}</Text>
                  <Text style={styles.summary}>{explanation.summary}</Text>
                </View>

                {explanation.tips.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>WHAT YOU CAN DO</Text>
                    {explanation.tips.map((tip, i) => (
                      <View key={i} style={styles.tipRow}>
                        <View style={[styles.tipNumber, { backgroundColor: hexWithAlpha(headerColor, 0.2) }]}>
                          <Text style={[styles.tipNumberText, { color: headerColor }]}>{i + 1}</Text>
                        </View>
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.section}>
                <Text style={styles.summary}>
                  Couldn't generate an AI insight right now. The raw numbers are below.
                </Text>
              </View>
            )}

            {/* Underlying numbers */}
            {request.rows.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>UNDERLYING NUMBERS</Text>
                <View style={styles.dataCard}>
                  {request.rows.map((row, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dataRow,
                        i < request.rows.length - 1 && styles.dataRowBorder,
                      ]}
                    >
                      <Text style={styles.dataLabel} numberOfLines={1}>{row.label}</Text>
                      <Text style={styles.dataValue} numberOfLines={1}>
                        {row.value === null || row.value === undefined || row.value === ''
                          ? '—'
                          : String(row.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>
    </Animated.View>
  );
}

// Helper: tint a hex color with an alpha channel (rgba string).
function hexWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6 && cleaned.length !== 3) {
    return `rgba(124, 92, 255, ${alpha})`;
  }
  const full = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: '45%',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconText: {
    fontSize: 22,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: hexWithAlpha(COLORS.accent, 0.18),
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  aiBadgeText: {
    fontFamily: FONTS.labelCaps,
    fontSize: 9,
    color: COLORS.accentLight,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontFamily: FONTS.headlineMd,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  headerAccent: {
    fontFamily: FONTS.bodyMain,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: FONTS.labelCaps,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  headline: {
    fontFamily: FONTS.displayLg,
    fontSize: 22,
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 10,
  },
  summary: {
    fontFamily: FONTS.bodyMain,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  tipNumberText: {
    fontFamily: FONTS.labelCaps,
    fontSize: 11,
  },
  tipText: {
    flex: 1,
    fontFamily: FONTS.bodyMain,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  dataCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 14,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  dataLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMain,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 12,
  },
  dataValue: {
    fontFamily: FONTS.dataMono,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  shimmerBar: {
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.cardStrong,
    marginBottom: 10,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  thinkingText: {
    fontFamily: FONTS.bodyMain,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
