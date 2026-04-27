# Kharcha

Kharcha is an Expo + React Native app that turns Gmail order receipts into a personal spending dashboard for food and grocery delivery.

It connects to Gmail with read-only access, parses order emails from Swiggy, Zomato, Blinkit, BigBasket, and Zepto, stores normalized orders in Supabase, and shows insights across spending, habits, savings, and AI-generated nudges.

## What It Does

- Sign in with Google through Supabase Auth
- Read Gmail order receipts with Gmail read-only scope
- Extract orders from supported delivery platforms
- Store and query order history in Supabase
- Show overview, breakdown, patterns, savings, and profile screens
- Generate short personalized nudges through a Supabase Edge Function backed by NVIDIA-hosted models

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- React Navigation
- Zustand
- Supabase Auth, Database, and Edge Functions
- Gmail API

## Supported Platforms

- Swiggy
- Zomato
- Blinkit
- BigBasket
- Zepto

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create local env file

Copy `.env.example` to `.env.local` and fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`

Important:

- Never commit `.env.local`
- Never put server-side secrets in `EXPO_PUBLIC_*` variables

### 3. Configure Supabase

Apply the migration in `supabase/migrations/001_initial_schema.sql` to create:

- `orders`
- `sync_state`

Deploy the `generate-nudge` edge function and set secrets such as:

- `NVIDIA_API_KEY`
- `NVIDIA_MODEL`
- `NVIDIA_BASE_URL`
- `NVIDIA_TIMEOUT_MS`
- `NVIDIA_MAX_RETRIES`

### 4. Configure Google OAuth

Create Google OAuth clients for:

- Web
- iOS
- Android

Enable Gmail API and make sure the Supabase Google provider is configured correctly.

### 5. Run the app

```bash
npm run start
```

Useful commands:

```bash
npm run android
npm run ios
npm run web
```

## Project Structure

```text
src/
  components/
  constants/
  navigation/
  screens/
  services/
  store/
  types/
  utils/
supabase/
  functions/
  migrations/
```

## Key Flows

### Authentication

- The app uses Supabase OAuth with Google
- Sessions are persisted with Expo SecureStore
- Gmail access tokens are reused for sync

### Sync

- Gmail messages are fetched with a targeted query
- Supported receipt emails are parsed into structured orders
- Orders are upserted into Supabase
- Dashboard analytics are recomputed after sync

### Insights

- Overview for monthly spend and top vendors
- Breakdown for platform and category-level analytics
- Patterns for timing and habit signals
- Savings for discounts and delivery-fee visibility
- AI nudges generated server-side

## Validation

```bash
npx tsc --noEmit
```

## Notes

- `.env.local` is intentionally ignored
- `supabase/.temp/` is local CLI state and is also ignored
- The app is designed for Expo development workflows first

## Repository

GitHub: https://github.com/cipheraxat/Kharcha