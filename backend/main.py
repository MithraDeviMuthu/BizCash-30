from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import engine

app = FastAPI(title="BizCash 30")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/forecast")
def forecast(extra_delay: int = 0, runs: int = 500):
    """extra_delay = what-if: every customer pays N days later than usual."""
    return engine.simulate(engine.load(), runs=runs, extra_delay=extra_delay)


@app.get("/api/backtest")
def backtest():
    return engine.backtest(engine.load())


@app.get("/api/overview")
def overview():
    return engine.overview(engine.load())


@app.post("/api/upload/{table}")
async def upload(table: str, file: UploadFile = File(...)):
    """Replace one of: sales, invoices, bills, expenses, balance with your own CSV."""
    if table not in {"sales", "invoices", "bills", "expenses", "balance"}:
        return {"error": "unknown table"}
    (engine.D / f"{table}.csv").write_bytes(await file.read())
    return {"ok": True, "table": table}
