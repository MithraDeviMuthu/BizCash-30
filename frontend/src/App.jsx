import { useEffect, useState } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";

const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

function useForecast(extra) {
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    fetch(`/api/forecast?extra_delay=${extra}&runs=300`).then((r) => r.json()).then(setD);
  }, [extra]);
  return d;
}

function Chart({ d }) {
  const data = d.dates.map((date, i) => ({
    date: date.slice(5), p50: d.p50[i], p10: d.p10[i], band: [d.p10[i], d.p90[i]],
  }));
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis tickFormatter={(v) => "₹" + Math.round(v / 1000) + "k"} fontSize={12} />
        <Tooltip formatter={(v) => (Array.isArray(v) ? v.map(inr).join(" – ") : inr(v))} />
        <Area dataKey="band" name="Best–Worst range" stroke="none" fill="#1d4ed8" fillOpacity={0.15} />
        <Line dataKey="p50" name="Expected" stroke="#1d4ed8" strokeWidth={3} dot={false} />
        <Line dataKey="p10" name="Worst case" stroke="#dc2626" strokeDasharray="5 4" dot={false} />
        <ReferenceLine y={0} stroke="#111" />
        {d.alert && <ReferenceLine x={d.alert.date.slice(5)} stroke="#dc2626" label={{ value: "Shortfall", fill: "#dc2626", fontSize: 12 }} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function AlertBox({ d }) {
  return d.alert ? (
    <div className="alert bad">⚠ Cash may fall below the safe buffer on {d.alert.date} (day {d.alert.day}) — gap about {inr(d.alert.gap)}. Act before this date.</div>
  ) : (
    <div className="alert ok">✓ No shortfall expected in the next 30 days.</div>
  );
}

function Chase({ rows }) {
  const level = (r) => (r.days_overdue > 15 || r.avg_delay_days > 20 ? ["hi", "High"] : r.days_overdue > 0 || r.avg_delay_days > 7 ? ["md", "Medium"] : ["lo", "Low"]);
  return (
    <table>
      <thead><tr><th>#</th><th>Customer</th><th>Invoice</th><th>Amount</th><th>Due</th><th>Overdue (d)</th><th>Usually late by (d)</th><th>Risk</th></tr></thead>
      <tbody>
        {rows.slice(0, 5).map((r, i) => {
          const [c, t] = level(r);
          return (
            <tr key={r.invoice_id}>
              <td>{i + 1}</td><td><b>{r.customer_id}</b></td><td>{r.invoice_id}</td><td>{inr(r.amount)}</td>
              <td>{r.due_date}</td><td>{r.days_overdue}</td><td>{r.avg_delay_days}</td><td><span className={"pill " + c}>{t}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Upload() {
  const [msg, setMsg] = useState("");
  const send = async (table, file) => {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`/api/upload/${table}`, { method: "POST", body: fd });
    setMsg((await r.json()).ok ? `✓ ${table}.csv replaced. Go to Dashboard tab to see the new forecast.` : "Upload failed");
  };
  const cols = { sales: "date, amount", invoices: "invoice_id, customer_id, issue_date, due_date, amount, paid_date", bills: "vendor, due_date, amount, type", expenses: "date, category, amount", balance: "opening_balance" };
  return (
    <div>
      <p>Upload your own business data (CSV). Columns must match:</p>
      {Object.entries(cols).map(([t, c]) => (
        <div className="box" key={t}><b>{t}.csv</b> <small>({c})</small><br />
          <input type="file" accept=".csv" onChange={(e) => send(t, e.target.files[0])} />
        </div>
      ))}
      <p>{msg}</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dash");
  const [extra, setExtra] = useState(0);
  const [bt, setBt] = useState(null);
  const d = useForecast(extra);
  useEffect(() => { fetch("/api/backtest").then((r) => r.json()).then(setBt); }, []);

  return (
    <>
      <header><h1>BizCash 30</h1><span>30-day small-business cash-flow prediction</span></header>
      <nav>
        {[["dash", "Dashboard"], ["chase", "Who to chase"], ["data", "Upload data"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <main>
        {tab === "data" ? <Upload /> : !d ? <p>Running 300 simulations…</p> : (
          <>
            <AlertBox d={d} />
            {tab === "dash" && (
              <>
                <div className="kpis">
                  <div className="kpi"><small>Lowest expected balance</small><b>{inr(d.min_p50)}</b></div>
                  <div className="kpi"><small>Open invoices</small><b>{d.open_invoices} · {inr(d.open_amount)}</b></div>
                  <div className="kpi"><small>Day-30 expected balance</small><b>{inr(d.p50[29])}</b></div>
                  {bt && <div className="kpi"><small>Backtest sales error (MAPE)</small><b>{bt.sales_mape_pct}%</b></div>}
                </div>
                <Chart d={d} />
                <div className="row">
                  <label><b>What-if:</b> all customers pay <b>{extra}</b> days later than usual</label>
                  <input type="range" min="0" max="20" value={extra} onChange={(e) => setExtra(+e.target.value)} />
                </div>
              </>
            )}
            {tab === "chase" && (<><h3>Call these customers first</h3><Chase rows={d.chase} /></>)}
          </>
        )}
      </main>
    </>
  );
}