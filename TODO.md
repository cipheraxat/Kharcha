# Kharcha TODO

This file tracks the most practical next feature to ship and the immediate follow-up work.

## Next Feature To Ship

### Multi-source order aggregation with confidence states

Gmail-only ingestion is not enough because some platforms, especially Zomato, do not consistently produce parseable receipt emails. The next feature should make Kharcha work even when email coverage is incomplete.

## Goal

Combine multiple user signals into one spending view:

- Gmail receipts when available
- Manual transaction entry or correction
- A review queue for detected but unconfirmed transactions

This should be built in a way that later supports:

- Android SMS parsing
- CSV import from bank or UPI statements
- Better cross-source matching

## V1 Scope

### 1. Introduce source-aware transaction records

Add a canonical record model that stores:

- source: `gmail`, `manual`, `sms`, `csv`
- confidence: `confirmed`, `detected`, `needs_review`
- merchant or platform guess
- amount
- timestamp
- optional linked order id

### 2. Add manual transaction capture

Let users add a missing order manually with:

- platform
- restaurant or store
- amount
- category: food or grocery
- date
- optional notes

### 3. Add a review queue UI

Create a lightweight screen for items that are detected but not fully classified.

Users should be able to:

- confirm a platform
- edit merchant name
- mark as irrelevant
- convert a detected transaction into a confirmed order

### 4. Update analytics to work on partial confidence

Dashboard logic should distinguish:

- confirmed spend
- detected spend
- needs review

The UI should never imply full precision when the source is incomplete.

## Why This First

- It solves the actual product gap without waiting for hard integrations
- It improves coverage for Zomato immediately
- It creates the right data model for SMS and CSV ingestion later
- It keeps privacy and permissions simpler than jumping straight to SMS access

## Suggested Implementation Plan

### Backend and data model

- Add a new table for normalized transactions or ingestion events
- Keep `orders` for high-confidence structured records
- Add fields needed for source and confidence tracking
- Link reviewable events to confirmed orders when resolved

### Frontend

- Add a `Review` screen to the app navigation
- Add a simple `Add transaction` flow from Overview or Profile
- Show confidence badges in Overview and Breakdown
- Show a small banner when data is incomplete

### Analytics changes

- Exclude `needs_review` by default from core totals
- Optionally show a separate detected-spend summary
- Recompute top platforms and vendors from confirmed data only

## Acceptance Criteria

- A user can manually add a missing Zomato order
- A user can see which records are confirmed vs detected
- Overview totals remain trustworthy and clearly labeled
- The data model supports adding SMS ingestion later without rewriting analytics from scratch

## After This Feature

### Priority 2

Android SMS ingestion for transaction and order messages

### Priority 3

CSV import for bank and UPI statements

### Priority 4

Cross-source merge logic so one real-world order can be linked across Gmail, SMS, and manual edits

## Nice To Have

- Sender-pattern expansion for Zomato email detection
- Merchant alias mapping
- User feedback loop for parser corrections
- Confidence-aware charts and filters