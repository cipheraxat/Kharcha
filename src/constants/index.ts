import { Platform } from '../types';

// ── Stitch "Finance Analytics Excellence" Design System ──────────────────────
export const COLORS = {
  // Backgrounds — tonal layering (lightest to darkest)
  bg: '#14121b',             // surface / main canvas
  bgSoft: '#0f0d16',         // surface_container_lowest
  surface: '#1c1a24',        // surface_container_low
  surfaceMuted: '#201e28',   // surface_container
  card: '#201e28',           // surface_container
  cardStrong: '#2b2933',     // surface_container_high
  border: '#484555',         // outline_variant — visible card edges
  borderSoft: '#36333e',     // surface_container_highest
  // Brand accent
  accent: '#7C5CFF',         // override primary (same as before)
  accentLight: '#cabeff',    // primary (lavender — on dark surfaces)
  accentWarm: '#ffb780',     // tertiary
  accentMint: '#4FD1A8',     // keep custom success variant
  accentGold: '#F6C562',     // keep for kicker labels
  // Semantic
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#ffb4ab',         // Stitch error color
  // Text hierarchy
  textPrimary: '#e6e0ee',    // on_surface
  textSecondary: '#c9c4d8',  // on_surface_variant
  textMuted: '#938ea1',      // outline
  textDim: '#484555',        // outline_variant
  white: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

// ── Stitch Typography Scale ────────────────────────────────────────────────
export const FONTS = {
  // Display — large hero numbers (Manrope ExtraBold)
  displayLg: 'Manrope_800ExtraBold',
  // Headlines — card titles, screen titles (Manrope SemiBold)
  headlineMd: 'Manrope_600SemiBold',
  // Body — regular prose (Manrope Regular)
  bodyMain: 'Manrope_400Regular',
  bodyStrong: 'Manrope_700Bold',
  // Data — numbers in tables, stats (Inter Medium)
  dataMono: 'Inter_500Medium',
  // Labels — caps/metadata (Inter Bold)
  labelCaps: 'Inter_700Bold',
};

export const SPACING = {
  xs: 4,
  sm: 12,
  md: 24,
  lg: 40,
  xl: 64,
};

export const RADIUS = {
  sm: 8,    // buttons, inputs
  md: 16,   // primary cards
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

// Build a Gmail search query for a specific set of platforms
export function buildGmailSearchQuery(platforms: Platform[]): string {
  if (platforms.length === 0) return '';
  const terms: string[] = [];
  for (const p of platforms) {
    const cfg = PLATFORM_CONFIG[p];
    if (!cfg) continue;
    terms.push(`from:${cfg.senderEmail}`);
    if (cfg.senderEmailAlt) terms.push(`from:${cfg.senderEmailAlt}`);
  }
  return terms.join(' OR ');
}

// Default search query covering all supported platforms
export const GMAIL_SEARCH_QUERY = buildGmailSearchQuery([
  'swiggy', 'zomato', 'blinkit', 'bigbasket', 'zepto',
]);

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
