import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';
import { inr } from './csv';
import { loadDashboardData } from './dataLoader';

const GOA_SHOPPING_BUDGET = 20000;
const PIE_COLORS = ['#5B8DEF', '#6FD3C4', '#F59E8B', '#A78BFA', '#F6C453', '#63B3ED', '#F472B6', '#34D399'];

const { expenses, investments, subscriptions } = loadDashboardData();

const latestDate = expenses
  .map((entry) => new Date(entry.date))
  .filter((date) => !Number.isNaN(date.getTime()))
  .sort((a, b) => b - a)[0];

const activeMonth = latestDate
  ? { year: latestDate.getFullYear(), month: latestDate.getMonth() }
  : { year: new Date().getFullYear(), month: new Date().getMonth() };

const monthEntries = expenses.filter((entry) => {
  const d = new Date(entry.date);
  return d.getFullYear() === activeMonth.year && d.getMonth() === activeMonth.month;
});

const mtdTotal = monthEntries.reduce((sum, row) => sum + row.amount_inr, 0);

const goaSpent = monthEntries
  .filter((entry) => {
    const item = `${entry.item} ${entry.notes}`.toLowerCase();
    const isAirFryer = /air\s*fryer|airfryer|accessor/.test(item);
    return /goa/.test(item) && !isAirFryer;
  })
  .reduce((sum, row) => sum + row.amount_inr, 0);

const dailyLifeSpent = mtdTotal - goaSpent;

const categoryMap = new Map();
monthEntries.forEach((entry) => {
  const category = entry.category || 'Uncategorized';
  categoryMap.set(category, (categoryMap.get(category) || 0) + entry.amount_inr);
});

const categoryData = [...categoryMap.entries()]
  .map(([category, amount]) => ({
    category,
    amount,
    pct: mtdTotal ? (amount / mtdTotal) * 100 : 0,
  }))
  .sort((a, b) => b.amount - a.amount);

const spentByDay = new Map();
monthEntries.forEach((entry) => {
  const day = entry.date;
  spentByDay.set(day, (spentByDay.get(day) || 0) + entry.amount_inr);
});

const dailySpendSeries = [...spentByDay.entries()]
  .map(([date, total]) => ({ date, total, dateObj: new Date(date) }))
  .filter((row) => !Number.isNaN(row.dateObj.getTime()))
  .sort((a, b) => a.dateObj - b.dateObj);

const allWeeklySeries = buildTimeSeries(expenses).weeklyAll || [];
const weeklyAnomalyRows = [...allWeeklySeries]
  .sort((a, b) => b.total - a.total)
  .map((week) => ({
    key: week.dateObj.toISOString().slice(0, 10),
    label: week.label,
    total: week.total,
  }));

const activeSubs = subscriptions.filter((s) => /^active/.test(String(s.status).toLowerCase()));
const cancelledSubs = subscriptions.filter((s) => String(s.status).toLowerCase().includes('cancel'));

function latestByAccount(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = row.account || 'Unknown';
    const dateValue = new Date(row.date || row.timestamp || 0).getTime();
    const existing = map.get(key);
    const existingDate = existing ? new Date(existing.date || existing.timestamp || 0).getTime() : -Infinity;

    if (!existing || dateValue >= existingDate) {
      map.set(key, row);
    }
  });

  return [...map.values()];
}

const latestInvestmentRows = latestByAccount(investments);
const investmentTotal = latestInvestmentRows.reduce((sum, row) => sum + row.amount_inr, 0);
const fdTotal = latestInvestmentRows
  .filter((row) => String(row.asset_type).toLowerCase() === 'fd')
  .reduce((sum, row) => sum + row.amount_inr, 0);
const stockTotal = latestInvestmentRows
  .filter((row) => String(row.asset_type).toLowerCase().includes('stock'))
  .reduce((sum, row) => sum + row.amount_inr, 0);

function formatShortDate(dateString) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatCompactInr(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

function weekLabel(dateObj) {
  const start = new Date(dateObj);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}–${end.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })}`;
}

function buildTimeSeries(entries) {
  const parsed = entries
    .map((entry) => ({ ...entry, dateObj: new Date(entry.date) }))
    .filter((entry) => !Number.isNaN(entry.dateObj.getTime()));

  const weeklyMap = new Map();
  parsed.forEach((entry) => {
    const start = new Date(entry.dateObj);
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    const key = start.toISOString().slice(0, 10);
    const prev = weeklyMap.get(key) || { label: weekLabel(start), total: 0, dateObj: start };
    prev.total += entry.amount_inr;
    weeklyMap.set(key, prev);
  });

  const monthlyMap = new Map();
  parsed.forEach((entry) => {
    const key = `${entry.dateObj.getFullYear()}-${entry.dateObj.getMonth()}`;
    const label = entry.dateObj.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const marker = new Date(entry.dateObj.getFullYear(), entry.dateObj.getMonth(), 1);
    const prev = monthlyMap.get(key) || { label, total: 0, dateObj: marker };
    prev.total += entry.amount_inr;
    monthlyMap.set(key, prev);
  });

  const weeklySorted = [...weeklyMap.values()].sort((a, b) => a.dateObj - b.dateObj);
  const monthlySorted = [...monthlyMap.values()].sort((a, b) => a.dateObj - b.dateObj);

  return {
    weekly: weeklySorted.slice(-8),
    weeklyAll: weeklySorted,
    monthly: monthlySorted.slice(-6),
  };
}

function computeWeeklyInsights() {
  if (!dailySpendSeries.length) {
    return {
      wentWrong: 'No spend entries found for the current month yet, so there is no weekly issue pattern to flag.',
      nextWeek: 'Log expenses daily this week so trend, category pressure, and anomaly guidance can be generated reliably.',
    };
  }

  const recentWeek = dailySpendSeries.slice(-7);
  const previousWeek = dailySpendSeries.slice(-14, -7);

  const recentTotal = recentWeek.reduce((sum, d) => sum + d.total, 0);
  const previousTotal = previousWeek.reduce((sum, d) => sum + d.total, 0);

  const avgRecent = recentWeek.length ? recentTotal / recentWeek.length : 0;
  const avgPrev = previousWeek.length ? previousTotal / previousWeek.length : 0;
  const trendPct = avgPrev ? ((avgRecent - avgPrev) / avgPrev) * 100 : 0;

  const recentDates = new Set(recentWeek.map((d) => d.date));
  const recentCategoryMap = new Map();
  monthEntries
    .filter((entry) => recentDates.has(entry.date))
    .forEach((entry) => {
      const cat = entry.category || 'Uncategorized';
      recentCategoryMap.set(cat, (recentCategoryMap.get(cat) || 0) + entry.amount_inr);
    });

  const topRecentCategories = [...recentCategoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const [topCategory = ['Uncategorized', 0], secondCategory = ['-', 0]] = topRecentCategories;
  const topCategoryShare = recentTotal ? (topCategory[1] / recentTotal) * 100 : 0;

  const peakDay = [...recentWeek].sort((a, b) => b.total - a.total)[0];

  const wentWrongBits = [];
  if (recentWeek.length < 5) {
    wentWrongBits.push(`Only ${recentWeek.length} day(s) of spend data were logged in the latest week, so visibility is patchy.`);
  }
  if (peakDay) {
    wentWrongBits.push(`Peak spend day was ${formatShortDate(peakDay.date)} at ${inr(peakDay.total)}.`);
  }
  if (topCategory[1] > 0) {
    wentWrongBits.push(`${topCategory[0]} dominated at ${topCategoryShare.toFixed(1)}% of weekly spend (${inr(topCategory[1])}).`);
  }
  if (Math.abs(trendPct) >= 8 && previousWeek.length) {
    const dir = trendPct > 0 ? 'up' : 'down';
    wentWrongBits.push(`Daily average was ${dir} ${Math.abs(trendPct).toFixed(1)}% vs the previous week.`);
  }

  const nextWeekBits = [];
  if (topCategory[1] > 0) {
    nextWeekBits.push(`Set a hard cap for ${topCategory[0]} and review each spend in that category before payment.`);
  }
  if (secondCategory[1] > 0) {
    nextWeekBits.push(`Watch ${secondCategory[0]} too; these top 2 categories are driving most outflow.`);
  }
  if (peakDay) {
    nextWeekBits.push(`Pre-plan likely high-spend day around ${formatShortDate(peakDay.date)} pattern to avoid a spike like ${inr(peakDay.total)}.`);
  }
  const goaShare = mtdTotal ? (goaSpent / mtdTotal) * 100 : 0;
  if (goaShare > 20) {
    nextWeekBits.push(`Goa shopping is ${goaShare.toFixed(1)}% of MTD. Pause discretionary Goa purchases until essentials are covered.`);
  }

  return {
    wentWrong: wentWrongBits.join(' ') || 'Spending remained steady without a major weekly anomaly.',
    nextWeek: nextWeekBits.join(' ') || 'Keep daily tracking tight and hold category caps to sustain control.',
  };
}

const weeklyInsights = computeWeeklyInsights();

const goaUsagePct = GOA_SHOPPING_BUDGET ? (goaSpent / GOA_SHOPPING_BUDGET) * 100 : 0;
const goaRisk = goaUsagePct >= 100 ? 'danger' : goaUsagePct >= 75 ? 'warning' : 'success';

const recentWeek = dailySpendSeries.slice(-7);
const previousWeek = dailySpendSeries.slice(-14, -7);
const recentWeekAvg = recentWeek.length ? recentWeek.reduce((sum, row) => sum + row.total, 0) / recentWeek.length : 0;
const previousWeekAvg = previousWeek.length ? previousWeek.reduce((sum, row) => sum + row.total, 0) / previousWeek.length : 0;
const weeklyDeltaPct = previousWeekAvg ? ((recentWeekAvg - previousWeekAvg) / previousWeekAvg) * 100 : 0;

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  if (!row) return null;

  const delta = row.delta;
  const hasDelta = typeof delta === 'number';
  const deltaDirection = delta > 0 ? '▲' : '▼';

  return (
    <div className="trendTooltip">
      <p className="trendTooltipLabel">{row.label}</p>
      <p className="trendTooltipValue">Total: {inr(row.total)}</p>
      {hasDelta && (
        <p className={`trendTooltipDelta ${delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'}`}>
          vs previous: {delta === 0 ? 'No change' : `${deltaDirection} ${inr(Math.abs(delta))}`}
        </p>
      )}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('expense-dashboard-theme');
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  });
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [barView, setBarView] = useState('weekly');
  const [activeBarIndex, setActiveBarIndex] = useState(null);
  const [anomalyVisibleCount, setAnomalyVisibleCount] = useState(8);

  useEffect(() => {
    localStorage.setItem('expense-dashboard-theme', theme);
  }, [theme]);


  const pieLegendData = useMemo(
    () => categoryData.map((entry, index) => ({ ...entry, color: PIE_COLORS[index % PIE_COLORS.length] })),
    [],
  );

  const pieData = useMemo(() => {
    if (!focusedCategory) return pieLegendData;
    return pieLegendData.filter((item) => item.category === focusedCategory);
  }, [focusedCategory, pieLegendData]);

  const activePieIndex = focusedCategory ? 0 : hoveredSlice;
  const seriesByTime = useMemo(() => buildTimeSeries(expenses), []);
  const barData = useMemo(() => {
    const series = barView === 'weekly' ? seriesByTime.weekly : seriesByTime.monthly;
    return series.map((row, index) => ({
      ...row,
      delta: index === 0 ? null : row.total - series[index - 1].total,
    }));
  }, [barView, seriesByTime]);

  return (
    <main className={`page theme-${theme}`}>
      <header className="hero">
        <div>
          <p className="eyebrow">Expense Intelligence</p>
          <h1>Expense Dashboard</h1>
          <p className="subhead">
            Month to date view for{' '}
            {new Date(activeMonth.year, activeMonth.month).toLocaleDateString('en-IN', {
              month: 'long',
              year: 'numeric',
            })}
            {latestDate ? ` · As of ${formatShortDate(latestDate.toISOString().slice(0, 10))}` : ''}
          </p>
          <p className="freshnessHint">Data refreshes from local CSV source files.</p>
        </div>
        <button
          className="themeToggle"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <section className="cards">
        <article className="card statCard compactStat">
          <h2>MTD Spend</h2>
          <p className="big">{formatCompactInr(mtdTotal)}</p>
          <p>Daily Life: {formatCompactInr(dailyLifeSpent)}</p>
          <p>Goa Shopping: {formatCompactInr(goaSpent)}</p>
          {previousWeekAvg > 0 && (
            <p className={`statusBadge ${weeklyDeltaPct > 0 ? 'danger' : 'success'}`}>
              {weeklyDeltaPct > 0 ? '↑' : '↓'} Weekly avg vs prev week: {Math.abs(weeklyDeltaPct).toFixed(1)}%
            </p>
          )}
        </article>

        <article className="card statCard compactStat">
          <h2>Goa Tracker</h2>
          <p className="big">
            {formatCompactInr(goaSpent)} / {formatCompactInr(GOA_SHOPPING_BUDGET)}
          </p>
          <div className="progressTrack" role="img" aria-label={`Goa budget used ${goaUsagePct.toFixed(0)} percent`}>
            <div className={`progressFill ${goaRisk}`} style={{ width: `${Math.min(goaUsagePct, 100)}%` }} />
            <span className="progressMarker marker50" aria-hidden="true" />
            <span className="progressMarker marker75" aria-hidden="true" />
          </div>
          <p>Remaining: {formatCompactInr(Math.max(GOA_SHOPPING_BUDGET - goaSpent, 0))}</p>
          <p className={`statusBadge ${goaRisk}`}>
            {goaRisk === 'danger' ? 'Over budget risk' : goaRisk === 'warning' ? 'Near budget cap' : 'Within budget'} ·{' '}
            {goaUsagePct.toFixed(1)}% used
          </p>
          <small>Includes only rows with “goa”; excludes air fryer + accessories.</small>
        </article>

        <article className="card statCard compactStat">
          <h2>Investments Snapshot</h2>
          <p className="big">{formatCompactInr(investmentTotal)}</p>
          <p>FD: {formatCompactInr(fdTotal)}</p>
          <p>Stocks: {formatCompactInr(stockTotal)}</p>
          <small>Based on latest entry per account from investments.csv.</small>
        </article>

        <article className="card statCard compactStat">
          <h2>Weekly Anomalies</h2>
          <div className="anomalyListWrap">
            <table className="compactTable">
              <thead>
                <tr>
                  <th>Week</th>
                  <th className="num">Spend</th>
                </tr>
              </thead>
              <tbody>
                {weeklyAnomalyRows.slice(0, anomalyVisibleCount).map((week) => (
                  <tr key={week.key}>
                    <td>{week.label}</td>
                    <td className="num">{formatCompactInr(week.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {weeklyAnomalyRows.length > anomalyVisibleCount && (
            <button className="viewMoreBtn" onClick={() => setAnomalyVisibleCount((prev) => prev + 8)}>
              View more
            </button>
          )}
        </article>
      </section>

      <section className="grid2 insightsSection nearTop">
        <article className="card">
          <h2>Weekly Review & Insights</h2>
          <div className="insightBlock">
            <h3>What went wrong this week</h3>
            <p>
              <strong>Issue snapshot:</strong> {weeklyInsights.wentWrong}
            </p>
          </div>
          <div className="insightBlock">
            <h3>What to do next week</h3>
            <p>
              <strong>Next-week focus:</strong> {weeklyInsights.nextWeek}
            </p>
          </div>
        </article>

        <article className="card">
          <h2>Subscriptions</h2>
          <div className="subsScroll">
            <details open>
              <summary>Active ({activeSubs.length})</summary>
              <ul>
                {activeSubs.map((sub) => (
                  <li key={`${sub.service}-${sub.timestamp}`}>
                    <strong>{sub.service}</strong> · {sub.billing_cycle} · {formatCompactInr(sub.amount_inr)}
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Cancelled ({cancelledSubs.length})</summary>
              {cancelledSubs.length ? (
                <ul>
                  {cancelledSubs.map((sub) => (
                    <li key={`${sub.service}-${sub.timestamp}`}>
                      <strong>{sub.service}</strong> · {sub.status} · {sub.renewal_or_end_month || 'n/a'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No cancelled subscriptions found.</p>
              )}
            </details>
          </div>
        </article>
      </section>

      <section className="grid2">
        <article className="card">
          <h2>Category Breakdown</h2>
          <div className="chartWrap pieWrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  activeIndex={activePieIndex ?? undefined}
                  onMouseEnter={(_, index) => {
                    if (!focusedCategory) setHoveredSlice(index);
                  }}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={(entry) =>
                    setFocusedCategory((current) => (current === entry.category ? null : entry.category))
                  }
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={entry.color}
                      opacity={!focusedCategory || focusedCategory === entry.category ? 1 : 0.35}
                      stroke="var(--panel-strong)"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, _, payload) => [`${inr(value)} (${payload.payload.pct.toFixed(1)}%)`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="chartHelper">Tap category to isolate · tap again to reset.</p>
          {focusedCategory && <p className="filterState">Filter active: {focusedCategory}</p>}
          <div className="legendList">
            {pieLegendData.map((row) => (
              <button
                key={row.category}
                className={`legendRow ${focusedCategory === row.category ? 'active' : ''}`}
                onClick={() => setFocusedCategory((current) => (current === row.category ? null : row.category))}
              >
                <span>
                  <span className="dot" style={{ background: row.color }} />
                  {row.category}
                </span>
                <span>
                  {formatCompactInr(row.amount)} · {row.pct.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="card trendCard">
          <div className="titleRow">
            <h2>Spending Trend</h2>
            <div className="segmented">
              <button
                className={barView === 'weekly' ? 'active' : ''}
                aria-pressed={barView === 'weekly'}
                onClick={() => {
                  setBarView('weekly');
                  setActiveBarIndex(null);
                }}
              >
                Weekly
              </button>
              <button
                className={barView === 'monthly' ? 'active' : ''}
                aria-pressed={barView === 'monthly'}
                onClick={() => {
                  setBarView('monthly');
                  setActiveBarIndex(null);
                }}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="chartWrap trendChartWrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 2, right: 4, bottom: 0, left: -10 }}
                barCategoryGap="14%"
                onMouseLeave={() => setActiveBarIndex(null)}
                onMouseMove={(state) => {
                  if (typeof state?.activeTooltipIndex === 'number') {
                    setActiveBarIndex(state.activeTooltipIndex);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="2 2" opacity={0.14} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" tickMargin={4} height={26} />
                <YAxis tickFormatter={(value) => formatCompactInr(value)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--bar-hover)' }} />
                <Bar
                  dataKey="total"
                  fill="var(--accent-strong)"
                  maxBarSize={32}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive
                  animationDuration={380}
                  animationEasing="ease-out"
                >
                  {barData.map((entry, index) => {
                    const active = activeBarIndex === index;
                    return (
                      <Cell
                        key={`${entry.label}-${index}`}
                        fill={active ? 'var(--accent)' : 'var(--accent-strong)'}
                        opacity={active || activeBarIndex === null ? 1 : 0.75}
                        stroke={active ? 'var(--bar-active-stroke)' : 'transparent'}
                        strokeWidth={active ? 1 : 0}
                        className="trendBarCell"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
