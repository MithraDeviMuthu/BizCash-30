import numpy as np, pandas as pd
from pathlib import Path

D = Path(__file__).parent / "data"
HORIZON, RUNS, BUFFER = 30, 1000, 50000  # BUFFER = minimum safe cash (Rs)


def load():
    p = lambda f, **k: pd.read_csv(D / f, **k)
    return dict(
        sales=p("sales.csv", parse_dates=["date"]),
        inv=p("invoices.csv", parse_dates=["issue_date", "due_date", "paid_date"]),
        bills=p("bills.csv", parse_dates=["due_date"]),
        exp=p("expenses.csv", parse_dates=["date"]),
        opening=float(p("balance.csv")["opening_balance"].iloc[0]),
    )


def customer_delays(inv):
    """Learn each customer's payment delay (mean, std) in days vs due date."""
    paid = inv.dropna(subset=["paid_date"]).copy()
    paid["delay"] = (paid["paid_date"] - paid["due_date"]).dt.days
    g = paid.groupby("customer_id")["delay"].agg(["mean", "std", "count"]).fillna(5)
    g["std"] = g["std"].clip(lower=2)
    return g


def sales_model(sales):
    """Day-of-week average over the last 12 weeks + residual std."""
    s = sales.tail(84).copy()
    s["dow"] = s["date"].dt.dayofweek
    return s.groupby("dow")["amount"].mean(), s["amount"].std() * 0.6


def simulate(data, runs=RUNS, extra_delay=0, delay_bill_id=None, seed=7):
    """Monte Carlo of the next 30 days. Returns dict with dates, p10/p50/p90 and open invoice table."""
    rng = np.random.default_rng(seed)
    today = data["sales"]["date"].max()
    dates = pd.date_range(today + pd.Timedelta(days=1), periods=HORIZON)
    delays = customer_delays(data["inv"])
    dow_mean, sales_sd = sales_model(data["sales"])

    # open invoices
    op = data["inv"][data["inv"]["paid_date"].isna()].copy()
    op["mean"] = op["customer_id"].map(delays["mean"]).fillna(7)
    op["std"] = op["customer_id"].map(delays["std"]).fillna(6)
    op["expected_pay"] = op["due_date"] + pd.to_timedelta(op["mean"].round() + extra_delay, unit="D")
    op["days_overdue"] = (today - op["due_date"]).dt.days

    # deterministic outflows
    out = np.zeros(HORIZON)
    b = data["bills"]
    for i, d in enumerate(dates):
        out[i] += b.loc[b["due_date"] == d, "amount"].sum()
    out += data["exp"]["amount"].tail(60).mean()

    # simulation
    bal = np.zeros((runs, HORIZON))
    sales_in = np.array([dow_mean[d.dayofweek] for d in dates])
    for r in range(runs):
        cash_in = sales_in + rng.normal(0, sales_sd, HORIZON)
        for _, row in op.iterrows():
            pay = row["due_date"] + pd.Timedelta(days=int(rng.normal(row["mean"] + extra_delay, row["std"])))
            pay = max(pay, today + pd.Timedelta(days=1))          # unpaid invoices can't be paid in the past
            k = (pay - dates[0]).days
            if 0 <= k < HORIZON:
                cash_in[k] += row["amount"]
        bal[r] = data["opening"] + np.cumsum(cash_in - out)
    # opening = current cash in hand today
    p10, p50, p90 = np.percentile(bal, [10, 50, 90], axis=0)

    # alert: first day p10 falls below buffer
    breach = np.where(p10 < BUFFER)[0]
    alert = None
    if len(breach):
        i = int(breach[0])
        alert = dict(date=str(dates[i].date()), gap=round(float(BUFFER - p10[i])), day=i + 1)

    # who-to-chase: amount x lateness risk x urgency
    shortfall_day = alert["day"] if alert else HORIZON
    op["risk"] = (1 + op["days_overdue"].clip(lower=0) / 30) * (1 + op["mean"].clip(lower=0) / 30)
    op["urgency"] = 1 + (HORIZON - shortfall_day) / HORIZON
    op["score"] = op["amount"] * op["risk"] * op["urgency"]
    chase = (op.sort_values("score", ascending=False).head(10)
             [["invoice_id", "customer_id", "amount", "due_date", "days_overdue", "mean", "score"]]
             .rename(columns={"mean": "avg_delay_days"}))
    chase["due_date"] = chase["due_date"].dt.strftime("%Y-%m-%d")
    chase = chase.round(1)

    return dict(
        dates=[str(d.date()) for d in dates],
        p10=p10.round().tolist(), p50=p50.round().tolist(), p90=p90.round().tolist(),
        alert=alert, chase=chase.to_dict("records"),
        open_invoices=int(len(op)), open_amount=round(float(op["amount"].sum())),
        min_p50=round(float(p50.min())),
    )


def backtest(data, cut_back=30):
    """Train on data up to N days ago, forecast the last N days, compare with actuals (sales-only MAE)."""
    s = data["sales"]
    train, test = s.iloc[:-cut_back], s.iloc[-cut_back:].copy()
    m, _ = sales_model(train)
    test["pred"] = test["date"].dt.dayofweek.map(m)
    mae = float((test["amount"] - test["pred"]).abs().mean())
    return dict(sales_mae=round(mae), sales_mape_pct=round(100 * mae / float(test["amount"].mean()), 1))
