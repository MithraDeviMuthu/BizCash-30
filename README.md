# BizCash — cash-flow forecasting and business finance analytics

## Run in VS Code (two terminals)

**Terminal 1 — backend**
```
cd backend
pip install -r requirements.txt
python make_data.py          # creates the 5 CSVs in backend/data/
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend**
```
cd frontend
npm install
npm run dev                  # open http://localhost:5173
```

## Using your downloaded sales dataset
Copy the file to `backend/data/sales_raw.csv` (Rossmann `train.csv`, or any CSV with `Date` and `Sales` columns), then run `python make_data.py` again.
Invoices, bills, expenses and opening balance are synthetic (say this in your pitch).

## Dashboard

The React dashboard uses the existing FastAPI endpoints and Recharts installation. It includes cash-flow and balance forecasts, period filters, searchable transactions, open invoices, upcoming bills, a ranked collections queue, financial insights, and CSV import in Settings. Run both the backend and frontend to use connected data; when the API is unavailable, the dashboard falls back to clearly labeled sample data.

The repository's generated sales, invoice, bill, expense, and balance records are synthetic. The dashboard labels this prototype data and repeats the warning in Settings. Replace the relevant CSVs with your own before relying on the results. The overview endpoint also provides 365 days of daily income/expense history and recent recorded sales, collected invoices, and expenses; bills appear in recent activity only after a payment-status field is available. The cash-balance history is reconstructed backwards from the latest balance and recorded cash movements, not read from historical bank snapshots.

## Files
| File | What it does |
|---|---|
| backend/make_data.py | builds sales, invoices, bills, expenses, balance CSVs |
| backend/engine.py | customer payment learning, sales forecast, Monte Carlo (best/expected/worst), shortfall alert, who-to-chase ranking, backtest |
| backend/main.py | FastAPI: /api/overview, /api/forecast, /api/backtest, /api/upload/{table} |
| frontend/src/App.jsx | Responsive finance dashboard, forecasts, reports, collections, and CSV import |
| frontend/src/style.css | Dashboard layout, charts, tables, and responsive design |

## Tunables (engine.py)
`BUFFER` = minimum safe cash, `RUNS` = simulations, `HORIZON` = 30 days.

## Honest claims
The "30%+ fewer surprises" figure on the slide is not computed by this prototype. Only claim numbers the backtest shows (`/api/backtest`).
