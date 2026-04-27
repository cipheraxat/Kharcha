import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { supabase } from '../services/supabase';
import { useStore } from '../store';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export default function OnboardingScreen() {
  const setSession = useStore((s) => s.setSession);
  const setGoogleAccessToken = useStore((s) => s.setGoogleAccessToken);
  const [loading, setLoading] = React.useState(false);

  const redirectTo = AuthSession.makeRedirectUri({
    scheme: 'kharcha',
    path: 'auth/callback',
  });

  /**
   * Exchange the authorisation code for tokens via Supabase's OAuth flow.
   * We use supabase.auth.exchangeCodeForSession() which handles the PKCE
   * code verifier exchange and returns a full session including the Gmail
   * access token we need for syncing.
   */
  const exchangeCodeForTokens = useCallback(async (code: string) => {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session) {
        console.error('[auth] Code exchange failed:', error?.message);
        Alert.alert(
          'Sign-in failed',
          'Could not complete sign-in. Please check your Supabase Google OAuth configuration and try again.'
        );
        return;
      }

      // The provider token is the Google OAuth access token (for Gmail API)
      const googleToken = data.session.provider_token ?? null;
      setGoogleAccessToken(googleToken);
      setSession(data.session);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          scopes: SCOPES.join(' '),
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        Alert.alert('Sign-in failed', error?.message ?? 'Unable to start Google sign-in');
        setLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') {
        setLoading(false);
        return;
      }

      const parsed = Linking.parse(result.url);
      const codeParam = parsed.queryParams?.code;
      const errParam = parsed.queryParams?.error_description ?? parsed.queryParams?.error;
      const code = typeof codeParam === 'string' ? codeParam : null;

      if (!code) {
        Alert.alert(
          'Sign-in failed',
          typeof errParam === 'string' ? errParam : 'Missing authorization code from Google.'
        );
        setLoading(false);
        return;
      }

      await exchangeCodeForTokens(code);
    } catch (err: any) {
      Alert.alert('Sign-in failed', err?.message ?? 'Unknown error during Google sign-in.');
      setLoading(false);
    }
  }, [exchangeCodeForTokens, redirectTo]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backdropOrbTop} />
      <View style={styles.backdropOrbBottom} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>SPEND CLARITY</Text>
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💸</Text>
            </View>
            <Text style={styles.appName}>Kharcha</Text>
            <Text style={styles.tagline}>Food, grocery, and impulse orders turned into one calm financial story.</Text>
          </View>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.privacyBox}>
          <Ionicons name="lock-closed-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.privacyText}>
            Read-only Gmail access. Your emails are never stored — only the order amounts and dates are extracted.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.signInText}>Connect Gmail and enter</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Works with Swiggy, Zomato, Blinkit, BigBasket and Zepto receipts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  {
    emoji: '📊',
    title: 'Spending Dashboard',
    desc: 'See where your money goes across apps, vendors, and habits.',
  },
  {
    emoji: '🔥',
    title: 'Habit Patterns',
    desc: 'Spot the time slots and cravings that quietly shape your month.',
  },
  {
    emoji: '💰',
    title: 'Savings Tracker',
    desc: 'Compare discounts earned against delivery fees leaking out.',
  },
  {
    emoji: '🤖',
    title: 'AI Nudges',
    desc: 'Receive short, practical prompts grounded in your actual orders.',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: -80,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 70,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 142, 94, 0.12)',
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: COLORS.cardStrong,
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 22,
  },
  kicker: {
    color: COLORS.accentGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 18,
  },
  logoArea: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 42 },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1.4,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: { marginBottom: 18 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: { fontSize: 22 },
  featureCopy: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 19,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  signInBtn: {
    backgroundColor: COLORS.accentWarm,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  signInBtnDisabled: { opacity: 0.6 },
  signInText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 18,
  },
});
