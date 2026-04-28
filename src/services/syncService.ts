import { supabase } from './supabase';
import { fetchGmailMessageIds, fetchGmailMessage, isGmailUnauthorizedError } from './gmail';
import { parseOrderEmail } from './emailParsers';
import { GmailAccount, Platform } from '../types';
import { buildGmailSearchQuery, SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants';
import { createClient } from '@supabase/supabase-js';

export interface SyncProgress {
  total: number;
  processed: number;
  inserted: number;
  failed: number;
  expiredAccounts: string[];
  done: boolean;
}

type ProgressCallback = (progress: SyncProgress) => void;

interface SyncOptions {
  onAccountTokenRefresh?: (email: string, accessToken: string, authRefreshToken?: string) => void;
}

interface MessageCandidate {
  accountEmail: string;
  accessToken: string;
  assignedPlatforms: Platform[];
  messageId: string;
  storedMessageId: string;
}

const EXISTING_ID_PAGE_SIZE = 1000;

function getStoredMessageId(account: GmailAccount, messageId: string): string {
  return account.isPrimary ? messageId : `${account.email}:${messageId}`;
}

async function fetchExistingMessageIds(userId: string): Promise<Set<string>> {
  const existingIds = new Set<string>();
  let from = 0;

  while (true) {
    const to = from + EXISTING_ID_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('orders')
      .select('gmail_message_id')
      .eq('user_id', userId)
      .range(from, to);

    if (error) throw error;

    for (const row of data ?? []) {
      existingIds.add((row as { gmail_message_id: string }).gmail_message_id);
    }

    if (!data || data.length < EXISTING_ID_PAGE_SIZE) break;
    from += EXISTING_ID_PAGE_SIZE;
  }

  return existingIds;
}

async function refreshAccountToken(account: GmailAccount): Promise<string | null> {
  if (!account.authRefreshToken) return null;

  const refreshClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await refreshClient.auth.refreshSession({
    refresh_token: account.authRefreshToken,
  });

  if (error || !data.session?.provider_token) {
    console.warn(`[sync] Could not refresh Gmail token for ${account.email}:`, error?.message);
    return null;
  }

  account.accessToken = data.session.provider_token;
  account.authRefreshToken = data.session.refresh_token;
  return data.session.provider_token;
}

/**
 * Sync orders for all connected Gmail accounts.
 * Each account is searched only for its assigned platforms.
 */
export async function syncOrders(
  gmailAccounts: GmailAccount[],
  userId: string,
  onProgress?: ProgressCallback,
  options?: SyncOptions
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    total: 0,
    processed: 0,
    inserted: 0,
    failed: 0,
    expiredAccounts: [],
    done: false,
  };

  const report = () => onProgress?.(progress);

  // Filter to accounts that have assigned platforms and a token
  const activeAccounts = gmailAccounts.filter(
    (a) => a.accessToken && a.assignedPlatforms.length > 0
  );

  if (activeAccounts.length === 0) {
    progress.done = true;
    report();
    return progress;
  }

  // Collect message IDs per account. Gmail IDs are only unique within a single
  // mailbox, so keep the account attached all the way through processing.
  const candidates: MessageCandidate[] = [];
  const candidateKeys = new Set<string>();

  for (const account of activeAccounts) {
    const query = buildGmailSearchQuery(account.assignedPlatforms);
    let nextPageToken: string | undefined;
    let accountIds: string[] = [];
    let accessToken = account.accessToken;

    try {
      do {
        const { messageIds, nextPageToken: next } = await fetchGmailMessageIds(
          accessToken,
          200,
          nextPageToken,
          query
        );
        accountIds = accountIds.concat(messageIds);
        nextPageToken = next;
      } while (nextPageToken && accountIds.length < 500);
    } catch (error) {
      if (isGmailUnauthorizedError(error)) {
        const refreshedToken = await refreshAccountToken(account);
        if (!refreshedToken) {
          progress.failed++;
          progress.expiredAccounts.push(account.email);
          console.warn(`[sync] Gmail token expired or invalid for ${account.email}`);
          report();
          continue;
        }

        options?.onAccountTokenRefresh?.(
          account.email,
          refreshedToken,
          account.authRefreshToken
        );

        accessToken = refreshedToken;
        nextPageToken = undefined;
        accountIds = [];

        try {
          do {
            const { messageIds, nextPageToken: next } = await fetchGmailMessageIds(
              accessToken,
              200,
              nextPageToken,
              query
            );
            accountIds = accountIds.concat(messageIds);
            nextPageToken = next;
          } while (nextPageToken && accountIds.length < 500);
        } catch (retryError) {
          if (isGmailUnauthorizedError(retryError)) {
            progress.failed++;
            progress.expiredAccounts.push(account.email);
            console.warn(`[sync] Refreshed Gmail token still failed for ${account.email}`);
            report();
            continue;
          }
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    for (const messageId of accountIds) {
      const key = `${account.email}:${messageId}`;
      if (candidateKeys.has(key)) continue;
      candidateKeys.add(key);
      candidates.push({
        accountEmail: account.email,
        accessToken,
        assignedPlatforms: account.assignedPlatforms,
        messageId,
        storedMessageId: getStoredMessageId(account, messageId),
      });
    }
  }

  progress.total = candidates.length;
  report();

  if (candidates.length === 0) {
    progress.done = true;
    report();
    return progress;
  }

  const existingIds = await fetchExistingMessageIds(userId);

  const newCandidates = candidates.filter((candidate) => !existingIds.has(candidate.storedMessageId));
  progress.total = newCandidates.length;
  report();

  // Process new messages in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < newCandidates.length; i += BATCH_SIZE) {
    const batch = newCandidates.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (candidate) => {
        let msg;
        try {
          msg = await fetchGmailMessage(candidate.accessToken, candidate.messageId);
        } catch (error) {
          if (isGmailUnauthorizedError(error)) {
            progress.expiredAccounts.push(candidate.accountEmail);
          }
          throw error;
        }
        const parsed = parseOrderEmail(msg);
        if (!parsed) return null;
        if (!candidate.assignedPlatforms.includes(parsed.platform)) return null;

        const { error } = await supabase.from('orders').upsert(
          { ...parsed, gmail_message_id: candidate.storedMessageId, user_id: userId },
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

  // Update sync_state in DB
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
