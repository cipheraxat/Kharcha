import { GMAIL_SEARCH_QUERY } from '../constants';

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface RawGmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body: { data?: string; size: number };
    parts?: GmailPart[];
    mimeType: string;
  };
  internalDate: string; // ms since epoch as string
}

interface GmailPart {
  mimeType: string;
  body: { data?: string; size: number };
  parts?: GmailPart[];
}

// Fetch list of matching message IDs
export async function fetchGmailMessageIds(
  accessToken: string,
  maxResults = 200,
  pageToken?: string
): Promise<{ messageIds: string[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    q: GMAIL_SEARCH_QUERY,
    maxResults: String(maxResults),
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(`${GMAIL_BASE}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail list error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    messageIds: (data.messages ?? []).map((m: { id: string }) => m.id),
    nextPageToken: data.nextPageToken,
  };
}

// Fetch a single full message
export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<RawGmailMessage> {
  const res = await fetch(`${GMAIL_BASE}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail fetch error ${res.status} for message ${messageId}`);
  }

  return res.json();
}

// Decode base64url to plain text
export function decodeBase64Url(encoded: string): string {
  // Gmail uses base64url encoding (replace - with + and _ with /)
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (err) {
    console.warn('[gmail] decodeBase64Url failed:', err);
    return '';
  }
}

// Extract plain text or HTML body from a message
export function extractEmailBody(msg: RawGmailMessage): {
  text: string;
  html: string;
} {
  let text = '';
  let html = '';

  function walkParts(parts?: GmailPart[]): void {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        text += decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body.data) {
        html += decodeBase64Url(part.body.data);
      } else if (part.parts) {
        walkParts(part.parts);
      }
    }
  }

  if (msg.payload.parts) {
    walkParts(msg.payload.parts);
  } else if (msg.payload.body.data) {
    const decoded = decodeBase64Url(msg.payload.body.data);
    if (msg.payload.mimeType === 'text/html') {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  return { text, html };
}

// Get header value by name
export function getHeader(msg: RawGmailMessage, name: string): string {
  return (
    msg.payload.headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    )?.value ?? ''
  );
}
