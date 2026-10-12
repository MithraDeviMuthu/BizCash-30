"""Plotly (interactive) and Matplotlib (static PNG) views of the 30-day forecast.
Run: python charts.py  -> saves ../docs/images/forecast-matplotlib.png"""
import plotly.graph_objects as go


def plotly_forecast(r):
    """r = engine.simulate(...) result. Returns an interactive Plotly figure."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=r["dates"], y=r["p90"], line=dict(width=0), showlegend=False, hoverinfo="skip"))
    fig.add_trace(go.Scatter(x=r["dates"], y=r["p10"], fill="tonexty", line=dict(width=0),
                             fillcolor="rgba(54,136,232,0.2)", name="10th-90th percentile"))
    fig.add_trace(go.Scatter(x=r["dates"], y=r["p50"], name="Expected", line=dict(color="#3688e8", width=3)))
    fig.add_hline(y=r["buffer"], line_dash="dash", line_color="#e49b42", annotation_text="Safety buffer")
    fig.update_layout(title="30-day cash balance forecast", yaxis_title="Cash (Rs)",
                      template="plotly_white", hovermode="x unified")
    return fig


def matplotlib_forecast(r, path):
    """Static PNG of the same forecast (for the README / reports)."""
    import matplotlib
    matplotlib.use("Agg")  # no window needed, just save files
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.fill_between(r["dates"], r["p10"], r["p90"], alpha=0.2, label="10th-90th percentile")
    ax.plot(r["dates"], r["p50"], lw=2.5, label="Expected")
    ax.axhline(r["buffer"], ls="--", color="tab:orange", label="Safety buffer")
    ax.set_title("30-day cash balance forecast")
    ax.set_ylabel("Cash (Rs)")
    ax.set_xticks(r["dates"][::5])
    ax.tick_params(axis="x", rotation=45)
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    from pathlib import Path
    import engine

    out = Path(__file__).parent.parent / "docs" / "images"
    out.mkdir(parents=True, exist_ok=True)
    matplotlib_forecast(engine.simulate(engine.load()), out / "forecast-matplotlib.png")
    print("saved", out / "forecast-matplotlib.png")