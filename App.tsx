import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/services/supabase';
import { useStore } from './src/store';
import { COLORS } from './src/constants';
import { AIInsightPanel } from './src/components/AIInsightPanel';

export default function App() {
  const setSession = useStore((s) => s.setSession);
  const setPrimaryAccount = useStore((s) => s.setPrimaryAccount);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    // Restore Supabase session and refresh the primary Gmail token when
    // Supabase has a fresh Google provider token available.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.provider_token && session.user.email) {
          setPrimaryAccount(session.user.email, session.provider_token);
        }
      } catch (err) {
        console.warn('[App] Failed to restore Supabase session:', err);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.provider_token && session.user.email) {
        setPrimaryAccount(session.user.email, session.provider_token);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      {fontsLoaded ? (
        <>
          <AppNavigator />
          <AIInsightPanel />
        </>
      ) : (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }} />
      )}
    </>
  );
}
