import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/services/supabase';
import { useStore } from './src/store';
import { COLORS } from './src/constants';

export default function App() {
  const setSession = useStore((s) => s.setSession);
  const setGoogleAccessToken = useStore((s) => s.setGoogleAccessToken);

  useEffect(() => {
    // Restore Supabase session and Google token independently so one failure
    // does not prevent the other from succeeding.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.warn('[App] Failed to restore Supabase session:', err);
      }

      try {
        const googleToken = await SecureStore.getItemAsync('google_access_token');
        if (googleToken) setGoogleAccessToken(googleToken);
      } catch (err) {
        console.warn('[App] Failed to restore Google token from SecureStore:', err);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <AppNavigator />
    </>
  );
}
