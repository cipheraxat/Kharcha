import { supabase } from './supabase';

export interface InsightExplanation {
  headline: string;
  summary: string;
  tips: string[];
  generated_at: string;
}

export interface InsightRequest {
  insightType: string;
  title: string;
  context: Record<string, unknown>;
}

function buildFallback(req: InsightRequest): InsightExplanation {
  return {
    headline: req.title,
    summary: `Here's a closer look at "${req.title}". The numbers below come straight from your tracked Gmail receipts.`,
    tips: ['Compare this with last month to spot trends.', 'Sync more orders to unlock deeper insights.'],
    generated_at: new Date().toISOString(),
  };
}

/**
 * Calls the `explain-insight` Supabase Edge Function which holds the LLM
 * provider API key server-side. Returns an AI-generated explanation for
 * a tapped insight card.
 */
export async function generateInsightExplanation(req: InsightRequest): Promise<InsightExplanation> {
  try {
    const { data, error } = await supabase.functions.invoke('explain-insight', {
      body: req,
    });

    if (error) {
      console.warn('[insight] Edge function error:', error.message);
      return buildFallback(req);
    }

    if (!data?.headline || !data?.summary) {
      return buildFallback(req);
    }

    return {
      headline: String(data.headline),
      summary: String(data.summary),
      tips: Array.isArray(data.tips) ? data.tips.map(String).slice(0, 4) : [],
      generated_at: typeof data.generated_at === 'string' ? data.generated_at : new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[insight] Unexpected error:', err);
    return buildFallback(req);
  }
}
