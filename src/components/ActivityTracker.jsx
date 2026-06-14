import React, { useEffect, useState } from 'react';
import api from '../api';
import './ActivityTracker.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toUTCDateString(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function buildLastNDays(n) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(todayUTC);
    date.setUTCDate(todayUTC.getUTCDate() - i);
    days.push({ date, dateStr: toUTCDateString(date) });
  }
  return days;
}

function buildWeekBuckets(dailyMinutes, weekCount = 8) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weeks = [];

  for (let w = weekCount - 1; w >= 0; w--) {
    const endDate = new Date(todayUTC);
    endDate.setUTCDate(todayUTC.getUTCDate() - w * 7);
    const startDate = new Date(endDate);
    startDate.setUTCDate(endDate.getUTCDate() - 6);

    let totalMinutes = 0;
    let activeCount = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + i);
      if (date > todayUTC) continue;
      const minutes = dailyMinutes[toUTCDateString(date)] || 0;
      totalMinutes += minutes;
      if (minutes > 0) activeCount += 1;
    }

    weeks.push({
      label: w === 0 ? 'Now' : `${MONTH_NAMES[startDate.getUTCMonth()]} ${startDate.getUTCDate()}`,
      totalMinutes,
      activeCount,
    });
  }

  return weeks;
}

function getAxisMax(points, minimum = 10) {
  const maxPoint = Math.max(0, ...points);
  if (maxPoint <= minimum) return minimum;

  const magnitude = 10 ** Math.floor(Math.log10(maxPoint));
  const normalized = maxPoint / magnitude;
  let niceBase = 1;

  if (normalized <= 1) niceBase = 1;
  else if (normalized <= 2) niceBase = 2;
  else if (normalized <= 4) niceBase = 4;
  else if (normalized <= 6) niceBase = 6;
  else niceBase = 10;

  return niceBase * magnitude;
}

function TitleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="4" height="9" rx="1.5" fill="currentColor" />
      <rect x="10" y="6" width="4" height="14" rx="1.5" fill="currentColor" opacity="0.8" />
      <rect x="17" y="3" width="4" height="17" rx="1.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function StreakIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c-1 3-4 4.7-4 8.1a4 4 0 0 0 8 0c0-1.6-.9-3.1-2.2-4.4.2 1.8-.6 3.3-1.8 4.2-.1-2.8-1.3-5.2 0-7.9Z" fill="currentColor" />
      <path d="M9.5 14.2c0 1.5 1.1 2.8 2.5 2.8s2.5-1.3 2.5-2.8c0-1.2-.8-2.2-2-3-.1 1-.6 1.8-1.5 2.4 0-1.5-.7-2.8 0-4.3-1 1-1.5 2.2-1.5 4.9Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function TimeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7.5v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DaysIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 3.5v3M16 3.5v3M4 9.5h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 13h2M13 13h2M9 16.5h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LineChart({ points, yMax, labels }) {
  const width = 620;
  const height = 210;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 34;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const count = points.length;
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((yMax / 4) * index));

  const xOf = (index) => padLeft + (count > 1 ? (index / (count - 1)) * chartWidth : chartWidth / 2);
  const yOf = (value) => padTop + chartHeight - (yMax > 0 ? (value / yMax) * chartHeight : 0);

  const linePath = points
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`)
    .join(' ');
  const fillPath = `${linePath} L${xOf(count - 1).toFixed(1)},${(padTop + chartHeight).toFixed(1)} L${xOf(0).toFixed(1)},${(padTop + chartHeight).toFixed(1)} Z`;

  return (
    <svg className="at-chart-svg" viewBox={`0 0 ${width} ${height}`} width="100%" aria-hidden="true">
      <defs>
        <linearGradient id="at-line-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="at-fill-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(6,182,212,0.28)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0)" />
        </linearGradient>
      </defs>

      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={padLeft}
            y1={yOf(tick)}
            x2={padLeft + chartWidth}
            y2={yOf(tick)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text
            x={padLeft - 10}
            y={yOf(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="rgba(203,213,225,0.72)"
            fontSize="11"
          >
            {tick}
          </text>
        </g>
      ))}

      <path d={fillPath} fill="url(#at-fill-gradient)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#at-line-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((value, index) => (
        <g key={labels[index]}>
          <circle cx={xOf(index)} cy={yOf(value)} r="8" fill="rgba(6,182,212,0.16)" />
          <circle cx={xOf(index)} cy={yOf(value)} r="4" fill="#f8fafc" stroke="#06b6d4" strokeWidth="2.5" />
          <text
            x={xOf(index)}
            y={padTop + chartHeight + 24}
            textAnchor="middle"
            fill="rgba(219,234,254,0.82)"
            fontSize="11"
          >
            {labels[index]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MetricRow({ icon, value, label, compactValue = false }) {
  return (
    <div className="at-metric-row">
      <div className="at-metric-icon">{icon}</div>
      <div className="at-metric-label-wrap">
        <div className="at-metric-label at-metric-label--inline">{label}</div>
      </div>
      <div className={`at-metric-value${compactValue ? ' at-metric-value--compact' : ''}`}>{value}</div>
    </div>
  );
}

export default function ActivityTracker({ publicData = null }) {
  const [data, setData] = useState(publicData);
  const [loading, setLoading] = useState(!publicData);
  const [view, setView] = useState('week');

  useEffect(() => {
    if (publicData) {
      setData(publicData);
      setLoading(false);
      return;
    }

    api.get('/api/user/activity-history')
      .then((res) => setData(res.data))
      .catch(() => setData({ activeDates: [], dailyMinutes: {}, stats: { totalDays: 0, currentStreak: 0, longestStreak: 0, totalMinutes: 0 } }))
      .finally(() => setLoading(false));
  }, [publicData]);

  if (loading) {
    return (
      <div className="activity-tracker">
        <div className="at-shell">
          <div className="at-loading">Loading activity...</div>
        </div>
      </div>
    );
  }

  const { activeDates = [], dailyMinutes = {}, stats = {} } = data || {};
  const { totalDays = 0, currentStreak = 0, longestStreak = 0, totalMinutes = 0 } = stats;

  const minuteMap = Object.keys(dailyMinutes || {}).length > 0
    ? dailyMinutes
    : activeDates.reduce((acc, dateStr) => {
        acc[dateStr] = 1;
        return acc;
      }, {});

  const fmtTime = (mins) => {
    if (mins <= 0) return '0 min';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const weekDays = buildLastNDays(7);
  const weekData = weekDays.map(({ date, dateStr }) => ({
    date,
    dateStr,
    minutes: minuteMap[dateStr] || 0,
  }));
  const weekPoints = weekData.map(({ minutes }) => minutes);
  const weekLabels = weekData.map(({ date }) => DAY_ABBR[date.getUTCDay()]);
  const activeThisWeek = weekData.filter(({ minutes }) => minutes > 0).length;
  const weekTotalMinutes = weekData.reduce((sum, { minutes }) => sum + minutes, 0);
  const weekPeakMinutes = Math.max(0, ...weekPoints);

  const monthWeeks = buildWeekBuckets(minuteMap, 8);
  const monthPoints = monthWeeks.map((week) => week.totalMinutes);
  const monthLabels = monthWeeks.map((week) => week.label);
  const activeWeeks = monthWeeks.filter((week) => week.activeCount > 0).length;
  const monthTotalMinutes = monthPoints.reduce((sum, value) => sum + value, 0);

  const points = view === 'week' ? weekPoints : monthPoints;
  const labels = view === 'week' ? weekLabels : monthLabels;
  const yMax = getAxisMax(points, view === 'week' ? 10 : 30);
  const caption = view === 'week'
    ? `${activeThisWeek} active day${activeThisWeek === 1 ? '' : 's'} • ${fmtTime(weekTotalMinutes)} this week`
    : `${activeWeeks} active week${activeWeeks === 1 ? '' : 's'} • ${fmtTime(monthTotalMinutes)} in the last 8 weeks`;
  const badge = view === 'week'
    ? (weekPeakMinutes > 0 ? `Peak ${fmtTime(weekPeakMinutes)}` : 'No activity yet')
    : `${activeWeeks} active weeks`;

  return (
    <div className="activity-tracker">
      <div className="at-shell">
        <div className="at-shell-header">
          <div className="at-heading">
            <span className="at-heading-icon">
              <TitleIcon />
            </span>
            <h2 className="at-title">Practice Activity</h2>
          </div>

          <div className="at-tabs">
            <button
              className={`at-tab${view === 'week' ? ' at-tab--active' : ''}`}
              onClick={() => setView('week')}
              type="button"
              aria-pressed={view === 'week'}
            >
              Week
            </button>
            <button
              className={`at-tab${view === 'month' ? ' at-tab--active' : ''}`}
              onClick={() => setView('month')}
              type="button"
              aria-pressed={view === 'month'}
            >
              Month
            </button>
          </div>
        </div>

        <div className="at-shell-body">
          <div className="at-summary-card">
            <div className="at-metric-list">
              <MetricRow
                icon={<StreakIcon />}
                value={currentStreak}
                label="Current Streak"
              />
              <MetricRow
                icon={<TimeIcon />}
                value={fmtTime(totalMinutes)}
                label="Time Spent"
                compactValue={true}
              />
              <MetricRow
                icon={<DaysIcon />}
                value={totalDays}
                label="Days Active"
                compactValue={true}
              />
            </div>

            <div className="at-week-strip">
              {weekData.map(({ date, dateStr, minutes }, index) => {
                const intensity = weekPeakMinutes > 0 ? minutes / weekPeakMinutes : 0;
                const isToday = index === weekData.length - 1;
                const isActive = minutes > 0;

                return (
                  <div className="at-week-day" key={dateStr}>
                    <span className="at-week-day-label">{DAY_INITIALS[date.getUTCDay()]}</span>
                    <div
                      className={`at-day-cell${isActive ? ' at-day-cell--active' : ''}${isToday ? ' at-day-cell--today' : ''}`}
                      style={{ '--at-intensity': intensity }}
                      title={`${DAY_ABBR[date.getUTCDay()]}: ${minutes} minute${minutes === 1 ? '' : 's'}`}
                    >
                      <span className="at-day-cell-core" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="at-chart-card">
            <div className="at-chart-header">
              <div>
                <p className="at-kicker">{view === 'week' ? 'Last 7 days' : 'Last 8 weeks'}</p>
                <p className="at-chart-caption">{caption}</p>
              </div>
              <div className="at-chart-badge">{badge}</div>
            </div>

            <div className="at-chart-frame">
              <LineChart points={points} yMax={yMax} labels={labels} />
            </div>

            {activeDates.length === 0 && (
              <div className="at-empty">
                No activity yet - play any puzzle or game to start tracking.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


