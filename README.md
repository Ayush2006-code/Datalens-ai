# DataLens AI

An intelligent spreadsheet analytics platform. Upload an Excel/CSV/ODS
workbook (or try the built-in demo dataset) and DataLens automatically
profiles every column, then generates KPIs, charts, filters, data-quality
metrics, anomaly flags, and natural-language insights — no setup required.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## What's fully working (local, no backend required)

- **Auth** — sign up / log in / log out / update profile, with passwords
  salted and hashed via the browser's SubtleCrypto (PBKDF2-SHA256) before
  being stored — see the security note in `src/services/auth.js`.
- **File upload & parsing** — real `.xlsx`, `.xls`, `.csv`, `.ods` parsing via
  `xlsx` and `papaparse`, with validation for type/size/empty/corrupt files.
- **Multi-sheet workbooks** — sheet tabs, independent KPIs/charts/filters per
  sheet.
- **Automatic data profiling** — type detection (numeric, date, categorical,
  boolean, text), missing values, duplicates, min/max/avg/median/sum.
- **Automatic KPI & chart generation** — chosen from the actual columns
  present, not hardcoded (see `src/services/dashboardGenerator.js`).
- **Global filters** — date range, category multi-select, text search; all
  update KPIs, charts, insights, and the table together.
- **Raw data table** — sort, paginate, search, formatted values.
- **Data quality panel** — completeness score, missing/duplicate stats,
  flagged columns.
- **Anomaly detection** — IQR-based outlier flagging on numeric columns.
- **Insights** — key insights / trends / opportunities / warnings, computed
  from the actual dataset (`src/services/insightEngine.js`).
- **Ask Your Data** — a deterministic local query engine answers common
  question shapes (totals, averages, "which X has the highest Y", top-N,
  monthly trends) with real calculated numbers, not hallucinated text. See
  `src/services/queryEngine.js` and the pluggable `src/services/ai.js`.
- **Workbook management** — save, reopen, rename, delete, favorite, search.
- **Update workbook** — re-upload a file into an existing workbook; the app
  diffs old vs. new (added/removed sheets, columns, row counts) and shows a
  summary (`src/services/workbookDiff.js`).
- **Version history** — a version is recorded each time a workbook is
  updated (visible as a version count in the dashboard header).
- **Export** — CSV, Excel (via `xlsx`), and a print-to-PDF dashboard export.
- **Dark/light theme**, responsive layout (desktop sidebar, mobile drawer
  nav), toasts, loading/processing states, and empty states throughout.
- **Demo dataset** — a realistic generated sales workbook (3 sheets) that
  goes through the exact same pipeline as an uploaded file.

## What requires configuration you'll need to add yourself

These are built as clean, documented integration points rather than faked:

- **Google Sheets** (`src/services/googleSheets.js`) — the "Connect Google
  Sheets" button is real UI, but importing actually requires a Google Cloud
  project, OAuth client, and (recommended) a small backend to exchange the
  OAuth code for a token. Until `VITE_GOOGLE_CLIENT_ID` is set, the button
  explains this rather than pretending to connect.
- **Remote LLM for Ask Your Data** (`src/services/ai.js`) — the local query
  engine handles common questions with real math. To have unrecognized
  questions fall back to an actual LLM, stand up a backend endpoint that
  holds your API key and set `VITE_AI_API_ENDPOINT` to it (never put a raw
  LLM key in frontend code/env vars that ship to the browser).
- **A real backend/database** — this build persists everything to the
  browser's `localStorage` (see `src/services/storage.js` and
  `src/services/auth.js`), which is why data is per-browser rather than
  synced across devices, and why security is best-effort rather than
  production-grade. Swapping in Postgres/Supabase/Node+Express behind the
  same function signatures in those two files is the intended upgrade path.

## Project structure

```
src/
  components/   UI building blocks (Sidebar, Topbar, DashboardView, charts, tables, etc.)
  pages/        Route-level pages (Landing, Login, Signup, Workspace)
  context/      React context providers (Auth, Theme, Toast, Workbook)
  services/     Framework-free logic: parsing, profiling, KPI/chart/insight
                generation, anomaly detection, query engine, storage, export,
                Google Sheets & AI integration points
  utils/        Formatting helpers
```

## Notes on this build

This project was written and syntax-checked in an environment without
network access, so `npm install` / `npm run dev` could not be executed here
to confirm it boots end-to-end in a real browser. Every file was checked for
syntax errors (via `tsc --noEmit` with JSX parsing) and every import was
cross-checked against the target file's actual exports, but if something
doesn't compile on your machine, share the exact error and it can be fixed
immediately — the most likely culprits for the first run of any Vite project
are a Node version mismatch or a stale `node_modules` folder.
