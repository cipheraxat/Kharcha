import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, PLATFORM_CONFIG } from '../constants';
import { useStore } from '../store';
import { supabase } from '../services/supabase';
import { formatSyncDate } from '../utils/format';
import { showDetail } from '../utils/showDetail';
import { PlatformLogo } from '../components/PlatformLogo';
import { authenticateGoogleAccount } from '../services/gmailAuth';
import { Platform as AppPlatform } from '../types';

const ALL_PLATFORMS: AppPlatform[] = ['swiggy', 'zomato', 'blinkit', 'bigbasket', 'zepto'];

export default function ProfileScreen() {
  const { session, orders, lastSyncedAt, gmailAccounts, addGmailAccount, removeGmailAccount, updateAccountPlatforms, signOut } = useStore();
  const user = session?.user;
  const [addingAccount, setAddingAccount] = useState(false);
  // Which account email has its platform picker expanded
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

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

  const handleAddAccount = async () => {
    setAddingAccount(true);
    try {
      const result = await authenticateGoogleAccount();
      if (!result) return;

      if (gmailAccounts.some((a) => a.email === result.email)) {
        addGmailAccount({
          email: result.email,
          accessToken: result.accessToken,
          authRefreshToken: result.authRefreshToken,
          assignedPlatforms: [],
          isPrimary: false,
        });
        Alert.alert('Connection refreshed', `${result.email} is ready to sync again.`);
        return;
      }

      addGmailAccount({
        email: result.email,
        accessToken: result.accessToken,
        authRefreshToken: result.authRefreshToken,
        assignedPlatforms: [], // user assigns platforms manually
        isPrimary: false,
      });
    } catch (err: any) {
      Alert.alert('Could not add account', err?.message ?? 'Unknown error');
    } finally {
      setAddingAccount(false);
    }
  };

  const handleRemoveAccount = (email: string) => {
    Alert.alert('Remove account', `Remove ${email}? Its platforms will move back to your primary account.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeGmailAccount(email) },
    ]);
  };

  const togglePlatform = (accountEmail: string, platform: AppPlatform) => {
    const account = gmailAccounts.find((a) => a.email === accountEmail);
    if (!account) return;
    const has = account.assignedPlatforms.includes(platform);
    const newPlatforms = has
      ? account.assignedPlatforms.filter((p) => p !== platform)
      : [...account.assignedPlatforms, platform];
    updateAccountPlatforms(accountEmail, newPlatforms);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroGlow} />

        <Text style={styles.pageTitle}>Profile</Text>

        {/* Account card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.9}
          onPress={() => showDetail('Account', [
            ['Name', user?.user_metadata?.full_name ?? user?.email ?? 'User'],
            ['Email', user?.email],
            ['Linked Gmail accounts', gmailAccounts.length],
            ['Access', 'Read-only Gmail receipt sync'],
          ])}
        >
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
              <Text style={styles.identityPillText}>{gmailAccounts.length} Gmail{gmailAccounts.length !== 1 ? 's' : ''} linked</Text>
            </View>
            <View style={styles.identityPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.accentMint} />
              <Text style={styles.identityPillText}>Read only</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.82}
            onPress={() => showDetail('Orders Tracked', [
              ['Total orders tracked', orders.length],
              ['Source', 'Synced Gmail receipts'],
            ])}
          >
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total orders tracked</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.82}
            onPress={() => showDetail('Last Sync', [
              ['Last sync', lastSyncedAt ? formatSyncDate(lastSyncedAt) : 'Never'],
              ['Linked Gmail accounts', gmailAccounts.length],
            ])}
          >
            <Text style={styles.statValue} numberOfLines={1}>
              {lastSyncedAt ? formatSyncDate(lastSyncedAt) : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Last sync</Text>
          </TouchableOpacity>
        </View>

        {/* Gmail accounts section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gmail accounts</Text>
          {gmailAccounts.map((account) => {
            const isExpanded = expandedEmail === account.email;
            return (
              <View key={account.email} style={styles.accountCard}>
                {/* Account header */}
                <TouchableOpacity
                  style={styles.accountRow}
                  activeOpacity={0.82}
                  onPress={() => showDetail(account.email, [
                    ['Account type', account.isPrimary ? 'Primary' : 'Secondary'],
                    ['Assigned platforms', account.assignedPlatforms.length === 0
                      ? 'None'
                      : account.assignedPlatforms.map((p) => PLATFORM_CONFIG[p]?.label ?? p).join(', ')],
                    ['Token stored', account.accessToken ? 'Yes' : 'No'],
                    ['Refresh available', account.authRefreshToken ? 'Yes' : 'No'],
                  ])}
                >
                  <View style={styles.accountAvatarSmall}>
                    <Text style={styles.accountAvatarText}>
                      {account.email.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.accountEmailRow}>
                      <Text style={styles.accountEmail} numberOfLines={1}>{account.email}</Text>
                      {account.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                    {account.assignedPlatforms.length === 0 ? (
                      <Text style={styles.accountPlatformSummary}>No platforms assigned</Text>
                    ) : (
                      <View style={styles.accountLogoSummary}>
                        {account.assignedPlatforms.map((p) => (
                          <PlatformLogo key={p} platform={p} size="small" />
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.expandBtn}
                    onPress={() => setExpandedEmail(isExpanded ? null : account.email)}
                  >
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Platform toggle grid */}
                {isExpanded && (
                  <View style={styles.platformGrid}>
                    <Text style={styles.platformGridLabel}>Assign platforms to this account</Text>
                    {ALL_PLATFORMS.map((p) => {
                      const cfg = PLATFORM_CONFIG[p];
                      const assigned = account.assignedPlatforms.includes(p);
                      // Which other account owns this platform?
                      const owner = gmailAccounts.find(
                        (a) => a.email !== account.email && a.assignedPlatforms.includes(p)
                      );
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.platformToggleRow, assigned && styles.platformToggleActive]}
                          onPress={() => togglePlatform(account.email, p)}
                          activeOpacity={0.75}
                        >
                          <PlatformLogo platform={p} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.platformToggleName}>{cfg.label}</Text>
                            {owner && !assigned && (
                              <Text style={styles.platformToggleOwner}>
                                Currently: {owner.email.split('@')[0]}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.checkCircle, assigned && styles.checkCircleOn]}>
                            {assigned && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {!account.isPrimary && (
                      <TouchableOpacity
                        style={styles.removeAccountBtn}
                        onPress={() => handleRemoveAccount(account.email)}
                      >
                        <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                        <Text style={styles.removeAccountText}>Remove this account</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add account button */}
          <TouchableOpacity
            style={styles.addAccountBtn}
            onPress={handleAddAccount}
            disabled={addingAccount}
            activeOpacity={0.8}
          >
            {addingAccount ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                <Text style={styles.addAccountText}>Add Gmail account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App info</Text>
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacy"
            value="Read-only access"
            details={['Kharcha only reads Gmail receipts from linked accounts. It does not send email or modify your inbox.']}
          />
          <MenuItem
            icon="information-circle-outline"
            label="App version"
            value="1.0.0"
            details={[
              ['Version', '1.0.0'],
              ['Sync mode', 'Gmail receipt import'],
            ]}
          />
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
  details,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  details: Parameters<typeof showDetail>[1];
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.82}
      onPress={() => showDetail(label, details)}
    >
      <Ionicons name={icon} size={18} color={COLORS.accent} style={{ marginRight: 12 }} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue} numberOfLines={1}>
        {value}
      </Text>
    </TouchableOpacity>
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
    fontSize: 28,
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
    paddingTop: 8,
    marginBottom: 18,
    letterSpacing: -0.5,
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
    fontFamily: FONTS.labelCaps,
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
    fontFamily: FONTS.displayLg,
    color: COLORS.white,
  },
  userName: {
    fontSize: 18,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  subtext: {
    fontSize: 13,
    fontFamily: FONTS.bodyMain,
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
    fontFamily: FONTS.bodyStrong,
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
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.textPrimary,
  },
  menuValue: {
    fontSize: 13,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textMuted,
    maxWidth: 160,
    textAlign: 'right',
  },
  // --- Gmail account cards ---
  accountCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  accountAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    fontSize: 15,
    fontFamily: FONTS.bodyStrong,
    color: '#fff',
  },
  accountEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accountEmail: {
    fontSize: 13,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  primaryBadge: {
    backgroundColor: 'rgba(124, 92, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.labelCaps,
    color: COLORS.accent,
  },
  accountPlatformSummary: {
    fontSize: 13,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  accountLogoSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  expandBtn: {
    padding: 4,
  },
  platformGrid: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  platformGridLabel: {
    fontSize: 11,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  platformToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: COLORS.bgSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformToggleActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
  },
  platformLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  platformToggleName: {
    fontSize: 14,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.textPrimary,
  },
  platformToggleOwner: {
    fontSize: 11,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  removeAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  removeAccountText: {
    fontSize: 13,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.danger,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  addAccountText: {
    fontSize: 14,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.accent,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 180, 171, 0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.2)',
  },
  signOutText: {
    fontSize: 15,
    fontFamily: FONTS.bodyStrong,
    color: COLORS.danger,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textMuted,
  },
});

