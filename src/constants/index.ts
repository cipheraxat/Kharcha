import { Platform } from '../types';

export const COLORS = {
  bg: '#0B1020',
  bgSoft: '#11182B',
  surface: '#171F35',
  surfaceMuted: '#202A44',
  card: '#1A2338',
  cardStrong: '#202B45',
  border: '#2A3657',
  borderSoft: '#36456D',
  accent: '#7C5CFF',
  accentLight: '#A792FF',
  accentWarm: '#FF8E5E',
  accentMint: '#4FD1A8',
  accentGold: '#F6C562',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  textPrimary: '#F8FAFC',
  textSecondary: '#B2BED6',
  textMuted: '#71809F',
  textDim: '#5A6784',
  white: '#FFFFFF',
  shadow: 'rgba(6, 10, 18, 0.32)',
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
};

export const PLATFORM_CONFIG: Record<Platform, {
  label: string;
  color: string;
  emoji: string;
  senderEmail: string;
  senderEmailAlt?: string;
}> = {
  swiggy: {
    label: 'Swiggy',
    color: '#FF6600',
    emoji: '🧡',
    senderEmail: 'noreply@swiggy.in',
    senderEmailAlt: 'no-reply@swiggy.in',
  },
  zomato: {
    label: 'Zomato',
    color: '#E23744',
    emoji: '❤️',
    senderEmail: 'noreply@zomato.com',
    senderEmailAlt: 'no-reply@zomato.com',
  },
  blinkit: {
    label: 'Blinkit',
    color: '#F7C948',
    emoji: '💛',
    senderEmail: 'noreply@blinkit.com',
    senderEmailAlt: 'orders@blinkit.com',
  },
  bigbasket: {
    label: 'BigBasket',
    color: '#84B944',
    emoji: '🛒',
    senderEmail: 'orders@bigbasket.com',
    senderEmailAlt: 'noreply@bigbasket.com',
  },
  zepto: {
    label: 'Zepto',
    color: '#8B5CF6',
    emoji: '💜',
    senderEmail: 'orders@zepto.co',
    senderEmailAlt: 'noreply@zepto.co',
  },
};

// Gmail search query to find all order emails from supported platforms
export const GMAIL_SEARCH_QUERY = [
  'from:noreply@swiggy.in',
  'from:no-reply@swiggy.in',
  'from:noreply@zomato.com',
  'from:no-reply@zomato.com',
  'from:noreply@blinkit.com',
  'from:orders@blinkit.com',
  'from:orders@bigbasket.com',
  'from:noreply@bigbasket.com',
  'from:orders@zepto.co',
  'from:noreply@zepto.co',
].join(' OR ');

export const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
export const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';
export const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? '';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Intentionally tight — only unambiguous junk/fast-food items to avoid false positives
// (e.g. paneer, sandwich, pasta are also everyday healthy meals)
export const JUNK_FOOD_KEYWORDS = [
  'pizza', 'burger', 'fried chicken', 'fries', 'wings', 'nuggets',
  'momos', 'maggi', 'shawarma', 'ice cream', 'waffle', 'donut',
  'cold coffee', 'shake', 'pav bhaji', 'bhel puri', 'chaat',
];
