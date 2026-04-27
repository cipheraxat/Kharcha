import { DashboardStats } from '../types';
import { supabase } from './supabase';

export interface Nudge {
  message: string;
  generated_at: string; // YYYY-MM-DD
}

const FALLBACK_NUDGE_MESSAGE = "You're doing great tracking your spending! Keep it up. 🎯";

// Returns a fresh nudge object each call so generated_at reflects the actual call time
function getFallbackNudge(): Nudge {
  return {
    message: FALLBACK_NUDGE_MESSAGE,
    generated_at: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Calls the `generate-nudge` Supabase Edge Function which holds the
 * LLM provider API key server-side. Never calls the model provider directly from
 * the client to avoid bundling secrets into the app binary.
 */
export async function generateNudge(stats: DashboardStats): Promise<Nudge> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-nudge', {
      body: { stats },
    });

    if (error) {
      console.warn('[nudge] Edge function error:', error.message);
      return getFallbackNudge();
    }

    if (!data?.message) {
      return getFallbackNudge();
    }

    return {
      message: data.message as string,
      generated_at: (data.generated_at as string) ?? new Date().toISOString().slice(0, 10),
    };
  } catch (err) {
    console.warn('[nudge] Unexpected error:', err);
    return getFallbackNudge();
  }
}
