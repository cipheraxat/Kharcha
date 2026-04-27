-- Migration: 001_initial_schema.sql
-- Run this in Supabase SQL Editor

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gmail_message_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('swiggy', 'zomato', 'blinkit', 'bigbasket', 'zepto')),
  order_date TIMESTAMPTZ NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  restaurant_or_store TEXT,
  items JSONB,
  category TEXT NOT NULL CHECK (category IN ('food', 'grocery')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON public.orders(platform);
CREATE INDEX IF NOT EXISTS idx_orders_user_date ON public.orders(user_id, order_date DESC);

-- Sync state table
CREATE TABLE IF NOT EXISTS public.sync_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMPTZ,
  emails_processed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see and modify their own data
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON public.orders FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync state"
  ON public.sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own sync state"
  ON public.sync_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
