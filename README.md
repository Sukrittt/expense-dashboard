# Expense Dashboard (Local React + Vite)

A local dashboard for Sukrit’s expense tracking files:

- `productivity/expenses.csv`
- `productivity/investments.csv`
- `productivity/subscriptions.csv`

The app uses copied CSVs from `src/data/*.csv` so Vite can load them directly in the browser.

## What this dashboard shows

1. **MTD total card** + split into **Daily Life vs Goa Shopping**
2. **Category breakdown** table + pie chart
3. **Goa tracker** (spent/remaining) with rule: exclude air fryer + accessories
4. **Subscriptions panel** for active and cancelled items
5. **Weekly anomaly list** (top spend days)
6. **Weekly Review & Insights** generated from loaded spend patterns (recent 7-day trend, peak day, dominant categories)
7. **Light/Dark theme toggle** with Mac-like typography and polished card/charts styling

## Setup

```bash
cd /Users/sukrit/.openclaw/workspace/productivity/expense-dashboard
npm install
npm run refresh-data
npm run dev
```

Then open the local Vite URL shown in terminal (usually `http://localhost:5173`).

## Refreshing data from source CSVs

Whenever `productivity/*.csv` changes, re-copy fresh data:

```bash
cd /Users/sukrit/.openclaw/workspace/productivity/expense-dashboard
npm run refresh-data
```

This script copies from:

- `../expenses.csv`
- `../investments.csv`
- `../subscriptions.csv`

to:

- `src/data/expenses.csv`
- `src/data/investments.csv`
- `src/data/subscriptions.csv`

## Preview

![Expense Dashboard Preview](public/dashboard-preview.jpg)

## Credits

Built iteratively by **Mac** (AI assistant) for Sukrit’s workflow.

## Notes

- Goa tracker includes entries where item/notes contain `goa` and excludes `air fryer`, `airfryer`, and `accessories`.
- All amounts are displayed in INR formatting.
- Theme toggle includes a clean airy light mode and a near-black high-contrast dark mode with subtle warm accent glow for hierarchy.
