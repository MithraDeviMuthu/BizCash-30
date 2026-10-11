import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = "https://bizcash-30.onrender.com";
const RANGE_OPTIONS = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 180, label: "Last 6 months" },
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
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

function makeDemoOverview() {
  const today = dateKey(new Date());
  const history = [];
  const start = shiftDate(today, -179);

  for (let i = 0; i < 180; i += 1) {
    const date = shiftDate(start, i);
    const isRecent = i >= 150;
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
    monthly: [...monthMap.values()].slice(-6).map((row) => ({
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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload
        .filter((item) => item.value != null)
        .map((item) => (
          <div key={item.dataKey || item.name}>
            <span><i style={{ background: item.color || item.fill }} />{item.name}</span>
            <b>{Array.isArray(item.value) ? item.value.map(inr).join(" – ") : inr(item.value)}</b>
          </div>
        ))}
    </div>
  );
}

function ChartAxis({ dataKey = "label", interval = "preserveStartEnd" }) {
  return (
    <XAxis
      dataKey={dataKey}
      interval={interval}
      minTickGap={22}
      tick={{ fill: "#8794a8", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      tickMargin={10}
    />
  );
}

function BalanceChart({ history, forecast }) {
  const historic = history.slice(-30).map((row) => ({
    label: fmtDate(row.date),
    actual: row.balance,
  }));
  const predicted = forecast.dates.map((date, i) => ({
    label: fmtDate(date),
    expected: forecast.p50[i],
    range: [forecast.p10[i], forecast.p90[i]],
    conservative: forecast.p10[i],
  }));
  const data = [...historic, ...predicted];

  return (
    <div className="chart-canvas">
      <ResponsiveContainer width="100%" height={310}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5ba7f7" stopOpacity={0.23} />
              <stop offset="100%" stopColor="#5ba7f7" stopOpacity={0.025} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#edf1f6" vertical={false} />
          <ChartAxis />
          <YAxis
            tickFormatter={inrK}
            tick={{ fill: "#8794a8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine x={historic[historic.length - 1]?.label} stroke="#a8b4c4" strokeDasharray="4 4" />
          <ReferenceLine y={0} stroke="#cbd5e1" />
          <Area dataKey="range" name="Forecast range" stroke="none" fill="url(#forecastBand)" />
          <Line dataKey="actual" name="Reconstructed balance" stroke="#152f55" strokeWidth={2.5} dot={false} connectNulls />
          <Line dataKey="expected" name="Expected balance" stroke="#3688e8" strokeWidth={2.5} dot={false} connectNulls />
          <Line dataKey="conservative" name="Conservative case" stroke="#e49b42" strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-period-labels"><span>Reconstructed history</span><span>Forecast · next 30 days</span></div>
    </div>
  );
}

function FlowChart({ history, forecast }) {
  const actual = history.map((row) => ({
    label: fmtDate(row.date),
    income: row.income,
    expenses: row.expenses,
  }));
  const projected = forecast.dates.map((date, i) => ({
    label: fmtDate(date),
    projectedIncome: forecast.inflows?.[i] ?? 0,
    projectedExpenses: forecast.outflows?.[i] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={[...actual, ...projected]} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="#edf1f6" vertical={false} />
        <ChartAxis />
        <YAxis tickFormatter={inrK} tick={{ fill: "#8794a8", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#67768d", paddingTop: 10 }} />
        <Bar dataKey="income" name="Income" fill="#3988e8" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Bar dataKey="expenses" name="Expenses" fill="#aab8ca" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Bar dataKey="projectedIncome" name="Expected inflow" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={14} />
        <Bar dataKey="projectedExpenses" name="Expected outflow" fill="#d8e0e9" radius={[3, 3, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MonthlyChart({ rows }) {
  const data = rows.map((row) => ({
    ...row,
    label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${row.month}-15T12:00:00`)),
  }));
  return (
    <ResponsiveContainer width="100%" height={265}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={5}>
        <CartesianGrid stroke="#edf1f6" vertical={false} />
        <ChartAxis />
        <YAxis tickFormatter={inrK} tick={{ fill: "#8794a8", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#67768d", paddingTop: 10 }} />
        <Bar dataKey="income" name="Income" fill="#3988e8" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill="#aab8ca" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
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

function Kpis({ overview, forecast, summary, rangeLabel }) {
  const predicted = forecast?.p50?.[forecast.p50.length - 1];
  const items = [
    { label: "Total income", value: summary.income, note: rangeLabel, icon: "income", color: "blue" },
    { label: "Total expenses", value: summary.expenses, note: rangeLabel, icon: "expense", color: "orange" },
    { label: "Current cash balance", value: overview.available_cash, note: `As of ${fmtDate(overview.as_of)}`, icon: "wallet", color: "navy" },
    { label: "Predicted cash balance", value: predicted, note: "Expected · day 30", icon: "forecast", color: "green" },
  ];

  return (
    <section className="kpi-grid" aria-label="Financial summary">
      {items.map((item) => (
        <article className={`kpi-card ${item.color}`} key={item.label}>
          <div className="kpi-top">
            <span>{item.label}</span>
            <span className="kpi-icon"><Icon name={item.icon} size={19} /></span>
          </div>
          <strong>{inr(item.value)}</strong>
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
              <td><span className={`status-pill ${row.days_overdue > 0 ? "overdue" : "upcoming"}`}>{row.days_overdue > 0 ? `${row.days_overdue} days` : "Not overdue"}</span></td>
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
        <thead><tr><th>Rank</th><th>Customer</th><th>Invoice</th><th>Amount overdue</th><th>Days late</th><th>Usual delay</th><th>Priority</th></tr></thead>
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
                <td><b>{Math.max(0, row.days_overdue)} days</b></td>
                <td>{Math.round(row.avg_delay_days)} days</td>
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
          body: `The conservative forecast may dip below the ₹50,000 safety buffer around ${fmtDate(forecast.alert.date)}. Estimated gap: ${inr(forecast.alert.gap)}.`,
        }
      : {
          tone: "positive",
          title: "Cash buffer looks steady",
          body: "The conservative forecast stays above the ₹50,000 safety buffer over the next 30 days.",
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
    getJson(`/api/forecast?extra_delay=${extraDelay}&runs=300`)
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
  const months = (overview.monthly || []).slice(-Math.ceil(range / 30));
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
              <kbd>⌘ K</kbd>
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
          <p className="prototype-note">Seeded prototype records are synthetic. Import your business CSVs in Settings before relying on these figures.</p>

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
                  <Kpis overview={overview} forecast={forecast} summary={summary} rangeLabel={rangeLabel} />
                  <div className={`forecast-banner ${forecast.alert ? "risk" : "healthy"}`}>
                    <span className="banner-icon"><Icon name={forecast.alert ? "bell" : "forecast"} /></span>
                    <div><b>{forecast.alert ? "Cash flow needs attention" : "Your cash outlook is looking steady"}</b><p>{forecast.alert ? `Projected balance could fall below your safety buffer by ${fmtDate(forecast.alert.date)}. Estimated gap ${inr(forecast.alert.gap)}.` : "No balance dip below the ₹50,000 safety buffer is projected over the next 30 days."}</p></div>
                    <button type="button" onClick={() => navigate("forecast")}>View forecast <span>→</span></button>
                  </div>
                  <div className="dashboard-grid">
                    <section className="card balance-card">
                      <CardHeader title="Cash balance forecast" subtitle="Reconstructed history and 30-day projected range" action={<span className="chart-tag"><i />Expected balance</span>} />
                      <BalanceChart history={history} forecast={forecast} />
                    </section>
                    <section className="card flow-card">
                      <CardHeader title="Cash inflow vs outflow" subtitle={`${rangeLabel} actuals · next 30 days projected`} />
                      <FlowChart history={history} forecast={forecast} />
                    </section>
                  </div>
                  <div className="dashboard-grid">
                    <section className="card">
                      <CardHeader title="Income vs expenses" subtitle="Monthly performance" action={<span className="subtle-label">Last {months.length} months</span>} />
                      <MonthlyChart rows={months} />
                    </section>
                    <section className="card insights-card">
                      <CardHeader title="Financial insights" subtitle="Highlights based on your current data" />
                      <Insights overview={overview} forecast={forecast} summary={summary} backtest={backtest} />
                    </section>
                  </div>
                  <div className="dashboard-grid lower-grid">
                    <section className="card">
                      <CardHeader title="Recent transactions" subtitle="Latest recorded activity" action={<button className="text-link" type="button" onClick={() => navigate("transactions")}>View all <span>→</span></button>} />
                      <TransactionsTable rows={transactions.slice(0, 7)} empty={search ? "No transactions match your search." : "No transactions recorded for this period."} />
                    </section>
                    <div className="stacked-cards">
                      <section className="card compact-card">
                        <CardHeader title="Pending invoices" subtitle={`${overview.pending_invoices.length} open invoices`} action={<button className="text-link" type="button" onClick={() => navigate("invoices")}>All invoices →</button>} />
                        <InvoiceTable rows={invoices.slice(0, 4)} />
                      </section>
                      <section className="card compact-card">
                        <CardHeader title="Upcoming bills" subtitle="Due in the next 45 days" action={<button className="text-link" type="button" onClick={() => navigate("bills")}>All bills →</button>} />
                        <BillsList rows={bills.slice(0, 4)} />
                      </section>
                    </div>
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
                    <CardHeader title="30-day cash balance forecast" subtitle="Reconstructed cash history and 10th–90th percentile forecast range" action={<span className="forecast-method">300-run Monte Carlo</span>} />
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
