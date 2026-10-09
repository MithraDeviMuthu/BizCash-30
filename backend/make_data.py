"""Generate the 5 input tables into backend/data/.
If data/sales_raw.csv exists (Rossmann train.csv or any CSV with Date + Sales columns), it is used for sales.
Otherwise realistic synthetic sales are generated.
"""
import numpy as np, pandas as pd
from pathlib import Path

rng = np.random.default_rng(42)
D = Path(__file__).parent / "data"
D.mkdir(exist_ok=True)
END = pd.Timestamp.today().normalize()
START = END - pd.Timedelta(days=364)
days = pd.date_range(START, END)

# ---------- sales ----------
raw = D / "sales_raw.csv"
if raw.exists():
    r = pd.read_csv(raw, low_memory=False)
    r.columns = [c.lower() for c in r.columns]
    if "store" in r.columns:                       # Rossmann: pick one open store
        r = r[r["store"] == r["store"].iloc[0]]
    r["date"] = pd.to_datetime(r["date"])
    r = r.sort_values("date").tail(len(days))
    s = r["sales"].astype(float).values
    s = s * (5000 / max(s.mean(), 1))             # rescale to a small-business level (~Rs 5k/day)
    sales = pd.DataFrame({"date": days[-len(s):], "amount": s.round(0)})
else:
    dow = np.array([1.0, 0.9, 0.9, 1.0, 1.1, 1.5, 1.3])
    base = 5000 * dow[days.dayofweek] * (1 + 0.0004 * np.arange(len(days)))
    sales = pd.DataFrame({"date": days, "amount": (base * rng.normal(1, 0.12, len(days))).round(0)})
sales.to_csv(D / "sales.csv", index=False)

# ---------- invoices (B2B credit sales) ----------
names = [f"Customer {i:02d}" for i in range(1, 31)]
avg_delay = {n: int(rng.choice([-2, 0, 3, 7, 15, 25, 40], p=[.1, .2, .2, .2, .15, .1, .05])) for n in names}
rows = []
for i in range(200):
    c = names[rng.integers(len(names))]
    issue = START + pd.Timedelta(days=int(rng.integers(0, 365)))
    due = issue + pd.Timedelta(days=int(rng.choice([15, 30, 45])))
    amt = round(float(rng.lognormal(10.0, 0.5)), 0)
    paid = due + pd.Timedelta(days=int(max(-5, rng.normal(avg_delay[c], 4))))
    rows.append([f"INV{i:04d}", c, issue, due, amt, paid if paid <= END else pd.NaT])
inv = pd.DataFrame(rows, columns=["invoice_id", "customer_id", "issue_date", "due_date", "amount", "paid_date"])
inv.to_csv(D / "invoices.csv", index=False)

# ---------- bills (known future obligations, 1 year back + 60 days ahead) ----------
bills = []
for m in pd.date_range(START, END + pd.Timedelta(days=60), freq="MS"):
    bills += [["Landlord", m, 60000, "rent"],
              ["Staff", m + pd.Timedelta(days=29), 190000, "salary"],
              ["GST Dept", m + pd.Timedelta(days=19), round(float(rng.normal(38000, 6000)), 0), "GST"],
              ["Utilities", m + pd.Timedelta(days=9), round(float(rng.normal(9000, 1500)), 0), "utilities"]]
for _ in range(90):
    d = START + pd.Timedelta(days=int(rng.integers(0, 425)))
    bills.append([f"Supplier {rng.integers(1, 9)}", d, round(float(rng.lognormal(9.8, 0.5)), 0), "supplier"])
pd.DataFrame(bills, columns=["vendor", "due_date", "amount", "type"]).to_csv(D / "bills.csv", index=False)

# ---------- daily misc expenses ----------
exp = pd.DataFrame({"date": days, "category": "misc", "amount": (rng.normal(3500, 800, len(days))).clip(500).round(0)})
exp.to_csv(D / "expenses.csv", index=False)

# ---------- opening balance ----------
pd.DataFrame({"opening_balance": [60000]}).to_csv(D / "balance.csv", index=False)
print("Data written to", D, "| sales source:", "sales_raw.csv" if raw.exists() else "synthetic")
