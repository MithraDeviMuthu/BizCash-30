import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import engine
from validate import validate

TODAY = pd.Timestamp("2026-06-30")


def make_data(opening=1_000_000, invoices=None):
    """Small deterministic dataset: flat sales of 1000/day, no bills."""
    dates = pd.date_range(end=TODAY, periods=120)
    sales = pd.DataFrame({"date": dates, "amount": 1000.0})
    if invoices is None:
        invoices = [
            (1, "C1", 5000, "2026-04-01", "2026-05-01", "2026-05-06"),  # paid 5 days late
            (2, "C1", 5000, "2026-04-10", "2026-05-10", "2026-05-15"),  # paid 5 days late
            (3, "C1", 9000, "2026-06-01", "2026-06-20", None),          # open
            (4, "C2", 2000, "2026-06-01", "2026-06-25", None),          # open
        ]
    inv = pd.DataFrame(invoices, columns=["invoice_id", "customer_id", "amount",
                                          "issue_date", "due_date", "paid_date"])
    for c in ("issue_date", "due_date", "paid_date"):
        inv[c] = pd.to_datetime(inv[c])
    return dict(
        sales=sales,
        inv=inv,
        bills=pd.DataFrame({"due_date": pd.to_datetime([]), "amount": []}),
        exp=pd.DataFrame({"date": dates, "amount": 100.0}),
        opening=float(opening),
    )


def test_customer_delays_learns_average():
    d = engine.customer_delays(make_data()["inv"])
    assert d.loc["C1", "mean"] == 5
    assert d.loc["C1", "std"] >= 2  # std is clipped to a minimum


def test_sales_forecast_flat_sales():
    dates = pd.date_range(TODAY + pd.Timedelta(days=1), periods=30)
    pred, _ = engine.sales_forecast(make_data()["sales"], dates)
    assert pred == pytest.approx(1000)


def test_sales_forecast_follows_weekday_pattern():
    dates = pd.date_range(end=TODAY, periods=120)
    sales = pd.DataFrame({"date": dates, "amount": [2000.0 if d.dayofweek == 5 else 1000.0 for d in dates]})
    future = pd.date_range(TODAY + pd.Timedelta(days=1), periods=14)
    pred, _ = engine.sales_forecast(sales, future)
    assert all(p > 1500 for p, d in zip(pred, future) if d.dayofweek == 5)
    assert all(p < 1500 for p, d in zip(pred, future) if d.dayofweek != 5)


def test_sales_forecast_trend_rises_then_flattens():
    dates = pd.date_range(end=TODAY, periods=120)
    sales = pd.DataFrame({"date": dates, "amount": 1000.0 + 10 * pd.Series(range(120)).to_numpy()})
    future = pd.date_range(TODAY + pd.Timedelta(days=1), periods=30)
    pred, _ = engine.sales_forecast(sales, future)
    assert pred[7] > pred[0]                                  # trend continues upward
    assert (pred[29] - pred[22]) < (pred[7] - pred[0])       # ...but damped, so growth slows


def test_sales_forecast_handles_closed_weekday():
    dates = pd.date_range(end=TODAY, periods=120)
    sales = pd.DataFrame({"date": dates, "amount": [0.0 if d.dayofweek == 6 else 1000.0 for d in dates]})
    future = pd.date_range(TODAY + pd.Timedelta(days=1), periods=14)
    pred, _ = engine.sales_forecast(sales, future)
    assert not pd.isna(pred).any()
    assert all(p == 0 for p, d in zip(pred, future) if d.dayofweek == 6)
    assert all(p == pytest.approx(1000) for p, d in zip(pred, future) if d.dayofweek != 6)


def test_backtest_reports_baseline_too():
    r = engine.backtest(make_data())
    assert {"baseline_mae", "baseline_mape_pct"} <= set(r)


def test_charts_build(tmp_path):
    import charts
    r = engine.simulate(make_data(), runs=20)
    assert len(charts.plotly_forecast(r).data) == 3
    out = tmp_path / "f.png"
    charts.matplotlib_forecast(r, out)
    assert out.stat().st_size > 1000


def test_forecast_shape_and_ordering():
    r = engine.simulate(make_data(), runs=50)
    assert len(r["dates"]) == engine.HORIZON
    assert all(lo <= mid <= hi for lo, mid, hi in zip(r["p10"], r["p50"], r["p90"]))


def test_no_alert_when_cash_is_high():
    assert engine.simulate(make_data(opening=10_000_000), runs=50)["alert"] is None


def test_alert_when_cash_is_low():
    r = engine.simulate(make_data(opening=0), runs=50)
    assert r["alert"] is not None
    assert r["alert"]["gap"] > 0


def test_chase_ranks_bigger_invoice_first():
    chase = engine.simulate(make_data(), runs=50)["chase"]
    scores = [c["score"] for c in chase]
    assert scores == sorted(scores, reverse=True)
    assert chase[0]["invoice_id"] == 3  # larger and more overdue


def test_backtest_flat_sales_is_perfect():
    r = engine.backtest(make_data())
    assert r["sales_mae"] == 0
    assert r["sales_mape_pct"] == 0


GOOD = {
    "sales": b"date,amount\n2026-01-01,100\n",
    "balance": b"opening_balance\n50000\n",
}


@pytest.mark.parametrize("table", GOOD)
def test_validate_accepts_good_csv(table):
    assert validate(table, GOOD[table]) == []


def test_validate_rejects_bad_csvs():
    assert "unknown table" in validate("nope", b"a\n1\n")[0]
    assert "missing columns" in validate("sales", b"date\n2026-01-01\n")[0]
    assert any("invalid dates" in e for e in validate("sales", b"date,amount\nnot-a-date,100\n"))
    assert any("negative" in e for e in validate("sales", b"date,amount\n2026-01-01,-5\n"))
    assert validate("sales", b"date,amount\n") == ["file has no rows"]