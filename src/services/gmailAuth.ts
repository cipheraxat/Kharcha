/**
 * Google OAuth for adding secondary Gmail accounts.
 *
 * Routes through Supabase's OAuth infrastructure (same as primary login) so
 * Google never sees an exp:// redirect URI — it only sees Supabase's registered
 * https:// callback URL. A temporary Supabase client keeps the secondary login
 * isolated from the app's primary Supabase session.
 */
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAccountInfo {
  email: string;
  name: string | null;
  accessToken: string;
  authRefreshToken: string;
}

/**
 * Opens a Google sign-in sheet for a secondary Gmail account.
 * Returns the account info (email + access token) or null if cancelled.
 */
export async function authenticateGoogleAccount(): Promise<GoogleAccountInfo | null> {
  const secondaryAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  // 1. Build redirect URI — identical to the primary OnboardingScreen flow
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'kharcha',
    path: 'auth/callback',
  });

  // 2. Ask Supabase to construct the Google OAuth URL.
  //    Supabase uses its own registered https:// callback with Google, so
  //    Google never sees our exp:// redirect URI. This is why the primary
  //    login works in Expo Go but a direct-to-Google OAuth does not.
  const { data: oauthData, error: oauthError } = await secondaryAuthClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      scopes: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
      queryParams: { prompt: 'select_account', access_type: 'online' },
      skipBrowserRedirect: true,
    },
  });

  if (oauthError || !oauthData?.url) {
    console.error('[gmailAuth] Failed to build OAuth URL:', oauthError?.message);
    return null;
  }

  const oauthUrl = new URL(oauthData.url);
  if (oauthUrl.host.includes('google.com')) {
    throw new Error('Secondary Gmail auth must start through Supabase, not Google directly.');
  }

  // 3. Open the browser — user picks the secondary Google account
  const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectUri);
  if (result.type !== 'success') return null;

  // 4. Extract the auth code from the deep-link redirect
  const parsed = Linking.parse(result.url);
  const codeParam = parsed.queryParams?.code;
  const errorParam = parsed.queryParams?.error_description ?? parsed.queryParams?.error;
  const code = typeof codeParam === 'string' ? codeParam : null;
  if (!code) {
    console.warn('[gmailAuth] No code in redirect URL:', errorParam ?? result.url);
    return null;
  }

  // 5. Exchange code with the temporary client. provider_token = Google access token.
  const { data: sessionData, error: sessionError } =
    await secondaryAuthClient.auth.exchangeCodeForSession(code);

  if (sessionError || !sessionData?.session) {
    console.error('[gmailAuth] Code exchange failed:', sessionError?.message);
    return null;
  }

  const { session: secondarySession } = sessionData;
  const accessToken = secondarySession.provider_token;
  const authRefreshToken = secondarySession.refresh_token;
  const email = secondarySession.user.email;
  const name =
    (secondarySession.user.user_metadata?.full_name as string | undefined) ??
    (secondarySession.user.user_metadata?.name as string | undefined) ??
    null;

  if (!accessToken || !email) {
    console.error('[gmailAuth] provider_token or email missing from secondary session');
    return null;
  }

  return { email, name, accessToken, authRefreshToken };
}
