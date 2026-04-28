import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants';
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
  const setPrimaryAccount = useStore((s) => s.setPrimaryAccount);
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
      const email = data.session.user.email ?? '';
      if (googleToken) setPrimaryAccount(email, googleToken);
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
      {/* Background glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoSymbol}>₹</Text>
          </View>
        </View>

        {/* App name + tagline */}
        <Text style={styles.appName}>Kharcha</Text>
        <Text style={styles.tagline}>
          Precision financial tracking{'\n'}for modern professionals.
        </Text>

        {/* Feature chips */}
        <View style={styles.chips}>
          {[
            { icon: 'bar-chart-outline', label: 'Spend Analytics' },
            { icon: 'flame-outline', label: 'Habit Patterns' },
            { icon: 'wallet-outline', label: 'Savings Tracker' },
            { icon: 'bulb-outline', label: 'AI Nudges' },
          ].map((f) => (
            <View key={f.label} style={styles.chip}>
              <Ionicons name={f.icon as any} size={13} color={COLORS.accentLight} />
              <Text style={styles.chipLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
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
              <Text style={styles.signInText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security */}
        <View style={styles.securityRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.securityText}>
            Your financial data is encrypted and securely stored.{'\n'}
            Read-only Gmail access. We never sell your information.
          </Text>
        </View>

        <Text style={styles.footer}>
          Works with Swiggy · Zomato · Blinkit · BigBasket · Zepto
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 40,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(202, 190, 255, 0.08)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  logoWrap: { marginBottom: 24 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logoSymbol: {
    fontSize: 44,
    fontFamily: FONTS.displayLg,
    color: COLORS.accentLight,
    lineHeight: 52,
  },
  appName: {
    fontSize: 48,
    fontFamily: FONTS.displayLg,
    color: COLORS.textPrimary,
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 28,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: FONTS.labelCaps,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  signInBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  signInBtnDisabled: { opacity: 0.6 },
  signInText: {
    fontSize: 16,
    fontFamily: FONTS.bodyStrong,
    color: '#fff',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  footer: {
    fontSize: 12,
    fontFamily: FONTS.bodyMain,
    color: COLORS.textDim,
    textAlign: 'center',
  },
});
