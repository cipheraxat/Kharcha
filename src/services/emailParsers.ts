/**
 * Email parsers for each food/grocery delivery platform.
 * Each parser receives the plain-text and HTML body + message metadata,
 * and returns structured order data.
 */

import { Platform, Category, OrderItem } from '../types';
import { RawGmailMessage, extractEmailBody, getHeader } from './gmail';

export interface ParsedOrder {
  gmail_message_id: string;
  platform: Platform;
  order_date: string; // ISO string
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  restaurant_or_store: string | null;
  items: OrderItem[] | null;
  category: Category;
}

// Helper: parse ₹ amount strings like "₹234.00" or "Rs. 234"
function parseAmount(str: string): number {
  const match = str.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/,/g, ''));
}

// Helper: safely parse Gmail internalDate (ms since epoch as string) to ISO string
function parseDateFromInternalDate(internalDate: string): string {
  const ts = parseInt(internalDate, 10);
  if (isNaN(ts)) {
    console.warn('[emailParsers] Missing or invalid internalDate, using current time');
    return new Date().toISOString();
  }
  return new Date(ts).toISOString();
}

// Helper: strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── SWIGGY ─────────────────────────────────────────────────────────────────
function parseSwiggy(
  text: string,
  html: string,
  msg: RawGmailMessage
): Omit<ParsedOrder, 'gmail_message_id'> | null {
  const body = text || stripHtml(html);

  // Swiggy subject: "Your order from <Restaurant> is confirmed"
  const subject = getHeader(msg, 'subject');
  const restaurantMatch = subject.match(/order from (.+?) is/i) ||
    body.match(/order from (.+?) is confirmed/i) ||
    body.match(/You ordered from\s+(.+?)[\r\n]/i);
  const restaurant = restaurantMatch ? restaurantMatch[1].trim() : null;

  // Total amount — negative lookbehind prevents matching "Sub-Total", "Net-Total", etc.
  const totalMatch =
    body.match(/(?:Order Total|Total Amount|Bill Total)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/(?:Grand Total)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/(?<![-\w])Total[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  if (!totalMatch) return null;
  const total = parseAmount(totalMatch[1]);
  if (total <= 0) return null;

  // Delivery fee
  const deliveryMatch = body.match(/Delivery(?:\s+Fee)?[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const deliveryFee = deliveryMatch ? parseAmount(deliveryMatch[1]) : 0;

  // Discount
  const discountMatch = body.match(/(?:Discount|Savings|You saved)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const discount = discountMatch ? parseAmount(discountMatch[1]) : 0;

  return {
    platform: 'swiggy',
    order_date: parseDateFromInternalDate(msg.internalDate),
    total_amount: total,
    delivery_fee: deliveryFee,
    discount_amount: discount,
    restaurant_or_store: restaurant,
    items: null, // TODO: item-level parsing not yet implemented
    category: 'food',
  };
}

// ─── ZOMATO ──────────────────────────────────────────────────────────────────
function parseZomato(
  text: string,
  html: string,
  msg: RawGmailMessage
): Omit<ParsedOrder, 'gmail_message_id'> | null {
  const body = text || stripHtml(html);

  const subject = getHeader(msg, 'subject');
  const restaurantMatch = subject.match(/order (?:from|at) (.+)/i) ||
    body.match(/From\s+(.+?)[\r\n]/i) ||
    body.match(/ordered from\s+(.+?)[\r\n,]/i);
  const restaurant = restaurantMatch ? restaurantMatch[1].trim() : null;

  // Total amount — negative lookbehind prevents matching "Sub-Total", "Net-Total", etc.
  const totalMatch =
    body.match(/(?:Bill Total|Order Total|Total Bill|Total Amount)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/(?<![-\w])Total[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  if (!totalMatch) return null;
  const total = parseAmount(totalMatch[1]);
  if (total <= 0) return null;

  const deliveryMatch = body.match(/Delivery charge[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const deliveryFee = deliveryMatch ? parseAmount(deliveryMatch[1]) : 0;

  const discountMatch = body.match(/(?:Discount|Promo|Coupon|You saved)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const discount = discountMatch ? parseAmount(discountMatch[1]) : 0;

  return {
    platform: 'zomato',
    order_date: parseDateFromInternalDate(msg.internalDate),
    total_amount: total,
    delivery_fee: deliveryFee,
    discount_amount: discount,
    restaurant_or_store: restaurant,
    items: null, // TODO: item-level parsing not yet implemented
    category: 'food',
  };
}

// ─── BLINKIT ─────────────────────────────────────────────────────────────────
function parseBlinkit(
  text: string,
  html: string,
  msg: RawGmailMessage
): Omit<ParsedOrder, 'gmail_message_id'> | null {
  const body = text || stripHtml(html);

  const totalMatch = body.match(/(?:Order Total|Total Amount)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/(?<![-\w])Total[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  if (!totalMatch) return null;
  const total = parseAmount(totalMatch[1]);
  if (total <= 0) return null;

  const deliveryMatch = body.match(/Delivery[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const deliveryFee = deliveryMatch ? parseAmount(deliveryMatch[1]) : 0;

  const discountMatch = body.match(/(?:Discount|You saved)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const discount = discountMatch ? parseAmount(discountMatch[1]) : 0;

  // Blinkit is always grocery
  return {
    platform: 'blinkit',
    order_date: parseDateFromInternalDate(msg.internalDate),
    total_amount: total,
    delivery_fee: deliveryFee,
    discount_amount: discount,
    restaurant_or_store: 'Blinkit',
    items: null, // TODO: item-level parsing not yet implemented
    category: 'grocery',
  };
}

// ─── BIGBASKET ───────────────────────────────────────────────────────────────
function parseBigBasket(
  text: string,
  html: string,
  msg: RawGmailMessage
): Omit<ParsedOrder, 'gmail_message_id'> | null {
  const body = text || stripHtml(html);

  const totalMatch = body.match(/(?:Order Value|Total Amount|Grand Total)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/(?<![-\w])Total[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  if (!totalMatch) return null;
  const total = parseAmount(totalMatch[1]);
  if (total <= 0) return null;

  const deliveryMatch = body.match(/(?:Delivery Charges?|Shipping)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const deliveryFee = deliveryMatch ? parseAmount(deliveryMatch[1]) : 0;

  const discountMatch = body.match(/(?:Discount|Savings?|You saved)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const discount = discountMatch ? parseAmount(discountMatch[1]) : 0;

  return {
    platform: 'bigbasket',
    order_date: parseDateFromInternalDate(msg.internalDate),
    total_amount: total,
    delivery_fee: deliveryFee,
    discount_amount: discount,
    restaurant_or_store: 'BigBasket',
    items: null, // TODO: item-level parsing not yet implemented
    category: 'grocery',
  };
}

// ─── ZEPTO ───────────────────────────────────────────────────────────────────
function parseZepto(
  text: string,
  html: string,
  msg: RawGmailMessage
): Omit<ParsedOrder, 'gmail_message_id'> | null {
  const body = text || stripHtml(html);

  const totalMatch = body.match(/(?:Order Total|Total Amount)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/(?<![-\w])Total[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  if (!totalMatch) return null;
  const total = parseAmount(totalMatch[1]);
  if (total <= 0) return null;

  const deliveryMatch = body.match(/Delivery[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const deliveryFee = deliveryMatch ? parseAmount(deliveryMatch[1]) : 0;

  const discountMatch = body.match(/(?:Discount|You saved)[^\d₹Rs]*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)/i);
  const discount = discountMatch ? parseAmount(discountMatch[1]) : 0;

  return {
    platform: 'zepto',
    order_date: parseDateFromInternalDate(msg.internalDate),
    total_amount: total,
    delivery_fee: deliveryFee,
    discount_amount: discount,
    restaurant_or_store: 'Zepto',
    items: null, // TODO: item-level parsing not yet implemented
    category: 'grocery',
  };
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────
export function parseOrderEmail(msg: RawGmailMessage): ParsedOrder | null {
  try {
    const { text, html } = extractEmailBody(msg);
    const fromHeader = getHeader(msg, 'from').toLowerCase();

    let result: Omit<ParsedOrder, 'gmail_message_id'> | null = null;

    if (fromHeader.includes('swiggy')) {
      result = parseSwiggy(text, html, msg);
    } else if (fromHeader.includes('zomato')) {
      result = parseZomato(text, html, msg);
    } else if (fromHeader.includes('blinkit')) {
      result = parseBlinkit(text, html, msg);
    } else if (fromHeader.includes('bigbasket')) {
      result = parseBigBasket(text, html, msg);
    } else if (fromHeader.includes('zepto')) {
      result = parseZepto(text, html, msg);
    }

    if (!result) return null;

    return { ...result, gmail_message_id: msg.id };
  } catch (err) {
    console.warn(`[parseOrderEmail] Failed for message ${msg.id}:`, err);
    return null;
  }
}
