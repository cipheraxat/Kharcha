import { supabase } from './supabase';
import { Order, DashboardStats, Platform, SpendByPlatform, MonthlySpend, TopVendor, HeatmapCell } from '../types';
import { JUNK_FOOD_KEYWORDS } from '../constants';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function fetchAllOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function computeDashboardStats(orders: Order[]): DashboardStats {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Parse dates once up-front to avoid repeated construction in every filter/loop
  const ordersWithDate = orders.map((o) => ({ ...o, _date: new Date(o.order_date) }));

  const thisMonthOrders = ordersWithDate.filter((o) => o._date >= thisMonthStart);
  const lastMonthOrders = ordersWithDate.filter(
    (o) => o._date >= lastMonthStart && o._date <= lastMonthEnd
  );

  const sum = (arr: Order[]) =>
    arr.reduce((acc, o) => acc + o.total_amount, 0);

  const totalSpendThisMonth = sum(thisMonthOrders);
  const totalSpendLastMonth = sum(lastMonthOrders);
  const ordersThisMonth = thisMonthOrders.length;
  const avgOrderValue =
    orders.length > 0
      ? orders.reduce((acc, o) => acc + o.total_amount, 0) / orders.length
      : 0;

  // Spend by platform
  const platformMap: Record<string, { total: number; count: number }> = {};
  for (const o of orders) {
    if (!platformMap[o.platform]) {
      platformMap[o.platform] = { total: 0, count: 0 };
    }
    platformMap[o.platform].total += o.total_amount;
    platformMap[o.platform].count++;
  }
  const spendByPlatform: SpendByPlatform[] = Object.entries(platformMap)
    .map(([platform, v]) => ({
      platform: platform as Platform,
      total: v.total,
      order_count: v.count,
    }))
    .sort((a, b) => b.total - a.total);

  const topPlatform = spendByPlatform[0]?.platform ?? null;

  // Monthly spend (last 6 months) — reuse pre-parsed dates
  const monthlySpend: MonthlySpend[] = [];
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(now, i);
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const mOrders = ordersWithDate.filter((o) => o._date >= mStart && o._date <= mEnd);
    monthlySpend.push({
      month: format(month, 'MMM yy'),
      total: sum(mOrders),
      food: sum(mOrders.filter((o) => o.category === 'food')),
      grocery: sum(mOrders.filter((o) => o.category === 'grocery')),
    });
  }

  // Top vendors — key on name__platform to avoid merging same-named restaurants across platforms
  const vendorMap: Record<string, { name: string; total: number; count: number; platform: Platform }> = {};
  for (const o of ordersWithDate) {
    const name = o.restaurant_or_store ?? 'Unknown';
    const key = `${name}__${o.platform}`;
    if (!vendorMap[key]) {
      vendorMap[key] = { name, total: 0, count: 0, platform: o.platform };
    }
    vendorMap[key].total += o.total_amount;
    vendorMap[key].count++;
  }
  const topVendors: TopVendor[] = Object.values(vendorMap)
    .map((v) => ({
      name: v.name,
      total: v.total,
      order_count: v.count,
      platform: v.platform,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Heatmap (day x hour) — reuse pre-parsed dates
  const heatmapMap: Record<string, number> = {};
  for (const o of ordersWithDate) {
    const key = `${o._date.getDay()}-${o._date.getHours()}`;
    heatmapMap[key] = (heatmapMap[key] ?? 0) + 1;
  }
  const heatmap: HeatmapCell[] = Object.entries(heatmapMap).map(([k, count]) => {
    const [day, hour] = k.split('-').map(Number);
    return { day, hour, count };
  });

  // Junk food %
  const foodOrders = ordersWithDate.filter((o) => o.category === 'food');
  const junkCount = foodOrders.filter((o) => {
    const name = (o.restaurant_or_store ?? '').toLowerCase();
    return JUNK_FOOD_KEYWORDS.some((kw) => name.includes(kw));
  }).length;
  const junkFoodPercent =
    foodOrders.length > 0 ? Math.round((junkCount / foodOrders.length) * 100) : 0;

  // Savings
  const totalSavings = orders.reduce((acc, o) => acc + (o.discount_amount ?? 0), 0);
  const totalDeliveryFees = orders.reduce((acc, o) => acc + (o.delivery_fee ?? 0), 0);

  return {
    totalSpendThisMonth,
    totalSpendLastMonth,
    ordersThisMonth,
    avgOrderValue,
    topPlatform,
    totalSavings,
    totalDeliveryFees,
    spendByPlatform,
    monthlySpend,
    topVendors,
    heatmap,
    junkFoodPercent,
  };
}
