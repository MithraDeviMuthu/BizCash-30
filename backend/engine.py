import numpy as np, pandas as pd
from pathlib import Path

D = Path(__file__).parent / "data"
HORIZON, RUNS, BUFFER = 30, 2000, 50000  # BUFFER = minimum safe cash (Rs)


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


ALPHA, BETA, PHI = 0.3, 0.1, 0.9  # damped-trend smoothing: level, trend, damping


def sales_forecast(sales, dates):
    """Weekday-seasonal damped trend: divide out the weekday pattern (last 12 weeks), run Holt's
    damped trend on what is left, then put the weekday pattern back. Returns (daily forecast, noise std)."""
    s = sales.tail(84).copy()
    s["dow"] = s["date"].dt.dayofweek
    season = s.groupby("dow")["amount"].mean()
    season = season / season.mean()                          # weekday index, 1.0 = average day
    idx = s["dow"].map(season).to_numpy(float)
    open_days = idx > 0                                      # skip always-closed weekdays (they forecast 0)
    y = s["amount"].to_numpy(float)[open_days] / idx[open_days]  # deseasonalised sales
    level, trend = y[0], 0.0
    for v in y[1:]:
        prev = level
        level = ALPHA * v + (1 - ALPHA) * (prev + PHI * trend)
        trend = BETA * (level - prev) + (1 - BETA) * PHI * trend
    steps = np.arange(1, len(dates) + 1)
    base = level + trend * np.cumsum(PHI ** steps)           # damped: the trend fades out
    dows = pd.DatetimeIndex(dates).dayofweek
    return base * season.reindex(dows).fillna(1.0).to_numpy(), s["amount"].std() * 0.6


def simulate(data, runs=RUNS, extra_delay=0, delay_bill_id=None, seed=7):
    """Monte Carlo of the next 30 days. Returns dict with dates, p10/p50/p90 and open invoice table."""
    rng = np.random.default_rng(seed)
    today = data["sales"]["date"].max()
    dates = pd.date_range(today + pd.Timedelta(days=1), periods=HORIZON)
    delays = customer_delays(data["inv"])
    sales_in, sales_sd = sales_forecast(data["sales"], dates)

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

    # simulation (vectorized: all runs at once)
    cash_in = sales_in + rng.normal(0, sales_sd, (runs, HORIZON))
    for _, row in op.iterrows():
        delay = rng.normal(row["mean"] + extra_delay, row["std"], runs).astype(int)
        k = np.maximum((row["due_date"] - dates[0]).days + delay, 0)   # can't be paid in the past
        ok = k < HORIZON
        cash_in[np.arange(runs)[ok], k[ok]] += row["amount"]
    bal = data["opening"] + np.cumsum(cash_in - out, axis=1)
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

    inflows = sales_in.copy()
    for _, row in op.iterrows():
        k = (row["expected_pay"] - dates[0]).days
        if 0 <= k < HORIZON:
            inflows[k] += row["amount"]

    return dict(
        dates=[str(d.date()) for d in dates],
        p10=p10.round().tolist(), p50=p50.round().tolist(), p90=p90.round().tolist(),
        inflows=inflows.round().tolist(),
        outflows=out.round().tolist(),
        opening=round(float(data["opening"])),
        alert=alert, chase=chase.to_dict("records"),
        open_invoices=int(len(op)), open_amount=round(float(op["amount"].sum())),
        min_p50=round(float(p50.min())),
        buffer=BUFFER,
    )


def backtest(data, cut_back=30):
    """Train on data up to N days ago, forecast the last N days, compare with actuals (sales only).
    Compares the damped-trend model with a plain weekday-average baseline."""
    s = data["sales"]
    train, test = s.iloc[:-cut_back], s.iloc[-cut_back:]
    actual = test["amount"].to_numpy(float)
    pred, _ = sales_forecast(train, test["date"])
    recent = train.tail(84)
    wk = recent.groupby(recent["date"].dt.dayofweek)["amount"].mean()
    base = test["date"].dt.dayofweek.map(wk).to_numpy(float)
    mae, base_mae = float(np.abs(actual - pred).mean()), float(np.abs(actual - base).mean())
    return dict(
        sales_mae=round(mae), sales_mape_pct=round(float(100 * mae / actual.mean()), 1),
        baseline_mae=round(base_mae), baseline_mape_pct=round(float(100 * base_mae / actual.mean()), 1),
    )


def overview(data):
    """Dashboard KPIs, monthly income vs expenses, pending invoices, upcoming bills."""
    today = data["sales"]["date"].max()
    start30 = today - pd.Timedelta(days=29)
    sales, exp, bills, inv = data["sales"], data["exp"], data["bills"], data["inv"]

    collected = inv.dropna(subset=["paid_date"])
    income_30 = float(sales.loc[sales["date"] >= start30, "amount"].sum())
    collected_30 = float(collected.loc[collected["paid_date"] >= start30, "amount"].sum())
    total_income = round(income_30 + collected_30)

    bills_30 = bills[(bills["due_date"] >= start30) & (bills["due_date"] <= today)]
    exp_30 = exp[(exp["date"] >= start30) & (exp["date"] <= today)]
    total_expenses = round(float(exp_30["amount"].sum() + bills_30["amount"].sum()))

    s = sales[sales["date"] <= today].copy(); s["month"] = s["date"].dt.to_period("M").astype(str)
    e = exp[exp["date"] <= today].copy(); e["month"] = e["date"].dt.to_period("M").astype(str)
    b = bills[bills["due_date"] <= today].copy(); b["month"] = b["due_date"].dt.to_period("M").astype(str)
    paid = collected[collected["paid_date"] <= today].copy(); paid["month"] = paid["paid_date"].dt.to_period("M").astype(str)
    inc_m = s.groupby("month")["amount"].sum().add(paid.groupby("month")["amount"].sum(), fill_value=0)
    exp_m = e.groupby("month")["amount"].sum().add(b.groupby("month")["amount"].sum(), fill_value=0)
    months = sorted(set(inc_m.index) | set(exp_m.index))[-6:]
    monthly = [
        dict(month=m, income=round(float(inc_m.get(m, 0))), expenses=round(float(exp_m.get(m, 0))))
        for m in months
    ]

    pending = inv[inv["paid_date"].isna()].copy()
    pending["days_overdue"] = (today - pending["due_date"]).dt.days
    pending = pending.sort_values(["days_overdue", "amount"], ascending=False)
    pending_rows = [
        dict(
            invoice_id=r.invoice_id, customer_id=r.customer_id,
            amount=round(float(r.amount)), due_date=r.due_date.strftime("%Y-%m-%d"),
            days_overdue=int(r.days_overdue),
        )
        for r in pending.itertuples()
    ]

    upcoming = bills[(bills["due_date"] > today) & (bills["due_date"] <= today + pd.Timedelta(days=45))]
    upcoming = upcoming.sort_values("due_date")
    bill_rows = [
        dict(vendor=r.vendor, type=r.type, amount=round(float(r.amount)), due_date=r.due_date.strftime("%Y-%m-%d"))
        for r in upcoming.itertuples()
    ]

    history_dates = pd.date_range(end=today, periods=365)
    sales_daily = sales.groupby("date")["amount"].sum().reindex(history_dates, fill_value=0)
    payments_daily = collected.groupby("paid_date")["amount"].sum().reindex(history_dates, fill_value=0)
    expenses_daily = exp.groupby("date")["amount"].sum().reindex(history_dates, fill_value=0)
    bills_daily = bills.groupby("due_date")["amount"].sum().reindex(history_dates, fill_value=0)
    daily_income = sales_daily + payments_daily
    daily_expenses = expenses_daily + bills_daily
    daily_net = daily_income - daily_expenses
    balances = float(data["opening"]) - daily_net.sum() + daily_net.cumsum()
    daily_history = [
        dict(
            date=d.strftime("%Y-%m-%d"),
            income=round(float(daily_income.iloc[i]), 2),
            expenses=round(float(daily_expenses.iloc[i]), 2),
            balance=round(float(balances.iloc[i])),
        )
        for i, d in enumerate(history_dates)
    ]

    transaction_start = today - pd.Timedelta(days=179)
    recent_transactions = []
    for row in sales[(sales["date"] >= transaction_start) & (sales["date"] <= today)].itertuples():
        recent_transactions.append(dict(
            date=row.date.strftime("%Y-%m-%d"),
            description="Daily sales",
            category="Sales",
            amount=round(float(row.amount)),
            type="income",
            status="Recorded",
        ))
    for row in collected[
        (collected["paid_date"] >= transaction_start) & (collected["paid_date"] <= today)
    ].itertuples():
        recent_transactions.append(dict(
            date=row.paid_date.strftime("%Y-%m-%d"),
            description=f"Invoice {row.invoice_id} payment",
            category="Customer payment",
            amount=round(float(row.amount)),
            type="income",
            status="Collected",
        ))
    for row in exp[(exp["date"] >= transaction_start) & (exp["date"] <= today)].itertuples():
        recent_transactions.append(dict(
            date=row.date.strftime("%Y-%m-%d"),
            description=f"{str(row.category).title()} expense",
            category=str(row.category),
            amount=round(float(row.amount)),
            type="expense",
            status="Recorded",
        ))
    recent_transactions.sort(key=lambda row: row["date"], reverse=True)

    return dict(
        as_of=str(today.date()),
        total_income=total_income,
        total_expenses=total_expenses,
        available_cash=round(float(data["opening"])),
        daily_history=daily_history,
        recent_transactions=recent_transactions,
        pending_invoices=pending_rows,
        upcoming_bills=bill_rows,
        monthly=monthly,
    )