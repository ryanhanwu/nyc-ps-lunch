# 🍎 TRMNL NYC School Lunch Plugin

A [TRMNL](https://usetrmnl.com) plugin that displays the official New York City Public Schools (NYC DOE) lunch menu for today with a clean, glanceable preview for tomorrow — refreshed automatically on every screen update.

Designed to look like an appetizing cafeteria blackboard that kids and parents can easily read from across the kitchen. Defaults to **Pre-K - 8 Lunch Menu**, with a dropdown in settings supporting all 15 official NYC DOE lunch menus (Pre-K – 8, High School, Express Hot/Cold, Vegetarian, Halal, Food Court, and Infant/Toddler).

[![Buy Me a Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=ryanhanwu&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/ryanhanwu)

---

## What It Shows

```
┌────────────────────────────────────────────────────────────────────┐
│ 🍎 What's for Lunch?  Pre-K – 8        (V) Veggie • (VE) Vegan     │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ [TODAY] Tuesday, Oct 20              🥗 Salad Bar: Leafy Green │ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │
│ │ • Chicken Tenders with Dipping Sauce                           │ │
│ │ • Fish Sticks with Tartar Sauce                                │ │
│ │ • Garlic Knot (V)                                              │ │
│ │ • Parmesan Carrot Sticks (V)                                   │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ [👀 TOMORROW'S LUNCH]                            Wed, Oct 21   │ │
│ │ Black Bean Burger (VE) • Chicken Cheeseburger • Wedge Fries    │ │
│ └────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│ Official NYC DOE • 2026-2027                   Updated Today, 6:49 │
└────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
TRMNL polls → https://trmnl-nyc-ps-lunch.<subdomain>.workers.dev/lunch?menu={{ menu_type }}
                  ↓
          Cloudflare Worker fetches official NYC DOE monthly CSV(s)
                  ↓
          Cleans & merges multi-cell items, handles month rollovers
                  ↓
          Returns merge_variables JSON → TRMNL renders Liquid template
```

- **Data source:** Official NYC Department of Education monthly menu CSVs (`schools.nyc.gov/docs/default-source/school-menus/{school-year}/{month}/{menu-slug}.csv`)
- **Server:** Cloudflare Worker (free tier: 100k req/day)
- **Deploy:** GitHub Actions on push to `main` (or manual `wrangler deploy`)

---

## Supported Menus (15 Official NYC DOE Menus)

| Menu Name | CSV Slug |
|---|---|
| **Pre-K - 8 Lunch Menu** *(Default)* | `pre-k---8-lunch-menu.csv` |
| Pre-K - 8 Lunch Menu With Halal Option | `pre-k---8-lunch-menu-with-halal-option.csv` |
| Pre-K - 8 Vegetarian Lunch Menu | `pre-k---8-vegetarian-lunch-menu.csv` |
| Pre-K - 8 Express Hot Lunch Menu | `pre-k---8-express-hot-lunch-menu.csv` |
| Pre-K - 8 Express Hot Lunch Menu With Halal Option | `pre-k---8-express-hot-lunch-menu-with-halal-option.csv` |
| Pre-K - 8 Express Cold Lunch Menu | `Pre-K---8-Express-Cold-Lunch-Menu.csv` |
| Pre-K - 8 Express Cold Lunch Menu With Halal Option | `pre-k---8-express-cold-lunch-menu-with-halal-option.csv` |
| High School Lunch Menu | `high-school-lunch-menu.csv` |
| High School Lunch Menu With Halal Option | `high-school-lunch-menu-with-halal-option.csv` |
| High School Express Hot Lunch Menu | `high-school-express-hot-lunch-menu.csv` |
| High School Express Hot Lunch Menu With Halal Option | `high-school-express-hot-lunch-menu-with-halal-option.csv` |
| High School Express Cold Lunch Menu | `High-School-Express-Cold-Lunch-Menu.csv` |
| Food Court Menu | `food-court-menu.csv` |
| Food Court Menu With Halal Option | `food-court-menu-with-halal-option.csv` |
| Infant Toddler Lunch Menu | `Infant-Toddler-Lunch-Menu.csv` |

---

## Customize & Self-Host

### 1. Clone and deploy the Worker

```bash
git clone https://github.com/ryanhanwu/nyc-ps-lunch
cd nyc-ps-lunch
npm install
```

**One-time Cloudflare setup:**
1. Create a free account at [cloudflare.com](https://cloudflare.com)
2. Go to **Workers & Pages** → grab your **Account ID** from the sidebar
3. Create an **API Token** with `Workers Scripts: Edit` permission
4. Add these as GitHub repository secrets:
   - `CF_API_TOKEN` — your Cloudflare API token
   - `CF_ACCOUNT_ID` — your Cloudflare Account ID

Push to `main` — GitHub Actions deploys the Worker automatically. Note your Worker URL (e.g. `https://trmnl-nyc-ps-lunch.YOUR-SUBDOMAIN.workers.dev`).

**Test locally first:**
```bash
npm run dev
# Default (Pre-K - 8 Lunch Menu):
curl "http://localhost:8787/lunch"
# Specific menu:
curl "http://localhost:8787/lunch?menu=High%20School%20Lunch%20Menu"
# Specific date override (e.g. end-of-month rollover):
curl "http://localhost:8787/lunch?menu=Pre-K%20-%208%20Lunch%20Menu&date=2026-10-29"
```

### 2. Create the TRMNL plugin

1. Log into [usetrmnl.com](https://usetrmnl.com) → **Plugins** → **New Private Plugin**
2. Set **Strategy** to `Polling`
3. Set **Polling URL** to:
   ```
   https://trmnl-nyc-ps-lunch.YOUR-SUBDOMAIN.workers.dev/lunch?menu={{ menu_type }}
   ```
4. In the **Custom Fields** section, paste the contents of [`plugin/custom-fields.yml`](plugin/custom-fields.yml)
5. In the **Markup** editor, paste the contents of [`src/full.liquid`](src/full.liquid) (and optional half/quadrant views)
6. Save the plugin

---

## Local Development

```bash
npm run dev          # Run Worker locally (Miniflare)
npm run type-check   # TypeScript check
npm run deploy       # Deploy manually to Cloudflare
```

---

## References

- [NYC Public Schools Menus](https://www.schools.nyc.gov/school-life/food/menus/school-lunch-meals)
- [TRMNL Plugins docs](https://docs.usetrmnl.com)
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)

---

## License

MIT
