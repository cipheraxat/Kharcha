export type Platform = 'swiggy' | 'zomato' | 'blinkit' | 'bigbasket' | 'zepto';

export interface GmailAccount {
  email: string;
  accessToken: string;
  authRefreshToken?: string;
  /** Which platforms this account's inbox is searched for */
  assignedPlatforms: Platform[];
  /** True for the account used to sign in to Supabase */
  isPrimary: boolean;
}
export type Category = 'food' | 'grocery';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  gmail_message_id: string;
  platform: Platform;
  order_date: string; // ISO string
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  restaurant_or_store: string | null;
  items: OrderItem[] | null;
  category: Category;
  created_at: string;
}

export interface SyncState {
  user_id: string;
  last_synced_at: string | null;
  emails_processed: number;
}

export interface SpendByPlatform {
  platform: Platform;
  total: number;
  order_count: number;
}

export interface MonthlySpend {
  month: string; // e.g. "Jan 25"
  total: number;
  food: number;
  grocery: number;
}

export interface TopVendor {
  name: string;
  total: number;
  order_count: number;
  platform: Platform;
}

export interface HeatmapCell {
  day: number;   // 0 = Sun, 6 = Sat
  hour: number;  // 0-23
  count: number;
}

export interface DashboardStats {
  totalSpendThisMonth: number;
  totalSpendLastMonth: number;
  ordersThisMonth: number;
  avgOrderValue: number;
  topPlatform: Platform | null;
  totalSavings: number;
  totalDeliveryFees: number;
  spendByPlatform: SpendByPlatform[];
  monthlySpend: MonthlySpend[];
  topVendors: TopVendor[];
  heatmap: HeatmapCell[];
  junkFoodPercent: number;
}

export interface NudgeData {
  message: string;
  generated_at: string; // ISO date string (day-level)
}
