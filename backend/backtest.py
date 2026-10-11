"""Run: python backtest.py  -> sales forecast accuracy over several holdout windows."""
import engine

if __name__ == "__main__":
    data = engine.load()
    for n in (14, 30, 60):
        r = engine.backtest(data, cut_back=n)
        print(f"last {n:>2} days | damped trend MAPE {r['sales_mape_pct']}% (MAE Rs {r['sales_mae']:,})"
              f" | weekday-average baseline MAPE {r['baseline_mape_pct']}% (MAE Rs {r['baseline_mae']:,})")