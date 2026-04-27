import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { stats?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { stats } = body;
    if (!stats) {
      return new Response(JSON.stringify({ error: 'Missing stats payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    const model = Deno.env.get('NVIDIA_MODEL') ?? 'deepseek-ai/deepseek-v3';
    const baseUrl = Deno.env.get('NVIDIA_BASE_URL') ?? 'https://integrate.api.nvidia.com/v1';
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          message: "You're doing great tracking your spending! Keep it up. 🎯",
          generated_at: new Date().toISOString().slice(0, 10),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildPrompt(stats);

    const data = await fetchNvidiaCompletionWithRetry({ apiKey, baseUrl, model, prompt });
    const rawContent = data?.choices?.[0]?.message?.content;
    const message =
      (typeof rawContent === 'string' ? rawContent.trim() : '') ||
      "Looks like you've been ordering quite a bit — check the Breakdown tab for details!";

    return new Response(
      JSON.stringify({ message, generated_at: new Date().toISOString().slice(0, 10) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[generate-nudge] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface PlatformEntry { platform: string; total: number; order_count: number }
interface Stats {
  totalSpendThisMonth: number;
  totalSpendLastMonth: number;
  ordersThisMonth: number;
  avgOrderValue: number;
  totalSavings: number;
  totalDeliveryFees: number;
  junkFoodPercent: number;
  spendByPlatform: PlatformEntry[];
  topVendors: { name: string }[];
}

const PLATFORM_LABELS: Record<string, string> = {
  swiggy: 'Swiggy',
  zomato: 'Zomato',
  blinkit: 'Blinkit',
  bigbasket: 'BigBasket',
  zepto: 'Zepto',
};

// Sanitize user-supplied strings before including in the AI prompt.
// Strips newlines (prompt injection vector) and truncates to a safe length.
function sanitizeString(input: unknown, maxLength = 60): string {
  if (typeof input !== 'string') return 'N/A';
  return input.replace(/[\r\n\t]/g, ' ').trim().slice(0, maxLength);
}

interface NvidiaCompletionRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNvidiaCompletionWithRetry({
  apiKey,
  baseUrl,
  model,
  prompt,
}: NvidiaCompletionRequest): Promise<any | null> {
  const maxRetries = Number(Deno.env.get('NVIDIA_MAX_RETRIES') ?? '2');
  const timeoutMs = Number(Deno.env.get('NVIDIA_TIMEOUT_MS') ?? '8000');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 220,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        return await response.json();
      }

      const errText = await response.text();
      const shouldRetry = response.status === 429 || response.status >= 500;
      console.error('[generate-nudge] NVIDIA API error:', response.status, errText);

      if (!shouldRetry || attempt === maxRetries) {
        return null;
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      console.error('[generate-nudge] NVIDIA request failed:', isAbort ? 'timeout' : err);

      if (attempt === maxRetries) {
        return null;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    await sleep(300 * (attempt + 1));
  }

  return null;
}

function buildPrompt(stats: Stats): string {
  const platformSummary = stats.spendByPlatform
    .map((p) => {
      const label = sanitizeString(PLATFORM_LABELS[p.platform] ?? p.platform);
      return `${label}: ₹${Math.round(p.total)} (${p.order_count} orders)`;
    })
    .join(', ');

  const spendChange =
    stats.totalSpendLastMonth > 0
      ? Math.round(
          ((stats.totalSpendThisMonth - stats.totalSpendLastMonth) /
            stats.totalSpendLastMonth) *
            100
        )
      : null;

  const topVendorName = sanitizeString(stats.topVendors[0]?.name);

  return `You are a friendly personal finance coach for an Indian user who orders food and groceries online.

Here is their spending data:
- This month's spend: ₹${Math.round(stats.totalSpendThisMonth)}
- Last month's spend: ₹${Math.round(stats.totalSpendLastMonth)}
- Month-over-month change: ${spendChange !== null ? `${spendChange > 0 ? '+' : ''}${spendChange}%` : 'N/A'}
- Orders this month: ${stats.ordersThisMonth}
- Average order value: ₹${Math.round(stats.avgOrderValue)}
- Platform breakdown: ${platformSummary || 'No data yet'}
- Total savings from discounts: ₹${Math.round(stats.totalSavings)}
- Total delivery fees paid: ₹${Math.round(stats.totalDeliveryFees)}
- Top vendor: ${topVendorName}
- Junk food orders: ${stats.junkFoodPercent}% of food orders

Generate ONE short, personalized, actionable insight (2-3 sentences max). 
- Be specific with rupee amounts when available
- Be warm and non-judgmental
- Offer a concrete small tip or observation
- Use emojis sparingly (1 max)
- Do NOT start with "Hi" or "Hello"
- Respond ONLY with the insight text, nothing else`;
}
