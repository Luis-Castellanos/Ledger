import { ArrowDownLeft, ArrowUpRight, Banknote, Download, Layers3, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { activity, bars, categoryBars, ledgerStats, lineSeries, transactions } from "@/lib/sample-data";
import { formatMoney } from "@/lib/finance/money";

export default function Home() {
  return (
    <AppShell active="Dashboard">
        <section className="min-w-0">
          <header className="flex min-h-20 flex-col justify-center gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-7">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Private beta ledger</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[var(--ink-strong)] md:text-3xl">Monthly control room</h1>
            </div>
            <div className="flex items-center gap-2">
              <label className="search-field">
                <Search size={16} />
                <input aria-label="Search transactions" placeholder="Search ledger" />
              </label>
              <button className="icon-button" aria-label="Export backup package">
                <Download size={17} />
              </button>
            </div>
          </header>

          <div className="grid min-h-[calc(100vh-7.5rem)] grid-cols-1 xl:grid-cols-[minmax(380px,0.84fr)_minmax(0,1.4fr)]">
            <section className="grid min-w-0 auto-rows-min gap-0 border-b border-[var(--line)] xl:border-b-0 xl:border-r">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {ledgerStats.map((stat) => (
                  <article className="stat-panel" key={stat.label}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="panel-label">{stat.label}</p>
                        <p className="mt-1 font-mono text-xl text-[var(--ink-strong)]">{stat.value}</p>
                      </div>
                      <span className={stat.delta.startsWith("+") ? "delta-up" : "delta-down"}>{stat.delta}</span>
                    </div>
                    <MiniLine trend={stat.trend} tone={stat.tone} />
                  </article>
                ))}
              </div>

              <article className="panel min-h-[560px] border-t border-[var(--line)]">
                <div className="panel-header">
                  <div>
                    <p className="panel-label">Transactions</p>
                    <h2 className="panel-title">Recent ledger activity</h2>
                  </div>
                  <button className="text-button">View all</button>
                </div>
                <div className="transaction-list">
                  {transactions.map((transaction) => (
                    <div className="transaction-row" key={`${transaction.merchant}-${transaction.time}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="transaction-icon" style={{ "--tile": transaction.color } as React.CSSProperties}>
                          {transaction.direction === "in" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--ink-strong)]">{transaction.merchant}</p>
                          <p className="truncate font-mono text-[11px] text-[var(--muted)]">{transaction.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={transaction.amount > 0 ? "amount-positive" : "amount-negative"}>{formatMoney(transaction.amount)}</p>
                        <p className="font-mono text-[11px] text-[var(--muted)]">{transaction.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid min-w-0 auto-rows-min gap-0">
              <div className="grid grid-cols-1 border-b border-[var(--line)] lg:grid-cols-2 2xl:grid-cols-3">
                <article className="panel min-h-[210px] lg:border-r lg:border-[var(--line)]">
                  <div className="panel-header">
                    <div>
                      <p className="panel-label">Total spending</p>
                      <h2 className="panel-title">{formatMoney(-83280)}</h2>
                    </div>
                    <span className="period-control">This week</span>
                  </div>
                  <CategoryBars />
                </article>
                <article className="panel min-h-[210px] border-t border-[var(--line)] lg:border-r lg:border-t-0">
                  <div className="panel-header">
                    <div>
                      <p className="panel-label">Savings</p>
                      <h2 className="panel-title">{formatMoney(251240)}</h2>
                    </div>
                    <span className="period-control">This year</span>
                  </div>
                  <AreaLine tone="coral" />
                </article>
                <article className="panel min-h-[210px] border-t border-[var(--line)] lg:border-t-0">
                  <div className="panel-header">
                    <div>
                      <p className="panel-label">Net worth</p>
                      <h2 className="panel-title">{formatMoney(12458200)}</h2>
                    </div>
                    <span className="period-control">This year</span>
                  </div>
                  <AreaLine tone="green" />
                </article>
              </div>

              <article className="panel min-h-[500px]">
                <div className="panel-header">
                  <div>
                    <p className="panel-label">Cashflow</p>
                    <h2 className="panel-title">{formatMoney(-934080)} spent</h2>
                  </div>
                  <div className="segmented" aria-label="Cashflow range">
                    <button>Day</button>
                    <button>Week</button>
                    <button>Month</button>
                    <button className="active">Year</button>
                  </div>
                </div>
                <StackedBarChart />
              </article>

              <section className="grid grid-cols-1 border-t border-[var(--line)] md:grid-cols-3">
                {activity.map((item) => (
                  <article className="summary-cell" key={item.label}>
                    <div className="flex items-center gap-3">
                      <div className="summary-icon">
                        {item.kind === "cash" ? <Banknote size={17} /> : item.kind === "rule" ? <Layers3 size={17} /> : <ShieldCheck size={17} />}
                      </div>
                      <div>
                        <p className="panel-label">{item.label}</p>
                        <p className="mt-1 text-sm text-[var(--ink-strong)]">{item.value}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </section>
          </div>
        </section>
    </AppShell>
  );
}

function MiniLine({ trend, tone }: { trend: number[]; tone: "green" | "coral" | "violet" }) {
  const max = Math.max(...trend);
  const points = trend
    .map((value, index) => `${(index / (trend.length - 1)) * 100},${100 - (value / max) * 82}`)
    .join(" ");

  return (
    <svg className={`mini-line mini-line-${tone}`} viewBox="0 0 100 100" role="img" aria-label="Trend line">
      <polyline points={points} />
    </svg>
  );
}

function CategoryBars() {
  return (
    <div className="category-bars">
      {categoryBars.map((item) => (
        <div className="category-bar" key={item.label}>
          <span>{item.share}%</span>
          <div>
            <i style={{ height: `${item.share * 1.8}px`, background: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AreaLine({ tone }: { tone: "green" | "coral" }) {
  const points = lineSeries.map((value, index) => `${36 + index * 42},${150 - value}`).join(" ");
  const area = `36,160 ${points} ${36 + (lineSeries.length - 1) * 42},160`;
  return (
    <svg className={`area-line area-line-${tone}`} viewBox="0 0 300 180" role="img" aria-label="Yearly trend">
      <polygon points={area} />
      <polyline points={points} />
      {["JAN", "FEB", "MAR", "APR", "MAY", "JUN"].map((label, index) => (
        <text key={label} x={36 + index * 42} y="174">
          {label}
        </text>
      ))}
    </svg>
  );
}

function StackedBarChart() {
  return (
    <div className="chart-shell">
      <div className="chart-grid" aria-hidden="true">
        {[1200, 1000, 800, 600, 400, 200, 0].map((tick) => (
          <span key={tick}>${tick.toLocaleString()}</span>
        ))}
      </div>
      <div className="bar-stage">
        {bars.map((bar) => (
          <div className="month-bar" key={bar.month}>
            <div className="bar-stack" style={{ height: `${bar.total}px` }}>
              {bar.parts.map((part) => (
                <i key={`${bar.month}-${part.color}`} style={{ height: `${part.value}%`, background: part.color }} />
              ))}
            </div>
            <span>{bar.month}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span style={{ "--dot": "#6d55a4" } as React.CSSProperties}>Expenses</span>
        <span style={{ "--dot": "#4c9b8b" } as React.CSSProperties}>Transfers</span>
        <span style={{ "--dot": "#d86b62" } as React.CSSProperties}>Subscriptions</span>
        <span style={{ "--dot": "#d9b96c" } as React.CSSProperties}>Grocery</span>
        <span style={{ "--dot": "#2f86c4" } as React.CSSProperties}>Shopping</span>
      </div>
    </div>
  );
}
