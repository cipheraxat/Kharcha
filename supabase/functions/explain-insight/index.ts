import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsightPayload {
  insightType: string;
  title: string;
  context: Record<string, unknown>;
}

interface InsightResponse {
  headline: string;
  summary: string;
  tips: string[];
  generated_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body: Partial<InsightPayload>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const insightType = sanitizeString(body.insightType, 60);
    const title = sanitizeString(body.title, 80);
    const context = (body.context && typeof body.context === 'object') ? body.context : {};

    if (!insightType || !title) {
      return jsonResponse({ error: 'Missing insightType or title' }, 400);
    }

    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    if (!apiKey) {
      return jsonResponse(buildFallback(title, context), 200);
    }

    const model = Deno.env.get('NVIDIA_MODEL') ?? 'deepseek-ai/deepseek-v3';
    const baseUrl = Deno.env.get('NVIDIA_BASE_URL') ?? 'https://integrate.api.nvidia.com/v1';
    const prompt = buildPrompt(insightType, title, context);

    const data = await fetchNvidiaCompletionWithRetry({ apiKey, baseUrl, model, prompt });
    const rawContent = data?.choices?.[0]?.message?.content;
    const parsed = parseAIResponse(typeof rawContent === 'string' ? rawContent : '');

    if (!parsed) {
      return jsonResponse(buildFallback(title, context), 200);
    }

    return jsonResponse({
      ...parsed,
      generated_at: new Date().toISOString(),
    }, 200);
  } catch (err) {
    console.error('[explain-insight] Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sanitizeString(input: unknown, maxLength = 80): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\r\n\t]/g, ' ').trim().slice(0, maxLength);
}

function formatContext(context: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(context)) {
    if (lines.length >= 20) break;
    const k = sanitizeString(key, 40);
    let v: string;
    if (value === null || value === undefined) {
      v = 'N/A';
    } else if (typeof value === 'number') {
      v = String(value);
    } else if (typeof value === 'string') {
      v = sanitizeString(value, 120);
    } else if (Array.isArray(value)) {
      v = value.slice(0, 5).map((x) => sanitizeString(String(x), 60)).join(', ');
    } else {
      v = sanitizeString(JSON.stringify(value), 200);
    }
    if (k) lines.push(`- ${k}: ${v}`);
  }
  return lines.join('\n');
}

function buildPrompt(insightType: string, title: string, context: Record<string, unknown>): string {
  const ctx = formatContext(context);
  return `You are a friendly, sharp personal-finance coach for an Indian user who orders food and groceries online via Swiggy, Zomato, Blinkit, BigBasket, and Zepto.

The user just tapped on a dashboard insight to learn more about it.

Insight type: ${insightType}
Insight title: ${title}
Underlying data:
${ctx || '(no extra data)'}

Respond with a JSON object EXACTLY matching this shape (no markdown, no commentary, no code fences):
{
  "headline": "one short punchy line (max 8 words) summarising the takeaway",
  "summary": "2-3 sentences explaining what this number means and why it matters. Be specific with rupee amounts. Warm, non-judgmental tone.",
  "tips": ["actionable tip 1 (max 14 words)", "actionable tip 2 (max 14 words)", "actionable tip 3 (max 14 words)"]
}

Rules:
- Output ONLY the JSON object, nothing else.
- Use ₹ for rupee amounts.
- Keep tips concrete (e.g. "Cap weekday Swiggy orders to 2/week").
- No emojis in headline. At most 1 emoji per tip.
- Do not invent numbers that aren't in the data.`;
}

function parseAIResponse(raw: string): { headline: string; summary: string; tips: string[] } | null {
  if (!raw) return null;
  // Strip code fences if present
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find first { ... } block
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    const headline = sanitizeString(obj.headline, 100);
    const summary = typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 600) : '';
    const tipsRaw = Array.isArray(obj.tips) ? obj.tips : [];
    const tips = tipsRaw
      .map((t: unknown) => (typeof t === 'string' ? t.trim().slice(0, 140) : ''))
      .filter((t: string) => t.length > 0)
      .slice(0, 4);
    if (!headline || !summary) return null;
    return { headline, summary, tips };
  } catch {
    return null;
  }
}

function buildFallback(title: string, context: Record<string, unknown>): InsightResponse {
  const keys = Object.keys(context).slice(0, 3);
  return {
    headline: title,
    summary: `Here's a closer look at "${title}". The numbers below are pulled directly from your tracked Gmail receipts.`,
    tips: keys.length > 0
      ? ['Review the underlying numbers below.', 'Compare with last month to spot trends.']
      : ['Sync more orders to unlock deeper insights.'],
    generated_at: new Date().toISOString(),
  };
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
  const timeoutMs = Number(Deno.env.get('NVIDIA_TIMEOUT_MS') ?? '10000');

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
          max_tokens: 400,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        return await response.json();
      }

      const errText = await response.text();
      const shouldRetry = response.status === 429 || response.status >= 500;
      console.error('[explain-insight] NVIDIA API error:', response.status, errText);

      if (!shouldRetry || attempt === maxRetries) return null;
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      console.error('[explain-insight] NVIDIA request failed:', isAbort ? 'timeout' : err);
      if (attempt === maxRetries) return null;
    } finally {
      clearTimeout(timeoutId);
    }

    await sleep(300 * (attempt + 1));
  }

  return null;
}
