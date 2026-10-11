# 💰 BizCash 30

**Know your cash 30 days ahead — before a shortfall surprises you.**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232A)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white&labelColor=1a1a1a)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white&labelColor=1a1a1a)
![Python](https://img.shields.io/badge/Python-3-3776AB?logo=python&logoColor=white&labelColor=1a1a1a)


📈 Forecast cash. ⚠️ Catch shortfalls early. 📞 Chase the right customers first.

> ⚠️ **Prototype data:** invoices, bills, expenses and balances in this repo are **synthetic**. Replace them with your own CSVs before relying on any result.

---

## ✨ Features

|   | Feature | Description |
|---|---------|-------------|
| 📊 | **30-day forecast** | Cash-flow and balance forecast for the next 30 days |
| 🎲 | **Monte Carlo scenarios** | Best, expected and worst-case cash paths |
| 🚨 | **Shortfall alerts** | Warns when projected cash drops below a safe buffer |
| 📞 | **Collections queue** | Ranks which customers to chase first, based on learned payment behavior |
| 🧾 | **Invoices & bills** | Open invoices, upcoming bills and searchable transactions |
| 🔎 | **Backtesting** | Check forecast accuracy against past data |
| 📥 | **CSV import** | Upload your own data from Settings |
| 🛟 | **Sample-data fallback** | Clearly labeled sample data if the API is offline |

---

## 🖼️ Screenshots

### 🏠 Dashboard

![Dashboard](docs/images/dashboard.png)

### 📈 Forecast

![Forecast](docs/images/forecast.png)

### 📞 Collections

![Collections](docs/images/collections.png)

---

## 🧩 How it works

1. 📤 Sales, invoices, bills, expenses and balance data are loaded from CSVs
2. 🧠 The engine learns how each customer pays (typical delays)
3. 📈 Daily sales are forecast from history
4. 🎲 Monte Carlo simulation runs many possible 30-day cash paths
5. 🚨 Paths are compared to the safe-cash buffer to raise shortfall alerts
6. 📞 Open invoices are ranked to show who to chase first
7. 📊 The React dashboard displays everything through the FastAPI endpoints

---

## 🚀 Getting started

Run the backend and frontend in two terminals.

### 🐍 Terminal 1 — Backend

```bash
cd backend
pip install -r requirements.txt
python make_data.py          # creates the 5 CSVs in backend/data/
uvicorn main:app --reload --port 8000
```

### ⚛️ Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

🌐 Open [http://localhost:5173](http://localhost:5173)

---

## 🗂️ Using your own data

Copy your sales file to `backend/data/sales_raw.csv` (Rossmann `train.csv`, or any CSV with `Date` and `Sales` columns), then run `python make_data.py` again.

📝 Invoices, bills, expenses and the opening balance are synthetic. You can also upload your own CSVs from **Settings** in the dashboard.

---

## 🔌 API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/overview` | Summary, 365-day income/expense history, recent activity |
| `GET /api/forecast` | 30-day forecast and scenarios |
| `GET /api/backtest` | Forecast accuracy against past data |
| `POST /api/upload/{table}` | Upload a CSV to replace a data table |

---

## ⚙️ Configuration

Tunables in `backend/engine.py`:

| Constant | Meaning |
|----------|---------|
| `BUFFER` | Minimum safe cash level |
| `RUNS` | Number of simulations |
| `HORIZON` | Forecast length in days (30) |

---

## 📁 Project structure

```
BizCash-30/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── engine.py        # forecasting, Monte Carlo, alerts, backtest
│   ├── make_data.py     # builds the 5 CSVs
│   └── data/
├── frontend/
│   └── src/
│       ├── App.jsx      # dashboard
│       └── style.css
├── docs/images/         # Screenshots
└── README.md
```

---

## 🚧 Limitations

- 🏦 Cash-balance history is reconstructed from the latest balance and recorded cash movements, not real bank snapshots
- 🧾 Bills show in recent activity only once a payment-status field exists
- 📏 Only quote accuracy numbers that `/api/backtest` actually shows

---
