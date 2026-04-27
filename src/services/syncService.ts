import { supabase } from './supabase';
import { fetchGmailMessageIds, fetchGmailMessage } from './gmail';
import { parseOrderEmail } from './emailParsers';

export interface SyncProgress {
  total: number;
  processed: number;
  inserted: number;
  failed: number;
  done: boolean;
}

type ProgressCallback = (progress: SyncProgress) => void;

export async function syncOrders(
  accessToken: string,
  userId: string,
  onProgress?: ProgressCallback
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    total: 0,
    processed: 0,
    inserted: 0,
    failed: 0,
    done: false,
  };

  const report = () => onProgress?.(progress);

  // 1. Get all message IDs (paginate up to 500)
  let allIds: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const { messageIds, nextPageToken: next } = await fetchGmailMessageIds(
      accessToken,
      200,
      nextPageToken
    );
    allIds = allIds.concat(messageIds);
    nextPageToken = next;
  } while (nextPageToken && allIds.length < 500);

  progress.total = allIds.length;
  report();

  if (allIds.length === 0) {
    progress.done = true;
    report();
    return progress;
  }

  // 2. Fetch IDs that we've already processed (scoped to this batch for performance)
  const { data: existingRows, error: existingErr } = await supabase
    .from('orders')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .in('gmail_message_id', allIds);

  if (existingErr) throw existingErr;

  const existingIds = new Set(
    (existingRows ?? []).map((r: { gmail_message_id: string }) => r.gmail_message_id)
  );

  const newIds = allIds.filter((id) => !existingIds.has(id));
  progress.total = newIds.length;
  report();

  // 3. Process in batches of 10 (rate-limit friendly)
  const BATCH_SIZE = 10;
  for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
    const batch = newIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (msgId) => {
        const msg = await fetchGmailMessage(accessToken, msgId);
        const parsed = parseOrderEmail(msg);
        if (!parsed) return null;

        const { error } = await supabase.from('orders').upsert(
          { ...parsed, user_id: userId },
          { onConflict: 'gmail_message_id' }
        );

        if (error) throw error;
        return parsed;
      })
    );

    for (const r of results) {
      progress.processed++;
      if (r.status === 'fulfilled' && r.value) {
        progress.inserted++;
      } else if (r.status === 'rejected') {
        progress.failed++;
        console.warn('[sync] batch item failed:', r.reason);
      }
    }
    report();
  }

  // 4. Update sync state — increment total processed count in DB
  const { data: prevState } = await supabase
    .from('sync_state')
    .select('emails_processed')
    .eq('user_id', userId)
    .maybeSingle();

  const prevCount = prevState?.emails_processed ?? 0;
  const { error: stateErr } = await supabase.from('sync_state').upsert(
    {
      user_id: userId,
      last_synced_at: new Date().toISOString(),
      emails_processed: prevCount + progress.inserted,
    },
    { onConflict: 'user_id' }
  );

  if (stateErr) {
    console.error('[syncOrders] Failed to persist sync state:', stateErr.message);
  }

  progress.done = true;
  report();
  return progress;
}
