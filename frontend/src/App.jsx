import { useEffect, useMemo, useRef, useState } from "react";
import Plotly from "plotly.js-basic-dist-min";

const API = "";
const RUNS = 2000; // Monte Carlo simulations per forecast
const RANGE_OPTIONS = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 180, label: "Last 6 months" },
  { days: 365, label: "Last 12 months" },
];

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", hint: "Overview" },
  { id: "cashflow", label: "Cash Flow", icon: "cashflow", hint: "In & out" },
  { id: "transactions", label: "Transactions", icon: "transactions", hint: "Recent activity" },
  { id: "invoices", label: "Invoices", icon: "invoices", hint: "Receivables" },
  { id: "bills", label: "Bills & Expenses", icon: "bills", hint: "Payables" },
  { id: "forecast", label: "Forecasting", icon: "forecast", hint: "30-day outlook" },
  { id: "customers", label: "Customer Payments", icon: "customers", hint: "Collections" },
  { id: "reports", label: "Reports", icon: "reports", hint: "Performance" },
  { id: "settings", label: "Settings", icon: "settings", hint: "Data & account" },
];

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shiftDate = (date, days) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return dateKey(next);
};
const fmtDate = (value, options = { day: "numeric", month: "short" }) => {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", options).format(new Date(year, month - 1, day));
};
const inr = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
const inrK = (value) => `₹${Math.round((Number(value) || 0) / 1000)}k`;
const days = (n) => `${n} ${n === 1 ? "day" : "days"}`;
const closeGap = (alert, chase = []) => {
  if (!alert || !chase.length) return null;
  const picks = [];
  let total = 0;
  for (const row of chase) {
    if (picks.length === 3 || total >= alert.gap) break;
    picks.push(row);
    total += Number(row.amount) || 0;
  }
  return { picks, total, covers: total >= alert.gap };
};
const bufferText = (f) => inr(f?.buffer ?? 50000);
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

function makeDemoOverview() {
  const today = dateKey(new Date());
  const history = [];
  const start = shiftDate(today, -364);

  for (let i = 0; i < 365; i += 1) {
    const date = shiftDate(start, i);
    const isRecent = i >= 335;
    const income = isRecent
      ? Math.round(412800 / 30) + (i % 4 === 0 ? 140 : 0)
      : 11700 + ((i * 137) % 2300);
    const expenses = isRecent
      ? Math.round(368400 / 30) + (i % 5 === 0 ? 100 : 0)
      : 10300 + ((i * 89) % 1900);
    history.push({ date, income, expenses, balance: 0 });
  }

  const recentHistory = history.slice(-30);
  const incomeAdjustment = 412800 - sum(recentHistory, "income");
  const expenseAdjustment = 368400 - sum(recentHistory, "expenses");
  recentHistory[recentHistory.length - 1].income += incomeAdjustment;
  recentHistory[recentHistory.length - 1].expenses += expenseAdjustment;
  const opening = 60000;
  let balance = opening - sum(history, "income") + sum(history, "expenses");
  history.forEach((row) => {
    balance += row.income - row.expenses;
    row.balance = Math.round(balance);
  });

  const monthMap = new Map();
  history.forEach((row) => {
    const month = row.date.slice(0, 7);
    const current = monthMap.get(month) || { month, income: 0, expenses: 0 };
    current.income += row.income;
    current.expenses += row.expenses;
    monthMap.set(month, current);
  });

  const pendingInvoices = [
    { invoice_id: "INV0188", customer_id: "Customer 07", amount: 48200, due_date: shiftDate(today, -28), days_overdue: 28 },
    { invoice_id: "INV0171", customer_id: "Customer 22", amount: 31500, due_date: shiftDate(today, -18), days_overdue: 18 },
    { invoice_id: "INV0194", customer_id: "Customer 03", amount: 22800, due_date: shiftDate(today, -12), days_overdue: 12 },
    { invoice_id: "INV0201", customer_id: "Customer 14", amount: 19600, due_date: shiftDate(today, -6), days_overdue: 6 },
    { invoice_id: "INV0210", customer_id: "Customer 09", amount: 12400, due_date: shiftDate(today, 5), days_overdue: -5 },
  ];
  const recentTransactions = history.slice(-20).flatMap((row) => [
    { date: row.date, description: "Daily sales", category: "Sales", amount: row.income, type: "income", status: "Recorded" },
    { date: row.date, description: "Operating expenses", category: "Operations", amount: row.expenses, type: "expense", status: "Recorded" },
  ]);

  return {
    as_of: today,
    total_income: 412800,
    total_expenses: 368400,
    available_cash: opening,
    daily_history: history,
    recent_transactions: recentTransactions,
    pending_invoices: pendingInvoices,
    upcoming_bills: [
      { vendor: "Utilities", type: "Utilities", amount: 9200, due_date: shiftDate(today, 9) },
      { vendor: "GST Department", type: "Tax", amount: 37200, due_date: shiftDate(today, 19) },
      { vendor: "Payroll", type: "Payroll", amount: 190000, due_date: shiftDate(today, 20) },
      { vendor: "Landlord", type: "Rent", amount: 60000, due_date: shiftDate(today, 22) },
    ],
    monthly: [...monthMap.values()].slice(-12).map((row) => ({
      ...row,
      income: Math.round(row.income),
      expenses: Math.round(row.expenses),
    })),
  };
}

const DEMO_OVERVIEW = makeDemoOverview();
const DEMO_FORECAST = {
  dates: Array.from({ length: 30 }, (_, i) => shiftDate(DEMO_OVERVIEW.as_of, i + 1)),
  p10: Array.from({ length: 30 }, (_, i) => 48000 - i * 900 + (i % 5) * 2500),
  p50: Array.from({ length: 30 }, (_, i) => 62000 + i * 400 + Math.sin(i / 3) * 8000),
  p90: Array.from({ length: 30 }, (_, i) => 78000 + i * 1100 + (i % 4) * 3000),
  inflows: Array.from({ length: 30 }, (_, i) => 5200 + (i % 7 === 5 ? 28000 : 0) + (i % 3) * 800),
  outflows: Array.from({ length: 30 }, (_, i) => 3500 + (i === 18 ? 37000 : 0) + (i === 19 ? 190000 : 0)),
  opening: 60000,
  alert: { date: shiftDate(DEMO_OVERVIEW.as_of, 20), gap: 18200, day: 20 },
  chase: [
    { invoice_id: "INV0188", customer_id: "Customer 07", amount: 48200, due_date: shiftDate(DEMO_OVERVIEW.as_of, -28), days_overdue: 28, avg_delay_days: 25, score: 91 },
    { invoice_id: "INV0171", customer_id: "Customer 22", amount: 31500, due_date: shiftDate(DEMO_OVERVIEW.as_of, -18), days_overdue: 18, avg_delay_days: 14, score: 74 },
    { invoice_id: "INV0194", customer_id: "Customer 03", amount: 22800, due_date: shiftDate(DEMO_OVERVIEW.as_of, -12), days_overdue: 12, avg_delay_days: 9, score: 61 },
    { invoice_id: "INV0201", customer_id: "Customer 14", amount: 19600, due_date: shiftDate(DEMO_OVERVIEW.as_of, -6), days_overdue: 6, avg_delay_days: 11, score: 48 },
  ],
  open_invoices: 12,
  open_amount: 186400,
  min_p50: 21400,
  buffer: 50000,
};

function Icon({ name, size = 19 }) {
  const paths = {
    dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM3 13h8v8H3zM13 10h8v11h-8z",
    cashflow: "M3 16l5-5 4 3 8-9M15 5h5v5M3 21h18",
    transactions: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    invoices: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
    bills: "M4 6h16M6 3v6M18 3v6M5 10h14v11H5zM8 14h3M8 17h7",
    forecast: "M3 18l5-6 4 3 8-10M15 5h5v5M3 21h18",
    customers: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6",
    reports: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.4v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1H15v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.5 1z",
    search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM17 17l4 4",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    menu: "M3 6h18M3 12h18M3 18h18",
    collapse: "M15 4v16M5 8l4 4-4 4M19 8l-4 4 4 4",
    income: "M12 19V5M6 11l6-6 6 6M4 21h16",
    expense: "M12 5v14M18 13l-6 6-6-6M4 3h16",
    wallet: "M4 6h15a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h13M16 12h5",
    searchCheck: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4 4",
    calendar: "M4 5h16v16H4zM8 3v4M16 3v4M4 10h16",
  };

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.dashboard} />
    </svg>
  );
}

const PLOT_AXIS = {
  tickfont: { size: 11, color: "#667085" },
  gridcolor: "#eef0f3",
  linecolor: "rgba(0,0,0,0)",
  zeroline: false,
  fixedrange: true,
};
const moneyAxis = { ...PLOT_AXIS, tickprefix: "₹", tickformat: "~s", zeroline: true, zerolinecolor: "#d0d5dd" };
const dateAxis = { ...PLOT_AXIS, type: "date", tickformat: "%-d %b", hoverformat: "%-d %b %Y", showgrid: false, nticks: 8 };
const legendBelow = { orientation: "h", x: 0.5, xanchor: "center", y: -0.2, font: { size: 11, color: "#667085" } };
const dividerAt = (x) => ({ type: "line", xref: "x", x0: x, x1: x, yref: "paper", y0: 0, y1: 1, line: { color: "#98a2b3", width: 1, dash: "dot" } });

function PlotlyChart({ data, layout = {}, height = 280 }) {
  const ref = useRef(null);
  useEffect(() => {
    Plotly.react(
      ref.current,
      data,
      {
        height,
        margin: { t: 10, r: 8, l: 50, b: layout.showlegend ? 55 : 30 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "inherit", size: 11, color: "#667085" },
        hovermode: "x unified",
        showlegend: false,
        ...layout,
      },
      { responsive: true, displayModeBar: false },
    );
  }, [data, layout, height]);
  useEffect(() => {
    const el = ref.current;
    return () => Plotly.purge(el);
  }, []);
  return <div ref={ref} style={{ width: "100%" }} />;
}

function BalanceChart({ history, forecast }) {
  const past = history.slice(-30);
  const hover = (name) => `${name}: %{customdata}<extra></extra>`;
  const line = (name, x, y, style) => ({
    type: "scatter", mode: "lines", name, x, y, line: style, customdata: y.map(inr), hovertemplate: hover(name),
  });
  const data = [
    { type: "scatter", mode: "lines", x: forecast.dates, y: forecast.p90, line: { width: 0 }, hoverinfo: "skip" },
    { type: "scatter", mode: "lines", name: "Forecast range", x: forecast.dates, y: forecast.p10, line: { width: 0 }, fill: "tonexty", fillcolor: "rgba(99, 102, 241, 0.13)", hoverinfo: "skip" },
    line("Reconstructed balance", past.map((row) => row.date), past.map((row) => row.balance), { color: "#344054", width: 2.5 }),
    line("Expected balance", forecast.dates, forecast.p50, { color: "#3b82f6", width: 2.7 }),
    line("Conservative case", forecast.dates, forecast.p10, { color: "#f59e0b", width: 1.8, dash: "dash" }),
  ];
  const layout = { xaxis: dateAxis, yaxis: moneyAxis, shapes: past.length ? [dividerAt(past[past.length - 1].date)] : [] };

  return (
    <div className="chart-canvas">
      <PlotlyChart data={data} layout={layout} height={310} />
      <div className="chart-period-labels"><span>Reconstructed history</span><span>Forecast · next 30 days</span></div>
    </div>
  );
}

function FlowChart({ history, forecast }) {
  const nPast = history.length;
  const dates = [...history.map((row) => row.date), ...forecast.dates];
  const income = [...history.map((row) => row.income), ...forecast.dates.map((_, i) => forecast.inflows?.[i] ?? 0)];
  const expenses = [...history.map((row) => row.expenses), ...forecast.dates.map((_, i) => forecast.outflows?.[i] ?? 0)];
  const bars = (name, projectedName, values, actual, projected) => ({
    type: "bar",
    name,
    x: dates,
    y: values,
    marker: { color: dates.map((_, i) => (i < nPast ? actual : projected)) },
    customdata: values.map((v, i) => [i < nPast ? name : projectedName, inr(v)]),
    hovertemplate: "%{customdata[0]}: %{customdata[1]}<extra></extra>",
  });
  const data = [
    bars("Income", "Expected inflow", income, "#10b981", "#a7e8d1"),
    bars("Expenses", "Expected outflow", expenses, "#ef4444", "#ffc2b8"),
  ];
  const layout = {
    xaxis: dateAxis, yaxis: moneyAxis, barmode: "group", bargap: 0.25, showlegend: true, legend: legendBelow,
    shapes: nPast ? [dividerAt(history[nPast - 1].date)] : [],
  };
  return <PlotlyChart data={data} layout={layout} height={270} />;
}

function MonthlyChart({ rows }) {
  const labels = rows.map((row) => new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${row.month}-15T12:00:00`)));
  const bars = (name, key, color) => ({
    type: "bar", name, x: labels, y: rows.map((row) => row[key]), marker: { color },
    customdata: rows.map((row) => inr(row[key])), hovertemplate: `${name}: %{customdata}<extra></extra>`,
  });
  const data = [bars("Income", "income", "#10b981"), bars("Expenses", "expenses", "#ef4444")];
  const layout = {
    xaxis: { ...PLOT_AXIS, type: "category", showgrid: false }, yaxis: moneyAxis,
    barmode: "group", bargap: 0.35, showlegend: true, legend: legendBelow,
  };
  return <PlotlyChart data={data} layout={layout} height={265} />;
}

function DateFilter({ value, onChange }) {
  return (
    <label className="date-filter">
      <Icon name="calendar" size={16} />
      <span className="sr-only">Filter by date range</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {RANGE_OPTIONS.map((option) => (
          <option value={option.days} key={option.days}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function CardHeader({ title, subtitle, action }) {
  return (
    <header className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

function Kpis({ overview, forecast, summary, rangeLabel, dashboard = false }) {
  const predicted = forecast?.p50?.[forecast.p50.length - 1];
  const netCashFlow = summary.income - summary.expenses;
  const items = dashboard
    ? [
        { label: "Total income", value: summary.income, note: rangeLabel, icon: "income", color: "blue" },
        { label: "Total expenses", value: summary.expenses, note: rangeLabel, icon: "expense", color: "orange" },
        { label: "Current cash balance", value: overview.available_cash, note: `As of ${fmtDate(overview.as_of)}`, icon: "wallet", color: Number(overview.available_cash) < 0 ? "negative" : "navy" },
        { label: "Net cash flow", value: netCashFlow, note: rangeLabel, icon: "cashflow", color: netCashFlow < 0 ? "negative" : "green", signed: true },
        { label: "30-day predicted balance", value: predicted, note: "Expected · day 30", icon: "forecast", color: Number(predicted) < 0 ? "negative" : "indigo" },
        {
          label: "Cash shortage risk",
          value: forecast.alert ? "At risk" : "Low risk",
          note: forecast.alert ? `Potential dip · ${fmtDate(forecast.alert.date)}` : "No buffer breach expected",
          icon: "bell",
          color: forecast.alert ? "risk" : "green",
          textValue: true,
        },
      ]
    : [
        { label: "Total income", value: summary.income, note: rangeLabel, icon: "income", color: "blue" },
        { label: "Total expenses", value: summary.expenses, note: rangeLabel, icon: "expense", color: "orange" },
        { label: "Current cash balance", value: overview.available_cash, note: `As of ${fmtDate(overview.as_of)}`, icon: "wallet", color: Number(overview.available_cash) < 0 ? "negative" : "navy" },
        { label: "Predicted cash balance", value: predicted, note: "Expected · day 30", icon: "forecast", color: Number(predicted) < 0 ? "negative" : "green" },
      ];

  return (
    <section className={`kpi-grid ${dashboard ? "dashboard-kpis" : ""}`} aria-label="Financial summary">
      {items.map((item) => (
        <article className={`kpi-card ${item.color}`} key={item.label}>
          <div className="kpi-top">
            <span>{item.label}</span>
            <span className="kpi-icon"><Icon name={item.icon} size={19} /></span>
          </div>
          <strong>
            {item.textValue
              ? item.value
              : item.signed
                ? `${item.value >= 0 ? "+" : "−"}${inr(Math.abs(Number(item.value) || 0))}`
                : inr(item.value)}
          </strong>
          <small>{item.note}</small>
        </article>
      ))}
    </section>
  );
}

function TransactionsTable({ rows, empty = "No transactions found for this period." }) {
  if (!rows.length) return <div className="empty-state">{empty}</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.date}-${row.description}-${index}`}>
              <td>{fmtDate(row.date, { day: "numeric", month: "short", year: "numeric" })}</td>
              <td className="description-cell"><span className={`transaction-icon ${row.type}`}><Icon name={row.type === "income" ? "income" : "expense"} size={15} /></span>{row.description}</td>
              <td>{row.category}</td>
              <td className={`amount-cell ${row.type}`}>{row.type === "income" ? "+" : "−"}{inr(row.amount)}</td>
              <td><span className={`status-pill ${row.type === "income" ? "paid" : "recorded"}`}>{row.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceTable({ rows }) {
  if (!rows.length) return <div className="empty-state">No open invoices match your search.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th>Days late</th><th>Amount due</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.invoice_id}>
              <td><b>{row.invoice_id}</b></td>
              <td>{row.customer_id}</td>
              <td>{fmtDate(row.due_date, { day: "numeric", month: "short", year: "numeric" })}</td>
              <td><span className={`status-pill ${row.days_overdue > 0 ? "overdue" : "upcoming"}`}>{row.days_overdue > 0 ? days(row.days_overdue) : "Not overdue"}</span></td>
              <td className="amount-cell">{inr(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillsList({ rows }) {
  if (!rows.length) return <div className="empty-state">No upcoming bills match your search.</div>;
  return (
    <div className="bill-list">
      {rows.map((row, index) => (
        <div className="bill-row" key={`${row.vendor}-${row.due_date}-${index}`}>
          <span className="bill-icon"><Icon name="bills" size={17} /></span>
          <div className="bill-details"><b>{row.vendor}</b><span>{row.type} · due {fmtDate(row.due_date)}</span></div>
          <strong>{inr(row.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function ChaseTable({ rows }) {
  if (!rows.length) return <div className="empty-state">No overdue payments found. Your customers are up to date.</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Rank</th><th>Customer</th><th>Invoice</th><th>Amount due</th><th>Days late</th><th>Usual delay</th><th>Priority</th></tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const priority = row.days_overdue > 15 || row.avg_delay_days > 20
              ? ["high", "High"]
              : row.days_overdue > 0 || row.avg_delay_days > 7
                ? ["medium", "Medium"]
                : ["low", "Low"];
            return (
              <tr key={row.invoice_id}>
                <td><span className={`rank-badge ${index === 0 ? "first" : ""}`}>{String(index + 1).padStart(2, "0")}</span></td>
                <td><b>{row.customer_id}</b></td>
                <td>{row.invoice_id}</td>
                <td className="amount-cell">{inr(row.amount)}</td>
                <td><b>{days(Math.max(0, row.days_overdue))}</b></td>
                <td>{days(Math.round(row.avg_delay_days))}</td>
                <td><span className={`status-pill ${priority[0]}`}>{priority[1]}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Insights({ overview, forecast, summary, backtest }) {
  const overdue = overview.pending_invoices.filter((row) => row.days_overdue > 0);
  const overdueAmount = sum(overdue, "amount");
  const margin = summary.income ? ((summary.income - summary.expenses) / summary.income) * 100 : 0;
  const items = [
    forecast.alert
      ? {
          tone: "warning",
          title: "Potential cash shortage",
          body: `The conservative forecast may dip below the ${bufferText(forecast)} safety buffer around ${fmtDate(forecast.alert.date)}. Estimated gap: ${inr(forecast.alert.gap)}.`,
        }
      : {
          tone: "positive",
          title: "Cash buffer looks steady",
          body: `The conservative forecast stays above the ${bufferText(forecast)} safety buffer over the next 30 days.`,
        },
    {
      tone: overdue.length ? "warning" : "positive",
      title: overdue.length ? "Overdue customer payments" : "No overdue invoices",
      body: overdue.length
        ? `${overdue.length} invoices are overdue, totaling ${inr(overdueAmount)}. Start with ${overdue[0].customer_id}.`
        : "There are no late customer balances to follow up on right now.",
    },
    {
      tone: margin >= 0 ? "positive" : "warning",
      title: "Spending pattern",
      body: `Income is ${inr(summary.income)} and expenses are ${inr(summary.expenses)} for the selected period, a net ${margin >= 0 ? "surplus" : "deficit"} of ${inr(Math.abs(summary.income - summary.expenses))}.`,
    },
  ];
  if (overview.upcoming_bills[0]) {
    const bill = overview.upcoming_bills[0];
    items.push({
      tone: "neutral",
      title: "Next scheduled bill",
      body: `${bill.vendor} · ${inr(bill.amount)} due ${fmtDate(bill.due_date)}.`,
    });
  }
  if (backtest) {
    items.push({
      tone: "neutral",
      title: "Forecast backtest",
      body: `Recent sales backtest MAPE: ${backtest.sales_mape_pct}% (MAE ${inr(backtest.sales_mae)}).`,
    });
  }
  return (
    <div className="insight-list">
      {items.map((item) => (
        <article className={`insight ${item.tone}`} key={item.title}>
          <span className="insight-mark"><Icon name={item.tone === "warning" ? "bell" : "forecast"} size={16} /></span>
          <div><b>{item.title}</b><p>{item.body}</p></div>
        </article>
      ))}
    </div>
  );
}

function Upload({ onImported }) {
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [uploading, setUploading] = useState("");
  const columns = {
    sales: "date, amount",
    invoices: "invoice_id, customer_id, issue_date, due_date, amount, paid_date",
    bills: "vendor, due_date, amount, type",
    expenses: "date, category, amount",
    balance: "opening_balance",
  };

  async function send(table, file) {
    if (!file) return;
    setUploading(table);
    setMessage("");
    setMessageError(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API}/api/upload/${table}`, { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || result.detail || `Upload failed (${response.status}).`);
      }
      setMessage(`${table}.csv uploaded. Dashboard data is refreshing.`);
      await onImported();
    } catch (error) {
      setMessage(error.message || "Upload failed. Check the API connection and try again.");
      setMessageError(true);
    } finally {
      setUploading("");
    }
  }

  return (
    <section className="settings-layout">
      <div className="card settings-intro">
        <span className="eyebrow">DATA MANAGEMENT</span>
        <h2>Connect your books</h2>
        <p>Import CSV files to replace the prototype tables. Use the exact column names below. Uploads are sent to the connected BizCash API.</p>
        <div className="data-note"><b>Data integrity note</b><span>The repository-seeded invoices, bills and expenses are synthetic. Import your own files before using this dashboard for business decisions.</span></div>
        {message && <div className={`inline-message ${messageError ? "error" : ""}`} role="status">{message}</div>}
      </div>
      <div className="upload-grid">
        {Object.entries(columns).map(([table, headers]) => (
          <label className="upload-card" key={table}>
            <span className="upload-file-icon"><Icon name="transactions" /></span>
            <b>{table}.csv</b>
            <small>{headers}</small>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={uploading !== ""}
              onChange={(event) => {
                void send(table, event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <span className="upload-button">{uploading === table ? "Uploading…" : "Choose CSV"}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

async function getJson(url) {
  const response = await fetch(`${API}${url}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function EmptySearch({ query }) {
  return <div className="empty-state">No results for “{query}”. Try a different search.</div>;
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState(30);
  const [extraDelay, setExtraDelay] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [overview, setOverview] = useState(DEMO_OVERVIEW);
  const [forecast, setForecast] = useState(DEMO_FORECAST);
  const [backtest, setBacktest] = useState(null);
  const [overviewError, setOverviewError] = useState("");
  const [forecastError, setForecastError] = useState("");
  const [backtestError, setBacktestError] = useState("");
  const [overviewConnected, setOverviewConnected] = useState(false);
  const [forecastConnected, setForecastConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setSearch("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    let active = true;
    getJson("/api/overview")
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setOverviewError("");
        setOverviewConnected(true);
      })
      .catch((error) => {
        if (!active) return;
        setOverview(DEMO_OVERVIEW);
        setOverviewError(`Overview API unavailable (${error.message}); showing sample data.`);
        setOverviewConnected(false);
      });
    getJson("/api/backtest")
      .then((data) => {
        if (!active) return;
        setBacktest(data);
        setBacktestError("");
      })
      .catch((error) => {
        if (!active) return;
        setBacktest(null);
        setBacktestError(`Backtest unavailable (${error.message}).`);
      });
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getJson(`/api/forecast?extra_delay=${extraDelay}&runs=${RUNS}`)
      .then((data) => {
        if (!active) return;
        setForecast(data);
        setForecastError("");
        setForecastConnected(true);
      })
      .catch((error) => {
        if (!active) return;
        setForecast(DEMO_FORECAST);
        setForecastError(`Forecast API unavailable (${error.message}); showing sample data.`);
        setForecastConnected(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [extraDelay, refreshKey]);

  const navItem = NAV.find((item) => item.id === page) || NAV[0];
  const asOf = overview.as_of || DEMO_OVERVIEW.as_of;
  const cutoff = shiftDate(asOf, -range + 1);
  const history = (overview.daily_history || []).filter((row) => row.date >= cutoff && row.date <= asOf);
  const summary = useMemo(() => {
    if (!history.length) return { income: overview.total_income || 0, expenses: overview.total_expenses || 0 };
    return { income: Math.round(sum(history, "income")), expenses: Math.round(sum(history, "expenses")) };
  }, [history, overview]);
  const rangeLabel = RANGE_OPTIONS.find((option) => option.days === range)?.label || "Last 30 days";
  const matchesSearch = (row) =>
    !search.trim() || Object.values(row).join(" ").toLowerCase().includes(search.trim().toLowerCase());
  const transactions = (overview.recent_transactions || [])
    .filter((row) => row.date >= cutoff && row.date <= asOf && matchesSearch(row))
    .sort((a, b) => b.date.localeCompare(a.date));
  const invoices = (overview.pending_invoices || []).filter(matchesSearch);
  const bills = (overview.upcoming_bills || []).filter(matchesSearch);
  const chase = (forecast.chase || []).filter(matchesSearch);

  // Build the monthly chart from the daily records selected by the date range.
  // This allows the chart to show 12 months when the API provides a full year.
  const monthlyMap = new Map();
  history.forEach((row) => {
    const month = row.date.slice(0, 7);
    const current = monthlyMap.get(month) || { month, income: 0, expenses: 0 };
    current.income += Number(row.income) || 0;
    current.expenses += Number(row.expenses) || 0;
    monthlyMap.set(month, current);
  });
  const monthsToShow = range === 365 ? 12 : Math.ceil(range / 30);
  const months = [...monthlyMap.values()].slice(-monthsToShow).map((row) => ({
    ...row,
    income: Math.round(row.income),
    expenses: Math.round(row.expenses),
  }));

  const overdueCount = (overview.pending_invoices || []).filter((row) => row.days_overdue > 0).length;
  const hasSampleData = !overviewConnected || !forecastConnected;
  const subtitle = {
    dashboard: "A clearer view of your business finances",
    cashflow: "Track cash coming in and going out",
    transactions: "A searchable view of recent account activity",
    invoices: "Keep open receivables on your radar",
    bills: "Stay ahead of upcoming business costs",
    forecast: "Explore your projected cash position",
    customers: "Prioritize overdue payments with AI-assisted scoring",
    reports: "Understand income and expense trends",
    settings: "Manage your data connection",
  }[page];

  function navigate(nextPage) {
    setPage(nextPage);
    setMobileMenu(false);
    setShowNotifications(false);
  }

  function toggleSidebar() {
    if (window.innerWidth <= 900) setMobileMenu((value) => !value);
    else setCollapsed((value) => !value);
  }

  const plan = closeGap(forecast.alert, forecast.chase);
  const cashAlert = forecast.alert
    ? `Cash buffer risk · ${fmtDate(forecast.alert.date)}`
    : "Cash forecast is above the safety buffer";

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="cashflow" size={23} /></span>
          <span className="brand-copy"><b>BizCash</b><small>FINANCIAL INTELLIGENCE</small></span>
          <button className="sidebar-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-label="Collapse sidebar">
            <Icon name="collapse" size={17} />
          </button>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <button
              className={`nav-item ${page === item.id ? "active" : ""}`}
              key={item.id}
              type="button"
              title={collapsed ? item.label : undefined}
              onClick={() => navigate(item.id)}
              aria-current={page === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span className="nav-copy"><b>{item.label}</b><small>{item.hint}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><Icon name="forecast" size={16} /></span><b>Plan with confidence</b><p>Your 30-day cash outlook is ready to explore.</p></div>
          <div className="sidebar-foot"><span className="online-dot" />BizCash workspace</div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" type="button" onClick={toggleSidebar} aria-label={mobileMenu ? "Close menu" : "Toggle sidebar"}>
              <Icon name={mobileMenu ? "collapse" : "menu"} />
            </button>
            <div className="page-heading"><span className="eyebrow">{navItem.label.toUpperCase()}</span><h1>{navItem.label}</h1></div>
          </div>
          <div className="topbar-tools">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." aria-label="Search transactions, invoices, and bills" />
              {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
              <kbd>Ctrl K</kbd>
            </label>
            {page !== "settings" && <DateFilter value={range} onChange={setRange} />}
            <div className="notification-wrap">
              <button className={`icon-button ${showNotifications ? "selected" : ""}`} type="button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((value) => !value)}>
                <Icon name="bell" />
                {overdueCount + (forecast.alert ? 1 : 0) > 0 && <i className="notification-dot" />}
              </button>
              {showNotifications && (
                <div className="notification-popover">
                  <b>Notifications</b>
                  {forecast.alert && <button type="button" onClick={() => navigate("forecast")}><span className="notification-indicator warning" />{cashAlert}</button>}
                  {overdueCount > 0 && <button type="button" onClick={() => navigate("invoices")}><span className="notification-indicator blue" />{overdueCount} overdue {overdueCount === 1 ? "invoice" : "invoices"} need attention</button>}
                  {!forecast.alert && overdueCount === 0 && <p>You're all caught up. No urgent finance alerts.</p>}
                </div>
              )}
            </div>
            <div className="profile">
              <span className="profile-avatar">BC</span>
              <span className="profile-copy"><b>Business owner</b><small>Administrator</small></span>
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="content-heading">
            <div><h2>{page === "dashboard" ? "Good to see you" : navItem.label}</h2><p>{subtitle}</p></div>
            <div className="content-meta">
              {hasSampleData
                ? <span className="data-badge sample"><i />Sample data</span>
                : <span className="data-badge connected"><i />API connected · prototype dataset</span>}
              <span className="as-of">As of {fmtDate(asOf, { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {(overviewError || forecastError) && (
            <div className="api-notice" role="status">
              <b>Showing sample data.</b> {overviewError || forecastError}
            </div>
          )}

          {page === "settings" ? (
            <Upload onImported={() => setRefreshKey((value) => value + 1)} />
          ) : loading && !forecast ? (
            <div className="loading-state"><span className="loading-spinner" />Preparing your cash flow view…</div>
          ) : (
            <>
              {page === "dashboard" && (
                <>
                  <Kpis overview={overview} forecast={forecast} summary={summary} rangeLabel={rangeLabel} dashboard />
                  <div className={`forecast-banner ${forecast.alert ? "risk" : "healthy"}`}>
                    <span className="banner-icon"><Icon name={forecast.alert ? "bell" : "forecast"} /></span>
                    <div><b>{forecast.alert ? "Cash flow needs attention" : "Your cash outlook is looking steady"}</b><p>{forecast.alert ? `Projected balance could fall below your safety buffer by ${fmtDate(forecast.alert.date)}. Estimated gap ${inr(forecast.alert.gap)}.${plan ? ` Collecting ${plan.picks.map((r) => r.invoice_id).join(", ")} (${inr(plan.total)}) ${plan.covers ? "would cover it" : "would help close it"}.` : ""}` : `No balance dip below the ${bufferText(forecast)} safety buffer is projected over the next 30 days.`}</p></div>
                    <button type="button" onClick={() => navigate("forecast")}>View forecast <span>→</span></button>
                  </div>
                  <div className="dashboard-grid">
                    <section className="card balance-card">
                      <CardHeader title="Cash balance forecast" subtitle="Reconstructed history and 30-day projected range" action={<span className="chart-tag"><i />Expected balance</span>} />
                      <BalanceChart history={history} forecast={forecast} />
                    </section>
                    <section className="card compact-card">
                      <CardHeader title="Upcoming bills" subtitle="Due in the next 45 days" action={<button className="text-link" type="button" onClick={() => navigate("bills")}>All bills →</button>} />
                      <BillsList rows={bills.slice(0, 4)} />
                    </section>
                  </div>
                  <section className="card chase-card">
                    <CardHeader
                      title="Who to chase first"
                      subtitle={`${forecast.open_invoices} open invoices · ${inr(forecast.open_amount)} outstanding · ranked by amount and lateness`}
                      action={<button className="text-link" type="button" onClick={() => navigate("customers")}>View full list <span>→</span></button>}
                    />
                    <ChaseTable rows={chase.slice(0, 5)} />
                  </section>
                </>
              )}

              {page === "cashflow" && (
                <>
                  <Kpis overview={overview} forecast={forecast} summary={summary} rangeLabel={rangeLabel} />
                  <section className="card"><CardHeader title="Cash movement" subtitle={`${rangeLabel} history and next 30 days expected inflows / outflows`} /><FlowChart history={history} forecast={forecast} /></section>
                  <section className="card"><CardHeader title="Balance trend" subtitle="Reconstructed from daily flows and current cash, alongside the forecast range" /><BalanceChart history={history} forecast={forecast} /></section>
                </>
              )}

              {page === "transactions" && (
                <section className="card">
                  <CardHeader title="Recent transactions" subtitle={`${transactions.length} matching records · ${rangeLabel.toLowerCase()}`} />
                  {search && !transactions.length ? <EmptySearch query={search} /> : <TransactionsTable rows={transactions.slice(0, 100)} />}
                </section>
              )}

              {page === "invoices" && (
                <section className="card">
                  <CardHeader title="Open invoices" subtitle={`${invoices.length} matching · ${inr(sum(invoices, "amount"))} outstanding`} />
                  {search && !invoices.length ? <EmptySearch query={search} /> : <InvoiceTable rows={invoices} />}
                </section>
              )}

              {page === "bills" && (
                <section className="card">
                  <CardHeader title="Upcoming bills" subtitle={`${bills.length} matching bills · next 45 days`} />
                  {search && !bills.length ? <EmptySearch query={search} /> : <BillsList rows={bills} />}
                </section>
              )}

              {page === "forecast" && (
                <>
                  <section className="card forecast-detail">
                    <CardHeader title="30-day cash balance forecast" subtitle="Reconstructed cash history and 10th–90th percentile forecast range" action={<><span className="forecast-method">{RUNS.toLocaleString("en-IN")}-run Monte Carlo</span> <a className="text-link" href={`/api/chart/forecast?extra_delay=${extraDelay}`} target="_blank" rel="noreferrer">Open Plotly chart ↗</a></>} />
                    {forecast.alert && <div className="forecast-inline-alert"><Icon name="bell" size={17} /><span>Potential buffer breach on <b>{fmtDate(forecast.alert.date)}</b> · estimated gap {inr(forecast.alert.gap)}</span></div>}
                    <BalanceChart history={history} forecast={forecast} />
                  </section>
                  <section className="card scenario-card">
                    <div className="scenario-heading"><span className="scenario-icon"><Icon name="forecast" /></span><div><h2>Payment delay scenario</h2><p>Stress-test how slower collections affect your expected cash.</p></div><strong>+{extraDelay} days</strong></div>
                    <input type="range" min="0" max="20" value={extraDelay} aria-label="Additional customer payment delay in days" onChange={(event) => setExtraDelay(Number(event.target.value))} />
                    <div className="slider-labels"><span>On time</span><span>20 days later</span></div>
                    {loading && <small className="scenario-status"><span className="loading-spinner small" /> Re-running the forecast…</small>}
                  </section>
                </>
              )}

              {page === "customers" && (
                <section className="card chase-card">
                  <CardHeader title="Who to chase first" subtitle="A practical priority order based on amount overdue, typical delay and urgency" />
                  <div className="chase-summary"><span><b>{forecast.open_invoices}</b> open invoices</span><span><b>{inr(forecast.open_amount)}</b> outstanding</span><span><b>{invoices.filter((row) => row.days_overdue > 0).length}</b> past due</span></div>
                  {search && !chase.length ? <EmptySearch query={search} /> : <ChaseTable rows={chase} />}
                </section>
              )}

              {page === "reports" && (
                <>
                  <Kpis overview={overview} forecast={forecast} summary={summary} rangeLabel={rangeLabel} />
                  <section className="card"><CardHeader title="Monthly income vs expenses" subtitle="Sales, collections, bills and operating expenses" /><MonthlyChart rows={months} /></section>
                  <section className="card"><CardHeader title="Financial insights" subtitle="Period-based indicators and forecast context" /><Insights overview={overview} forecast={forecast} summary={summary} backtest={backtest} />{backtestError && <p className="muted-note">{backtestError}</p>}</section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
