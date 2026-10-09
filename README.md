# BizCash 30 — 30-day small business cash-flow prediction

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

## Files
| File | What it does |
|---|---|
| backend/make_data.py | builds sales, invoices, bills, expenses, balance CSVs |
| backend/engine.py | customer payment learning, sales forecast, Monte Carlo (best/expected/worst), shortfall alert, who-to-chase ranking, backtest |
| backend/main.py | FastAPI: /api/forecast, /api/backtest, /api/upload/{table} |
| frontend/src/App.jsx | Dashboard (chart, alert, what-if slider), Who-to-chase, Upload |

## Tunables (engine.py)
`BUFFER` = minimum safe cash, `RUNS` = simulations, `HORIZON` = 30 days.

## Honest claims
The "30%+ fewer surprises" figure on the slide is not computed by this prototype. Only claim numbers the backtest shows (`/api/backtest`).
