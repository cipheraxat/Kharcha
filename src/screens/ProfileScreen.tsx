import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useStore } from '../store';
import { supabase } from '../services/supabase';
import { formatSyncDate } from '../utils/format';

const PLATFORMS = [
  { name: 'Swiggy', emoji: '🧡' },
  { name: 'Zomato', emoji: '❤️' },
  { name: 'Blinkit', emoji: '💛' },
  { name: 'BigBasket', emoji: '🛒' },
  { name: 'Zepto', emoji: '💜' },
];

export default function ProfileScreen() {
  const { session, orders, lastSyncedAt, signOut } = useStore();
  const user = session?.user;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroGlow} />

        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <Text style={styles.heroEyebrow}>ACCOUNT</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.subtext}>Connected with Google and ready for receipt sync.</Text>

          <View style={styles.identityRow}>
            <View style={styles.identityPill}>
              <Ionicons name="mail-outline" size={14} color={COLORS.accentGold} />
              <Text style={styles.identityPillText}>Gmail linked</Text>
            </View>
            <View style={styles.identityPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.accentMint} />
              <Text style={styles.identityPillText}>Read only</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total orders tracked</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue} numberOfLines={1}>
              {lastSyncedAt ? formatSyncDate(lastSyncedAt) : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Last sync</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <MenuItem icon="mail-outline" label="Connected Gmail" value={user?.email ?? ''} />
          <MenuItem icon="shield-checkmark-outline" label="Privacy" value="Read-only access" />
          <MenuItem icon="information-circle-outline" label="App version" value="1.0.0" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supported platforms</Text>
          {PLATFORMS.map((platform) => (
            <View key={platform.name} style={styles.platformRow}>
              <Text style={styles.platformEmoji}>{platform.emoji}</Text>
              <Text style={styles.platformName}>{platform.name}</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Made for mindful spending.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.menuItem}>
      <Ionicons name={icon} size={18} color={COLORS.accent} style={{ marginRight: 12 }} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(246, 197, 98, 0.08)',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingTop: 8,
    marginBottom: 18,
  },
  profileCard: {
    backgroundColor: COLORS.cardStrong,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  heroEyebrow: {
    alignSelf: 'flex-start',
    color: COLORS.accentGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  subtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
  identityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  identityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  identityPillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  menuValue: {
    fontSize: 13,
    color: COLORS.textMuted,
    maxWidth: 160,
    textAlign: 'right',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  platformEmoji: {
    fontSize: 20,
    width: 28,
  },
  platformName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#1B2D1B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2D1B1B',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5B2525',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
