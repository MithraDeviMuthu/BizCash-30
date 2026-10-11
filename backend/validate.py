import io
import pandas as pd

REQUIRED = {
    "sales": ["date", "amount"],
    "invoices": ["invoice_id", "customer_id", "amount", "issue_date", "due_date", "paid_date"],
    "bills": ["vendor", "type", "amount", "due_date"],
    "expenses": ["date", "category", "amount"],
    "balance": ["opening_balance"],
}
DATE_COLS = {
    "sales": ["date"],
    "invoices": ["issue_date", "due_date", "paid_date"],
    "bills": ["due_date"],
    "expenses": ["date"],
    "balance": [],
}
OPTIONAL_DATES = {"paid_date"}  # unpaid invoices have no paid_date
MONEY_COL = {"balance": "opening_balance"}


def validate(table, raw):
    """Check an uploaded CSV (bytes). Returns a list of error strings; empty list = OK."""
    if table not in REQUIRED:
        return ["unknown table"]
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        return [f"cannot read CSV: {e}"]

    missing = [c for c in REQUIRED[table] if c not in df.columns]
    if missing:
        return [f"missing columns: {', '.join(missing)}"]
    if df.empty:
        return ["file has no rows"]

    errors = []
    for c in DATE_COLS[table]:
        parsed = pd.to_datetime(df[c], errors="coerce")
        bad = parsed.isna() if c not in OPTIONAL_DATES else parsed.isna() & df[c].notna()
        if bad.any():
            errors.append(f"{c}: {int(bad.sum())} missing or invalid dates")

    col = MONEY_COL.get(table, "amount")
    nums = pd.to_numeric(df[col], errors="coerce")
    if nums.isna().any():
        errors.append(f"{col}: {int(nums.isna().sum())} missing or non-numeric values")
    if table != "balance" and (nums < 0).any():
        errors.append(f"{col}: {int((nums < 0).sum())} negative values")
    return errors