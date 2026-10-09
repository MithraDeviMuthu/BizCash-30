import React, { useState } from 'react';

const KPI_DATA = [
  { id: 'income', title: 'Total Income', value: '₹2,48,000', trendText: '↑ 12% vs. last 30 days', trendType: 'positive' },
  { id: 'expenses', title: 'Total Expenses', value: '₹1,35,000', trendText: '↑ 8% vs. last 30 days', trendType: 'warning' },
  { id: 'net_cash', title: 'Net Cash Flow', value: '₹1,13,000', trendText: '↑ 15% vs. last 30 days', trendType: 'positive' },
  { id: 'risk', title: 'Shortfall Risk', value: '32%', trendText: '', trendType: 'danger', subtext: 'Chance of dropping below buffer' },
];

const CUSTOMER_PERFORMANCE = [
  { id: '1', customer: 'ABC Traders', avgDays: 12, risk: 'Low', status: 'On time' },
  { id: '2', customer: 'Global Mart', avgDays: 28, risk: 'Medium', status: 'Due in 3 days' },
  { id: '3', customer: 'Sunrise Pvt Ltd', avgDays: 41, risk: 'High', status: 'Overdue (7 days)' },
  { id: '4', customer: 'Delta Stores', avgDays: 22, risk: 'Medium', status: 'Due in 5 days' },
  { id: '5', customer: 'Fresh Foods', avgDays: 15, risk: 'Low', status: 'On time' },
];

const EXPENSE_BREAKDOWN = [
  { category: 'Salaries', percentage: 32, amount: 43200, color: '#3B82F6' },
  { category: 'Rent', percentage: 22, amount: 29700, color: '#F59E0B' },
  { category: 'Raw materials', percentage: 18, amount: 24300, color: '#10B981' },
  { category: 'Utilities', percentage: 10, amount: 13500, color: '#8B5CF6' },
  { category: 'Marketing', percentage: 8, amount: 10800, color: '#EC4899' },
  { category: 'Others', percentage: 10, amount: 13500, color: '#64748B' },
];

const MONTHLY_SALES_EXPENSES = [
  { month: 'Apr', sales: 180000, expenses: 110000 },
  { month: 'May', sales: 210000, expenses: 125000 },
  { month: 'Jun', sales: 195000, expenses: 130000 },
  { month: 'Jul', sales: 230000, expenses: 140000 },
  { month: 'Aug', sales: 220000, expenses: 128000 },
  { month: 'Sep', sales: 248000, expenses: 135000 },
];

const KEY_INSIGHTS = [
  { id: 'ins-1', type: 'overdue', title: 'Overdue invoice', description: 'Invoice #1023 (Sunrise Pvt Ltd) is 7 days overdue', color: '#EF4444' },
  { id: 'ins-2', type: 'risk', title: 'High-risk customer', description: 'Sunrise Pvt Ltd has a 41-day avg. payment time', color: '#F59E0B' },
  { id: 'ins-3', type: 'shortfall', title: 'Upcoming shortfall', description: 'Potential shortfall of ₹40,800 around Day 14-15', color: '#3B82F6' },
];

const WHO_TO_CHASE = [
  { rank: 1, customer: 'Sunrise Pvt Ltd', invoiceNo: '#1023', amount: '₹45,000', daysOverdue: 7, priority: 'High' },
  { rank: 2, customer: 'Delta Stores', invoiceNo: '#1018', amount: '₹32,000', daysOverdue: 5, priority: 'Medium' },
];

const CASH_FLOW_FORECAST = [
  { day: 1, balance: 75000 }, { day: 4, balance: 72000 }, { day: 7, balance: 64000 },
  { day: 10, balance: 48000 }, { day: 12, balance: 36000 }, { day: 14, balance: 28500, isDip: true },
  { day: 17, balance: 42000 }, { day: 20, balance: 58000 }, { day: 24, balance: 74000 },
  { day: 27, balance: 82000 }, { day: 30, balance: 87500 }
];

const Icons = {
  Dashboard: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
  ),
  Sales: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
  ),
  Invoices: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  ),
  Bills: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
  ),
  Expenses: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
  ),
  Bank: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>
  ),
  Reports: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
  ),
  Settings: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  ),
  Spark: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
  ),
  User: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
  ),
  Lock: () => (
    <svg width="12" height="12" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
  ),
  Send: () => (
    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
  ),
  Check: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
  ),
  Menu: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
  ),
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFramed, setIsFramed] = useState(true);
  const [hoveredExpense, setHoveredExpense] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [chasedInvoices, setChasedInvoices] = useState([]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
    { id: 'sales', label: 'Sales', icon: Icons.Sales },
    { id: 'invoices', label: 'Invoices', icon: Icons.Invoices },
    { id: 'bills', label: 'Bills', icon: Icons.Bills },
    { id: 'expenses', label: 'Expenses', icon: Icons.Expenses },
    { id: 'bank', label: 'Bank', icon: Icons.Bank },
    { id: 'reports', label: 'Reports', icon: Icons.Reports },
    { id: 'settings', label: 'Settings', icon: Icons.Settings },
  ];

  const handleChase = (invoiceNo) => {
    setChasedInvoices((prev) => [...prev, invoiceNo]);
  };

  return (
    <div className={`app-wrapper ${isFramed ? 'framed' : ''}`}>
      <div className="app-window">
        {/* Top Browser Bar */}
        <div className="window-chrome">
          <div className="traffic-lights">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>

          <div className="address-bar">
            <div className="address-bar-inner">
              <Icons.Lock />
              <span>app.bizcash30.in/dashboard</span>
            </div>
          </div>

          <button onClick={() => setIsFramed(!isFramed)} className="view-toggle-btn">
            {isFramed ? 'Full View' : 'Frame View'}
          </button>
        </div>

        {/* Workspace Layout */}
        <div className="workspace-layout">
          {/* Sidebar */}
          <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div>
              <div className="sidebar-header">
                <div className="logo-badge">
                  <Icons.Spark />
                </div>
                <div className="brand-info">
                  <h1>BizCash 30</h1>
                  <p>PREDICT • PLAN • GROW</p>
                </div>
              </div>

              <nav className="nav-menu">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="sidebar-profile">
              <div className="profile-card">
                <div className="profile-avatar">
                  <Icons.User />
                </div>
                <div className="profile-details">
                  <p>My Business</p>
                  <p>Business account</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Dashboard */}
          <main className="main-content">
            <div className="dashboard-header">
              <div className="header-greeting-wrap">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="mobile-menu-btn"
                  aria-label="Toggle Navigation"
                >
                  <Icons.Menu />
                </button>
                <div>
                  <h2 className="greeting-title">
                    Good morning <span className="animate-wave">👋</span>
                  </h2>
                  <p className="greeting-subtitle">
                    Here's your 30-day cash flow overview.
                  </p>
                </div>
              </div>

              <div className="date-widget">
                <Icons.Calendar />
                <div>
                  <span className="date-label">TODAY</span>
                  <span className="date-value">27 Sept 2026</span>
                </div>
              </div>
            </div>

            {currentTab === 'dashboard' ? (
              <div className="dashboard-body">
                {/* 1. KPI Cards */}
                <div className="kpi-grid">
                  {KPI_DATA.map((kpi) => (
                    <div key={kpi.id} className="card kpi-card">
                      <div>
                        <p className="kpi-title">{kpi.title}</p>
                        <h3 className={`kpi-value ${kpi.id === 'risk' ? 'danger' : ''}`}>
                          {kpi.value}
                        </h3>
                      </div>
                      <div>
                        {kpi.trendText ? (
                          <span className={`kpi-trend ${kpi.trendType}`}>
                            {kpi.trendText}
                          </span>
                        ) : (
                          <span className="kpi-subtext">{kpi.subtext}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Forecast Chart (7fr) & Customer Payment Performance (5fr) */}
                <div className="grid-row-2">
                  <div className="card">
                    <div>
                      <h3 className="card-title">30-Day Cash Flow Forecast</h3>
                      <p className="card-subtitle">
                        Predicted daily balance for the next 30 days
                      </p>
                    </div>

                    <div className="chart-wrapper">
                      <svg viewBox="0 0 640 220" className="chart-svg">
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.06" />
                          </linearGradient>
                        </defs>

                        <g stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4">
                          <line x1="40" y1="35" x2="620" y2="35" />
                          <line x1="40" y1="80" x2="620" y2="80" />
                          <line x1="40" y1="125" x2="620" y2="125" />
                          <line x1="40" y1="170" x2="620" y2="170" />
                        </g>

                        <text x="32" y="38" textAnchor="end" fill="#94A3B8" fontSize="10">75k</text>
                        <text x="32" y="83" textAnchor="end" fill="#94A3B8" fontSize="10">50k</text>
                        <text x="32" y="128" textAnchor="end" fill="#94A3B8" fontSize="10">25k</text>
                        <text x="32" y="173" textAnchor="end" fill="#94A3B8" fontSize="10">0</text>

                        <line x1="285" y1="20" x2="285" y2="170" stroke="#CBD5E1" strokeWidth="1.2" strokeDasharray="3 3" />

                        <path
                          d="M 50 35 C 130 38, 210 90, 285 140 C 350 100, 460 40, 610 32 L 610 52 C 460 60, 350 125, 285 160 C 210 115, 130 60, 50 55 Z"
                          fill="url(#areaGradient)"
                        />

                        <path
                          d="M 50 45 C 130 48, 210 102, 285 150 C 350 112, 460 50, 610 40"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        <g>
                          <circle cx="285" cy="150" r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                          <text x="295" y="153" fill="#EF4444" fontSize="10" fontWeight="600">
                            ₹28,500 Dip (Day 14)
                          </text>
                        </g>

                        {CASH_FLOW_FORECAST.map((pt, idx) => {
                          const x = 50 + (idx / (CASH_FLOW_FORECAST.length - 1)) * 560;
                          return (
                            <circle
                              key={pt.day}
                              cx={x}
                              cy={150 - (pt.balance / 100000) * 110 + 40}
                              r="8"
                              fill="transparent"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredDay(pt)}
                              onMouseLeave={() => setHoveredDay(null)}
                            />
                          );
                        })}
                      </svg>

                      <div className="chart-footer">
                        <div className="chart-legend-wrap">
                          <span className="legend-item">
                            <span className="legend-dot-blue"></span>
                            Forecast curve
                          </span>
                          <span className="legend-item">
                            <span className="legend-rect-buffer"></span>
                            Confidence buffer
                          </span>
                        </div>
                        <span>
                          {hoveredDay
                            ? `Day ${hoveredDay.day}: ₹${hoveredDay.balance.toLocaleString('en-IN')}`
                            : 'Day 1 to 30'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div>
                      <h3 className="card-title">Customer Payment Performance</h3>
                      <p className="card-subtitle">Avg payment behaviour & risk level</p>
                    </div>

                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th className="text-center">Avg (days)</th>
                            <th className="text-center">Risk</th>
                            <th className="text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CUSTOMER_PERFORMANCE.map((item) => (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 600 }}>{item.customer}</td>
                              <td className="text-center" style={{ color: '#475569' }}>{item.avgDays}</td>
                              <td className="text-center">
                                <span className={`badge badge-${item.risk.toLowerCase()}`}>
                                  {item.risk}
                                </span>
                              </td>
                              <td className={`text-right ${item.status.includes('Overdue') ? 'status-overdue' : ''}`}>
                                {item.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 3. Expense Breakdown + Sales vs Expenses + Key Insights */}
                <div className="grid-row-3">
                  <div className="card">
                    <div>
                      <h3 className="card-title">Expense Breakdown</h3>
                      <p className="card-subtitle">₹1,35,000 total this month</p>
                    </div>

                    <div className="donut-layout">
                      <div className="donut-graphic">
                        <svg width="130" height="130" className="donut-svg">
                          <circle cx="65" cy="65" r="53" fill="transparent" stroke="#3B82F6" strokeWidth="24" strokeDasharray="106.5 333" strokeDashoffset="0" />
                          <circle cx="65" cy="65" r="53" fill="transparent" stroke="#F59E0B" strokeWidth="24" strokeDasharray="73.2 333" strokeDashoffset="-106.5" />
                          <circle cx="65" cy="65" r="53" fill="transparent" stroke="#10B981" strokeWidth="24" strokeDasharray="60.0 333" strokeDashoffset="-179.7" />
                          <circle cx="65" cy="65" r="53" fill="transparent" stroke="#8B5CF6" strokeWidth="24" strokeDasharray="33.3 333" strokeDashoffset="-239.7" />
                          <circle cx="65" cy="65" r="53" fill="transparent" stroke="#EC4899" strokeWidth="24" strokeDasharray="26.6 333" strokeDashoffset="-273.0" />
                          <circle cx="65" cy="65" r="53" fill="transparent" stroke="#64748B" strokeWidth="24" strokeDasharray="33.3 333" strokeDashoffset="-299.6" />
                        </svg>
                        <div className="donut-center-label">
                          <span className="donut-center-amount">
                            {hoveredExpense ? `₹${hoveredExpense.amount.toLocaleString('en-IN')}` : '₹1,35,000'}
                          </span>
                          <span className="donut-center-sub">
                            {hoveredExpense ? hoveredExpense.category : 'Total'}
                          </span>
                        </div>
                      </div>

                      <div className="donut-legend">
                        {EXPENSE_BREAKDOWN.map((exp) => (
                          <div
                            key={exp.category}
                            onMouseEnter={() => setHoveredExpense(exp)}
                            onMouseLeave={() => setHoveredExpense(null)}
                            className="legend-row"
                          >
                            <span className="legend-row-left">
                              <span className="legend-dot" style={{ backgroundColor: exp.color }}></span>
                              {exp.category}
                            </span>
                            <span className="legend-row-pct">{exp.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div>
                      <h3 className="card-title">Sales vs Expenses</h3>
                      <p className="card-subtitle">Monthly comparison (last 6 months)</p>
                    </div>

                    <div className="bars-section">
                      <div className="bars-chart">
                        {MONTHLY_SALES_EXPENSES.map((item) => (
                          <div
                            key={item.month}
                            onMouseEnter={() => setHoveredMonth(item)}
                            onMouseLeave={() => setHoveredMonth(null)}
                            className="bar-pair"
                          >
                            <div
                              className="bar-col-sales"
                              style={{ height: `${(item.sales / 260000) * 105}px` }}
                            ></div>
                            <div
                              className="bar-col-expenses"
                              style={{ height: `${(item.expenses / 260000) * 105}px` }}
                            ></div>
                          </div>
                        ))}
                      </div>

                      <div className="bars-labels">
                        {MONTHLY_SALES_EXPENSES.map((item) => (
                          <span key={item.month}>{item.month}</span>
                        ))}
                      </div>

                      <div className="bars-legend">
                        <span className="legend-item">
                          <span className="legend-dot-blue"></span> Sales
                        </span>
                        <span className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: '#93C5FD' }}></span> Expenses
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div>
                      <h3 className="card-title">Key Insights & Actions</h3>
                      <p className="card-subtitle">What needs your attention</p>
                    </div>

                    <div className="insights-list">
                      {KEY_INSIGHTS.map((ins) => (
                        <div key={ins.id} className="insight-item">
                          <span
                            className="insight-dot"
                            style={{ backgroundColor: ins.color }}
                          ></span>
                          <div>
                            <p className="insight-title">{ins.title}</p>
                            <p className="insight-desc">{ins.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Who to Chase First */}
                <div className="card">
                  <div>
                    <h3 className="card-title">Who to Chase First</h3>
                    <p className="card-subtitle">
                      Overdue invoices ranked by amount and days past due
                    </p>
                  </div>

                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '32px' }}>#</th>
                          <th>Customer</th>
                          <th>Invoice No</th>
                          <th>Amount</th>
                          <th className="text-center">Days overdue</th>
                          <th className="text-center">Priority</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {WHO_TO_CHASE.map((item) => {
                          const isSent = chasedInvoices.includes(item.invoiceNo);
                          return (
                            <tr key={item.invoiceNo}>
                              <td style={{ color: '#94a3b8', fontWeight: 600 }}>{item.rank}</td>
                              <td style={{ fontWeight: 600 }}>{item.customer}</td>
                              <td style={{ color: '#64748b', fontFamily: 'monospace' }}>{item.invoiceNo}</td>
                              <td style={{ fontWeight: 700 }}>{item.amount}</td>
                              <td className="text-center" style={{ color: '#475569' }}>{item.daysOverdue}</td>
                              <td className="text-center">
                                <span className={`badge badge-${item.priority.toLowerCase()}`}>
                                  {item.priority}
                                </span>
                              </td>
                              <td className="text-right">
                                <button
                                  onClick={() => handleChase(item.invoiceNo)}
                                  disabled={isSent}
                                  className={`btn-action ${isSent ? 'sent' : ''}`}
                                >
                                  {isSent ? (
                                    <>
                                      <Icons.Check /> Sent
                                    </>
                                  ) : (
                                    <>
                                      <Icons.Send /> Chase
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="table-footer">
                    Better cash flow.{' '}
                    <span className="footer-highlight">Stronger tomorrow.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="placeholder-view">
                <div className="placeholder-box">
                  <h3 className="placeholder-title">{currentTab} Section</h3>
                  <p className="placeholder-desc">
                    Click back to Dashboard to view the primary cash flow overview.
                  </p>
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className="btn-primary"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}