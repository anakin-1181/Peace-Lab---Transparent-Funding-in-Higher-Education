# Peace Lab - UCL Transparent Funding

Interactive dashboard for exploring University College London finance data using official HESA finance tables.

## Disclaimer

All figures, categories, and year labels shown in this project come from HESA source files. This repo does not create synthetic estimates, forecasting models, or alternative institutional accounts.

If you need table definitions, column meanings, source links, or HESA caveats, use the in-app `Data Reference` tab first.

## What This Project Does

This repository builds and serves a UCL-specific finance dashboard from HESA data. It filters official finance tables down to `University College London` (`UKPRN 10007784`), converts them into a single JSON payload, and renders multiple interactive views for income, expenditure, tuition, research funding, and department-level research analysis.

The app is designed for transparency rather than prediction. It shows reported values in `£000s`, keeps year coverage tied to the loaded source files, and uses drill-down charts so users can move from headline totals into the HESA tables behind them.

## Main Features

### 1. Overview page

- Year selector for the main finance view.
- KPI cards for total income, total expenditure, net position, and research share of income.
- Main Sankey chart showing income streams flowing into total income, then into expenditure and surplus/deficit.
- Clickable tuition drill-down from Table 6.
- Clickable research source drill-down from Table 5.
- Clickable staff cost split from Table 8.
- Clickable expenditure breakdown from Table 8.
- Embedded data assistant for simple, dataset-grounded Q&A.

### 2. Departments page

- Pie chart comparing department shares of research grants for the selected year.
- Ranking bar chart for all departments in the selected year.
- Department-specific Sankey chart showing research funding sources flowing into one department total.
- Multi-line trend chart showing how each department's share of research funding changes over time.
- Department visibility controls with select all, deselect all, and collapsible checkbox list.

Important: department analysis is based on `Table 5 research grants and contracts`, not total department finances across every income and expenditure category.

### 3. Data Reference page

- HESA source portal link.
- Table-by-table explanation for the HESA finance data used here.
- Key notes and caveats for Tables 1, 5, 6, and 8.
- Column glossary for the fields used by the parser and dashboard.

## HESA Tables Used

The dashboard currently uses these HESA finance tables:

- `Table 1`: consolidated statement of comprehensive income and expenditure.
- `Table 5`: research grants and contracts by source and HESA cost centre.
- `Table 6`: tuition fees and education contracts.
- `Table 8`: expenditure breakdown by activity and cost centre.

The parser reads files from [`Data/`](/Users/anakin./Projects/2026/HE_data2/Data), extracts UCL rows, and writes a combined dataset to [`dashboard/public/ucl-data.json`](/Users/anakin./Projects/2026/HE_data2/dashboard/public/ucl-data.json).

## Current Data Coverage

Based on the current generated dataset in [`dashboard/public/ucl-data.json`](/Users/anakin./Projects/2026/HE_data2/dashboard/public/ucl-data.json):

- `Table 1`: `2015/16` to `2023/24`
- `Table 5`: `2015/16` to `2023/24`
- `Table 6`: `2017/18` to `2023/24`
- `Table 8`: `2015/16` to `2023/24`

The latest overview year currently available is `2023/24`.

## How The Dashboard Works

### Data pipeline

1. Raw HESA CSV files live under [`Data/`](/Users/anakin./Projects/2026/HE_data2/Data).
2. [`dashboard/scripts/build-data.mjs`](/Users/anakin./Projects/2026/HE_data2/dashboard/scripts/build-data.mjs) parses the source files.
3. The script filters to UCL rows, normalizes fields, and writes one merged JSON file.
4. The frontend loads `/ucl-data.json` and builds chart-specific models in [`dashboard/src/lib/charts.ts`](/Users/anakin./Projects/2026/HE_data2/dashboard/src/lib/charts.ts).

If the raw [`Data/`](/Users/anakin./Projects/2026/HE_data2/Data) folder is missing but [`dashboard/public/ucl-data.json`](/Users/anakin./Projects/2026/HE_data2/dashboard/public/ucl-data.json) already exists, the build script can fall back to the prebuilt dataset. That makes it possible to deploy the dashboard without committing the raw source files.

### Frontend

- React + TypeScript + Vite
- React Router for page navigation
- ECharts for Sankey, pie, bar, and line visualizations
- Vercel Analytics component included in the client app

### Optional chat assistant

The chat widget is optional. It sends a compact version of the loaded dataset to the serverless route at [`dashboard/api/chat.js`](/Users/anakin./Projects/2026/HE_data2/dashboard/api/chat.js), which:

- restricts answers to the UCL/HESA finance domain
- blocks unrelated questions
- returns direct glossary answers for common HESA terms
- calls OpenRouter only when needed

If the API route is not running, the dashboard still works, but chat will not.

## Local Development

### Frontend only

```bash
cd dashboard
npm install
npm run dev
```

This runs the Vite app. The UI will load, but `/api/chat` will not be available through plain Vite dev server routing.

### Full local app with chat route

```bash
cd dashboard
npm install
cp .env.example .env.local
npx vercel dev
```

Then add your OpenRouter credentials in `.env.local`.

Required environment variables:

- `OPENROUTER_API_KEY`

Common optional variables:

- `OPENROUTER_MODEL`
- `OPENROUTER_FALLBACK_MODELS`
- `OPENROUTER_TIMEOUT_MS`
- `OPENROUTER_MAX_RETRIES`
- `OPENROUTER_REFERER`
- `OPENROUTER_TITLE`

## Build Commands

From [`dashboard/`](/Users/anakin./Projects/2026/HE_data2/dashboard):

```bash
npm run build:data
npm run check
npm run build
```

What they do:

- `npm run build:data`: rebuilds `public/ucl-data.json` from the HESA source files.
- `npm run check`: runs TypeScript type-checking.
- `npm run build`: regenerates data and creates the production frontend bundle.

## Repo Structure

```text
HE_data2/
├─ Data/                     # Raw HESA source files
├─ dashboard/
│  ├─ api/chat.js           # Serverless chat endpoint
│  ├─ public/ucl-data.json  # Generated UCL dataset used by the frontend
│  ├─ scripts/build-data.mjs
│  └─ src/
│     ├─ components/        # Charts, layout, modal, chat, selectors
│     ├─ data/              # Data loading hook
│     ├─ lib/               # Chart builders, formatting, HESA references
│     └─ pages/             # Overview, Departments, Data Reference
├─ data mismatch.md         # Known cross-table mismatch notes
└─ README.md
```

## Known Caveats

- HESA tables can contain restatements, so totals from different tables do not always align perfectly year to year.
- `Table 6` is not currently available in this repo for `2015/16` and `2016/17`, so tuition drill-downs are unavailable for those years.
- `Table 1` and `Table 8` have a known expenditure mismatch for `2017/18`.
- Some `Table 6` newer-year fields appear to have schema/header drift, which affects certain UK/EU aggregation checks.
- Department views represent `research grants and contracts` only. They are not a full department P&L.

For the current audit notes, see [`data mismatch.md`](/Users/anakin./Projects/2026/HE_data2/data%20mismatch.md).

## What This Project Does Not Do

- It does not compare UCL against other providers.
- It does not estimate missing years.
- It does not forecast future income or expenditure.
- It does not replace the official HESA documentation.

## Related Dashboard Repos

These are useful reference points for open-source dashboard design and analytics product patterns:

- [18F/analytics.usa.gov](https://github.com/18F/analytics.usa.gov) - public-sector transparency dashboard for web analytics.
- [metabase/metabase](https://github.com/metabase/metabase) - widely used open-source analytics dashboard platform.
- [grafana/grafana](https://github.com/grafana/grafana) - mature open-source dashboard and observability platform.

## Recommended User Reading Order

1. Start on `Overview` to understand the top-level income and expenditure picture.
2. Open drill-down charts to see which HESA table supports each node.
3. Move to `Departments` for research-funding concentration and year-over-year share changes.
4. Use `Data Reference` whenever you need source definitions, column meanings, or HESA interpretation notes.

## Source Authority

Primary data source: HESA finance data portal  
<https://www.hesa.ac.uk/data-and-analysis/finances>

If there is ever a difference between the dashboard and your interpretation, treat the HESA source files and the `Data Reference` tab as the authority.
