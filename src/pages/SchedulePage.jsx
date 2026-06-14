import React, { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ACTIVITY_ICONS = {
  puzzle_content: '🧩',
  monthly_focus: '🎯',
  arena_race: '🏁',
  team_race: '👥',
  arena_tournament: '🏆',
  team_tournament: '🥇',
  bullet_blitz_marathon: '⚡',
  chess960: '🔀',
  '3d_arena_tournament': '🎮',
};

const ACTIVITY_LABELS = {
  puzzle_content: 'Puzzle Content',
  monthly_focus: 'Monthly Focus Challenge',
  arena_race: 'Arena Race',
  team_race: 'Team Race',
  arena_tournament: 'Arena Tournament',
  team_tournament: 'Team Tournament',
  bullet_blitz_marathon: 'Bullet Blitz Marathon',
  chess960: 'Chess 960',
  '3d_arena_tournament': '3D Arena Tournament',
};

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// Convert UTC ms to IST date string YYYY-MM-DD
function getISTDateStr(utcMs) {
  const d = new Date(utcMs + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// IST day-of-week for a UTC timestamp
function getISTDayOfWeek(utcMs) {
  return new Date(utcMs + IST_OFFSET_MS).getUTCDay();
}

// Expand recurring items into IST date strings (730-day window).
// Non-recurring items just return their stored dates array.
function expandItemDates(item) {
  if (!item.isRecurring) return item.dates || [];
  const dates = [];
  const now = Date.now();
  for (let i = -1; i < 730; i++) {
    const utcMs = now + i * 86400000;
    const dow = getISTDayOfWeek(utcMs);
    const rdArr = item.recurringDays || [];
    if (rdArr.length === 0 || rdArr.includes(dow)) {
      dates.push(getISTDateStr(utcMs));
    }
  }
  return dates;
}

const IST_OFFSET_MINUTES = 5 * 60 + 30;

// Admin sets date/time in IST; convert that to an absolute timestamp.
function parseIstOccurrence(dateStr, timeValue) {
  if (!dateStr || !timeValue || !timeValue.includes(':')) return null;
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  const [hh, mm] = timeValue.split(':').map(Number);
  const utcMs = Date.UTC(yy, (mo || 1) - 1, dd || 1, hh || 0, mm || 0) - IST_OFFSET_MINUTES * 60000;
  return new Date(utcMs);
}

function localDateKey(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

function formatLocalTimeFromIst(item) {
  const effectiveDate = item?.occurrenceDate || (Array.isArray(item?.dates) && item.dates.length > 0 ? item.dates[0] : null);
  const start = parseIstOccurrence(effectiveDate, item?.timeUTC);
  if (!start) return '';
  return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Returns true if the activity is currently live
function isLiveNow(item) {
  const dates = expandItemDates(item);
  if (!dates || dates.length === 0) return false;
  const now = new Date();
  return dates.some((dateStr) => {
    const start = parseIstOccurrence(dateStr, item.timeUTC);
    if (!start) return false;
    const end = new Date(start.getTime() + item.durationMinutes * 60000);
    return now >= start && now <= end;
  });
}

// Returns ms until next occurrence of the activity
function msUntilNext(item) {
  const dates = expandItemDates(item);
  if (!dates || dates.length === 0) return Infinity;
  const now = new Date();
  let minMs = Infinity;
  for (const dateStr of dates) {
    const candidate = parseIstOccurrence(dateStr, item.timeUTC);
    if (!candidate) continue;
    const diff = candidate - now;
    if (diff > 0 && diff < minMs) minMs = diff;
  }
  return minMs;
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Now';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ActivityCard({ item, compact }) {
  const navigate = useNavigate();
  const live = isLiveNow(item);
  const ms = msUntilNext(item);

  return (
    <div
      style={{
        background: 'rgba(23,23,23,0.8)',
        borderRadius: 12,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        borderLeft: `4px solid ${item.color || '#06b6d4'}`,
        padding: compact ? '10px 12px' : '14px 16px',
        marginBottom: 10,
        position: 'relative',
        cursor: item.link ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: live ? `0 0 16px ${item.color || '#06b6d4'}44` : '0 4px 16px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.6)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = live ? `0 0 16px ${item.color || '#06b6d4'}44` : '0 4px 16px rgba(0,0,0,0.4)'; }}
      onClick={() => item.link && navigate(item.link)}
    >
      {live && (
        <div style={{ position: 'absolute', top: 8, right: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'schedPulse 1.4s infinite' }} />
          <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>LIVE</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: compact ? 16 : 20 }}>{ACTIVITY_ICONS[item.activityType] || '📌'}</span>
        <span style={{ color: '#ffffff', fontWeight: 700, fontSize: compact ? 13 : 15 }}>{item.title}</span>
      </div>
      <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>
        {formatLocalTimeFromIst(item)} · {item.durationMinutes} min
      </div>
      {!compact && item.description && (
        <div style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>{item.description}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          background: `${item.color || '#06b6d4'}22`,
          color: item.color || '#06b6d4',
          borderRadius: 20,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 600,
        }}>
          {ACTIVITY_LABELS[item.activityType] || 'Activity'}
        </span>
        {!live && (
          <span style={{ color: '#6b7280', fontSize: 11 }}>in {formatCountdown(ms)}</span>
        )}
        {item.link && (
          <span style={{ color: item.color || '#06b6d4', fontSize: 12, fontWeight: 600 }}>Join →</span>
        )}
      </div>
    </div>
  );
}

function MonthCalendar({ byDateMap }) {
  const todayDate = new Date();
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDow, setSelectedDow] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    setSelectedDay(null); setSelectedDow(null); setSelectedDateStr(null);
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null); setSelectedDow(null); setSelectedDateStr(null);
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };
  const goToday = () => {
    setCalYear(todayDate.getFullYear()); setCalMonth(todayDate.getMonth());
    setSelectedDay(null); setSelectedDow(null); setSelectedDateStr(null);
  };

  const navBtnSt = {
    background: 'rgba(23,23,23,0.7)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#9ca3af', borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
    fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Poppins,sans-serif',
  };

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={navBtnSt}>&#8249;</button>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', minWidth: 200, textAlign: 'center' }}>
            {MONTH_NAMES[calMonth]} {calYear}
          </span>
          <button onClick={nextMonth} style={navBtnSt}>&#8250;</button>
        </div>
        <button
          onClick={goToday}
          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}
        >Today</button>
      </div>

      {/* Scrollable wrapper — scroll only on small screens; full-width on large screens */}
      <div className="month-cal-scroll">
      <div className="month-cal-inner">

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAY_SHORT.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', padding: '6px 0', letterSpacing: 1 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayActivities = day ? (byDateMap[dateStr] || []) : [];
          const isToday = day !== null && calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth() && day === todayDate.getDate();
          const isSelected = day !== null && selectedDateStr === dateStr;
          return (
            <div
              key={i}
              onClick={() => {
                if (!day) return;
                if (isSelected) { setSelectedDay(null); setSelectedDow(null); setSelectedDateStr(null); }
                else {
                  const dow = new Date(calYear, calMonth, day).getDay();
                  setSelectedDay(day); setSelectedDow(dow);
                  setSelectedDateStr(`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
                }
              }}
              style={{
                minHeight: 90,
                borderRadius: 10,
                background: !day ? 'transparent' : isSelected ? 'rgba(6,182,212,0.12)' : 'rgba(23,23,23,0.6)',
                border: !day ? 'none' : isToday ? '1px solid rgba(6,182,212,0.6)' : isSelected ? '1px solid rgba(6,182,212,0.35)' : '1px solid rgba(255,255,255,0.05)',
                padding: day ? '6px 8px' : 0,
                cursor: day ? 'pointer' : 'default',
                boxShadow: isToday ? '0 0 14px rgba(6,182,212,0.12)' : 'none',
                transition: 'background 0.15s, border-color 0.15s',
                backdropFilter: day ? 'blur(8px)' : 'none',
                WebkitBackdropFilter: day ? 'blur(8px)' : 'none',
              }}
            >
              {day && (
                <>
                  <div style={{ marginBottom: 5 }}>
                    <span style={isToday ? {
                      background: '#06b6d4', color: '#000', borderRadius: '50%',
                      width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 12, fontWeight: 800,
                    } : { fontSize: 13, fontWeight: 700, color: '#9ca3af' }}>{day}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dayActivities.slice(0, 3).map(item => (
                      <div
                        key={item._id}
                        title={`${item.title} · ${formatLocalTimeFromIst(item)} · ${item.durationMinutes}min`}
                        style={{
                          background: `${item.color || '#06b6d4'}20`,
                          borderLeft: `3px solid ${item.color || '#06b6d4'}`,
                          color: item.color || '#06b6d4',
                          fontSize: 10, fontWeight: 600,
                          padding: '2px 5px',
                          borderRadius: '0 4px 4px 0',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {ACTIVITY_ICONS[item.activityType]} {item.title}
                      </div>
                    ))}
                    {dayActivities.length > 3 && (
                      <div style={{ fontSize: 9, color: '#6b7280', paddingLeft: 4, fontWeight: 600 }}>+{dayActivities.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* end minWidth wrapper */}
      </div>
      {/* end overflowX scroll wrapper */}
      </div>

      {/* Day detail modal */}
      {selectedDay !== null && selectedDow !== null && (
        <div
          onClick={() => { setSelectedDay(null); setSelectedDow(null); setSelectedDateStr(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(18,18,28,0.97)',
              borderRadius: 20,
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: 560,
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid rgba(6,182,212,0.25)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(6,182,212,0.08)',
              position: 'relative',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#06b6d4' }}>
                  {DAYS[selectedDow]}
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
                  {MONTH_NAMES[calMonth]} {selectedDay}, {calYear}
                </div>
              </div>
              <button
                onClick={() => { setSelectedDay(null); setSelectedDow(null); setSelectedDateStr(null); }}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af', cursor: 'pointer', borderRadius: 8,
                  width: 34, height: 34, fontSize: 18, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
            {/* Top shimmer line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '20px 20px 0 0', background: 'linear-gradient(90deg, #06b6d4, #10b981, #06b6d4)', backgroundSize: '200% 100%' }} />
            {byDateMap[selectedDateStr]?.length === 0 || !byDateMap[selectedDateStr] ? (
              <div style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', padding: '30px 0' }}>No activities scheduled on this day.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(byDateMap[selectedDateStr] || []).map(item => <ActivityCard key={item._id} item={item} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Today Timetable ─────────────────────────────────────────────────────────
function TodayTimetable({ byDateMap, items, tick }) {
  const navigate = useNavigate();
  const now = new Date();
  const todayKey = localDateKey(now);
  // Sort: live first, then upcoming (by start time), then ended (by start time) at the bottom
  const todayItems = (byDateMap[todayKey] || []).slice().sort((a, b) => {
    const startA = parseIstOccurrence(a.occurrenceDate, a.timeUTC);
    const startB = parseIstOccurrence(b.occurrenceDate, b.timeUTC);
    const endA = startA ? new Date(startA.getTime() + a.durationMinutes * 60000) : null;
    const endB = startB ? new Date(startB.getTime() + b.durationMinutes * 60000) : null;
    const endedA = endA && now > endA;
    const endedB = endB && now > endB;
    if (endedA && !endedB) return 1;   // A ended → push to bottom
    if (!endedA && endedB) return -1;  // B ended → push to bottom
    return (a.occurrenceStartMs || 0) - (b.occurrenceStartMs || 0); // both same status → sort by time
  });

  // Find the next-up item (closest future start)
  let nextUpItem = null;
  let nextUpMs = Infinity;
  for (const item of todayItems) {
    const start = parseIstOccurrence(item.occurrenceDate, item.timeUTC);
    if (!start) continue;
    const diff = start - now;
    if (diff > 0 && diff < nextUpMs) { nextUpMs = diff; nextUpItem = item; }
  }

  const fmtIstTime = (item) => {
    const start = parseIstOccurrence(item.occurrenceDate, item.timeUTC);
    if (!start) return '';
    return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatus = (item) => {
    const start = parseIstOccurrence(item.occurrenceDate, item.timeUTC);
    if (!start) return { type: 'unknown' };
    const end = new Date(start.getTime() + item.durationMinutes * 60000);
    if (now >= start && now <= end) return { type: 'live', ms: 0 };
    if (now < start) return { type: 'upcoming', ms: start - now };
    return { type: 'ended' };
  };

  return (
    <div>
      {/* TODAY header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
            {DAYS[now.getDay()]},&nbsp;
            <span style={{ color: '#06b6d4' }}>{MONTH_NAMES[now.getMonth()]} {now.getDate()}</span>
          </span>
          <span style={{ marginLeft: 12, background: 'rgba(6,182,212,0.15)', color: '#06b6d4', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>
            {todayItems.length} activit{todayItems.length === 1 ? 'y' : 'ies'} today
          </span>
        </div>
      </div>

      {/* NEXT UP highlight */}
      {nextUpItem && (
        <div style={{
          background: `linear-gradient(135deg, ${nextUpItem.color || '#06b6d4'}18 0%, rgba(23,23,23,0.9) 100%)`,
          border: `1px solid ${nextUpItem.color || '#06b6d4'}55`,
          borderRadius: 16, padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          boxShadow: `0 0 24px ${nextUpItem.color || '#06b6d4'}22`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${nextUpItem.color || '#06b6d4'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${nextUpItem.color || '#06b6d4'}55` }}>
              {ACTIVITY_ICONS[nextUpItem.activityType] || '📌'}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: nextUpItem.color || '#06b6d4', letterSpacing: 1, marginBottom: 2 }}>NEXT UP</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{nextUpItem.title}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{fmtIstTime(nextUpItem)} · {nextUpItem.durationMinutes} min</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: nextUpItem.color || '#06b6d4', lineHeight: 1 }}>{formatCountdown(nextUpMs)}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>until start</div>
            {nextUpItem.link && (
              <button onClick={() => navigate(nextUpItem.link)} style={{ marginTop: 8, background: nextUpItem.color || '#06b6d4', color: '#000', border: 'none', borderRadius: 20, padding: '6px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins,sans-serif' }}>Join →</button>
            )}
          </div>
        </div>
      )}

      {/* Timetable rows */}
      {todayItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>No activities scheduled for today.</div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* vertical timeline line */}
          <div style={{ position: 'absolute', left: 44, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, zIndex: 0 }} />

          {todayItems.map((item, idx) => {
            const status = getStatus(item);
            const isLive = status.type === 'live';
            const isEnded = status.type === 'ended';
            const isNext = nextUpItem && item._id === nextUpItem._id && item.occurrenceDate === nextUpItem.occurrenceDate;
            const col = item.color || '#06b6d4';
            return (
              <div
                key={`${item._id}-${idx}`}
                onClick={() => item.link && navigate(item.link)}
                style={{
                  position: 'relative', zIndex: 1,
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  marginBottom: 14, cursor: item.link ? 'pointer' : 'default',
                  opacity: isEnded ? 0.45 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Time dot */}
                <div style={{ flexShrink: 0, width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: isEnded ? '#374151' : col,
                    border: `2px solid ${isEnded ? '#374151' : col}`,
                    boxShadow: isLive ? `0 0 10px ${col}` : 'none',
                    animation: isLive ? 'schedPulse 1.4s infinite' : 'none',
                    flexShrink: 0,
                  }} />
                </div>

                {/* Card */}
                <div style={{
                  flex: 1,
                  background: isLive
                    ? `linear-gradient(135deg, ${col}18, rgba(23,23,23,0.85))`
                    : isNext
                    ? 'rgba(30,30,40,0.9)'
                    : 'rgba(23,23,23,0.7)',
                  border: isLive
                    ? `1px solid ${col}66`
                    : isNext
                    ? `1px solid ${col}44`
                    : '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `4px solid ${isEnded ? '#374151' : col}`,
                  borderRadius: '0 12px 12px 0',
                  padding: '12px 16px',
                  boxShadow: isLive ? `0 0 18px ${col}33` : '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{ACTIVITY_ICONS[item.activityType] || '📌'}</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: isEnded ? '#6b7280' : '#fff' }}>{item.title}</span>
                    </div>
                    {/* Status badge */}
                    {isLive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#052e16', border: '1px solid #22c55e', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'schedPulse 1.4s infinite' }} />
                        LIVE
                      </span>
                    )}
                    {!isLive && !isEnded && (
                      <span style={{ background: `${col}22`, color: col, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        starts in {formatCountdown(status.ms)}
                      </span>
                    )}
                    {isEnded && (
                      <span style={{ color: '#374151', fontSize: 11, fontWeight: 600 }}>Ended</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtIstTime(item)}</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#4b5563', display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{item.durationMinutes} min</span>
                    <span style={{ background: `${col}22`, color: col, borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                      {ACTIVITY_LABELS[item.activityType] || 'Activity'}
                    </span>
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{item.description}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(null); // mobile day filter
  const [viewMode, setViewMode] = useState('today');
  const [tick, setTick] = useState(0); // force re-render for live countdowns

  const navigate = useNavigate();
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetch(`${API_URL}/api/schedule`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Could not load schedule.'); setLoading(false); });
  }, [API_URL]);

  // Refresh countdowns every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Build local-date map from IST-scheduled occurrences.
  // Recurring items (isRecurring=true) are expanded into a 730-day window on the fly.
  const byDateMap = {};
  items.forEach(item => {
    const dates = expandItemDates(item);
    dates.forEach((dateStr) => {
      const start = parseIstOccurrence(dateStr, item.timeUTC);
      if (!start) return;
      const key = localDateKey(start);
      const occurrence = { ...item, occurrenceDate: dateStr, occurrenceStartMs: start.getTime() };
      if (!byDateMap[key]) byDateMap[key] = [];
      // Avoid duplicate entries for the same item on the same day (e.g. multiple date-matches)
      if (!byDateMap[key].some(o => o._id === item._id && o.occurrenceDate === dateStr)) {
        byDateMap[key].push(occurrence);
      }
    });
  });
  Object.keys(byDateMap).forEach((key) => {
    byDateMap[key].sort((a, b) => (a.occurrenceStartMs || 0) - (b.occurrenceStartMs || 0));
  });

  // Current week dates (Sun–Sat of this week) for weekly view
  const getWeekDates = (offsetWeeks = 0) => {
    const today = new Date();
    const sun = new Date(today);
    sun.setDate(today.getDate() - today.getDay() + offsetWeeks * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun); d.setDate(sun.getDate() + i);
      return d;
    });
  };
  const weekDates = getWeekDates();
  const weekDateStrs = weekDates.map(d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  const todayStr = weekDateStrs[new Date().getDay()];

  // Find next activity across all items (only those with a future date)
  const itemsWithFuture = items.filter(it => msUntilNext(it) < Infinity);
  const upcoming = itemsWithFuture.length
    ? itemsWithFuture.reduce((best, it) => (msUntilNext(it) < msUntilNext(best) ? it : best), itemsWithFuture[0])
    : null;

  const liveItems = items.filter(isLiveNow);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#ffffff', fontFamily: 'Poppins, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <SEO
        title="Chess Event Schedule — Upcoming Races & Tournaments"
        description="View the upcoming chess arena races, puzzle tournaments, team races, and monthly focus events on Chess Nexus. Never miss a live chess competition."
        keywords="chess schedule, chess tournaments, chess arena race schedule, upcoming chess events, chess nexus schedule"
        canonical="/schedule"
      />
      {/* Radial gradient overlay — same as dashboard */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.08) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <style>{`
        @keyframes schedPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes schedShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .sched-day-btn { cursor:pointer; border:none; padding:8px 14px; border-radius:20px; font-size:13px; font-weight:600; transition:all 0.2s; font-family:Poppins,sans-serif; }
        .sched-day-btn:hover { transform:translateY(-1px); }
        .sched-nav-btn:hover { opacity: 0.85; }
        .month-cal-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 12px; }
        .month-cal-inner { width: 100%; }
        @media (max-width: 699px) { .month-cal-inner { min-width: 560px; } }
      `}</style>

      {/* Top navbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
      }}>
        {/* Left: back to home */}
        <button
          className="sched-nav-btn"
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', fontSize: 15, fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}
        >
          <img src="/logo.png" alt="Chess Nexus" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        </button>

        {/* Right: auth action */}
        {user ? (
          <button
            className="sched-nav-btn"
            onClick={() => navigate('/dashboard')}
            style={{ background: '#06b6d4', color: '#000', border: 'none', borderRadius: 20, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
          >
            Dashboard →
          </button>
        ) : (
          <button
            className="sched-nav-btn"
            onClick={() => navigate('/login')}
            style={{ background: '#06b6d4', color: '#000', border: 'none', borderRadius: 20, padding: '7px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
          >
            Login
          </button>
        )}
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, padding: '40px 20px 30px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Activity Schedule</h1>
        <p style={{ color: '#9ca3af', marginTop: 8, fontSize: 14 }}>
          All times shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </p>

        {/* Live now banner */}
        {liveItems.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#052e16', border: '1px solid #22c55e', borderRadius: 24, padding: '6px 16px', marginTop: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', animation: 'schedPulse 1.4s infinite', display: 'inline-block' }} />
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13 }}>
              {liveItems.map(i => i.title).join(', ')} — happening now!
            </span>
          </div>
        )}

        {/* Next up */}
        {upcoming && !isLiveNow(upcoming) && (
          <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 12 }}>
            Next: <strong style={{ color: '#06b6d4' }}>{upcoming.title}</strong> in{' '}
            <strong style={{ color: '#f59e0b' }}>{formatCountdown(msUntilNext(upcoming))}</strong>
          </div>
        )}
      </div>

      <div style={{ maxWidth: viewMode === 'monthly' ? '100%' : 1100, margin: '0 auto', padding: viewMode === 'monthly' ? '24px 20px' : '24px 16px', position: 'relative', zIndex: 1 }}>
        {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Loading schedule…</div>}
        {error && <div style={{ textAlign: 'center', color: '#ef4444', padding: 40 }}>{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>�</div>
            <div style={{ color: '#9ca3af', fontSize: 16 }}>Loading schedule activities…</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>Check back soon!</div>
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            {/* View Toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(23,23,23,0.5)', padding: 4, borderRadius: 24, width: 'fit-content', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button className="sched-day-btn" style={{ background: viewMode === 'today' ? '#06b6d4' : 'transparent', color: viewMode === 'today' ? '#000' : '#9ca3af', padding: '6px 18px' }} onClick={() => setViewMode('today')}>&#9200; Today</button>
              <button className="sched-day-btn" style={{ background: viewMode === 'weekly' ? '#06b6d4' : 'transparent', color: viewMode === 'weekly' ? '#000' : '#9ca3af', padding: '6px 18px' }} onClick={() => setViewMode('weekly')}>&#128203; Weekly</button>
              <button className="sched-day-btn" style={{ background: viewMode === 'monthly' ? '#06b6d4' : 'transparent', color: viewMode === 'monthly' ? '#000' : '#9ca3af', padding: '6px 18px' }} onClick={() => setViewMode('monthly')}>&#128198; Monthly</button>
            </div>

            {viewMode === 'today' && <TodayTimetable byDateMap={byDateMap} items={items} tick={tick} />}

            {viewMode === 'monthly' && <MonthCalendar byDateMap={byDateMap} />}

            {viewMode === 'weekly' && <>
            {/* Week day tabs */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
              {weekDates.map((date, idx) => {
                const ds = weekDateStrs[idx];
                const count = (byDateMap[ds] || []).length;
                const isToday = ds === todayStr;
                const active = activeDay === idx;
                return (
                  <button
                    key={idx}
                    className="sched-day-btn"
                    style={{
                      background: active ? '#06b6d4' : 'rgba(23,23,23,0.7)',
                      color: active ? '#000000' : isToday ? '#06b6d4' : '#9ca3af',
                      border: isToday && !active ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(10px)',
                      whiteSpace: 'nowrap',
                      opacity: count === 0 ? 0.4 : 1,
                    }}
                    onClick={() => setActiveDay(active ? null : idx)}
                  >
                    {DAY_SHORT[date.getDay()]} {date.getMonth()+1}/{date.getDate()}
                    {count > 0 && (
                      <span style={{ marginLeft: 6, background: active ? '#00000033' : '#06b6d422', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{count}</span>
                    )}
                  </button>
                );
              })}
              {activeDay !== null && (
                <button className="sched-day-btn" style={{ background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => setActiveDay(null)}>All</button>
              )}
            </div>

            {/* Weekly grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
              {weekDates.map((date, idx) => {
                const ds = weekDateStrs[idx];
                const dayItems = byDateMap[ds] || [];
                const isToday = ds === todayStr;
                const hidden = activeDay !== null && activeDay !== idx;
                return (
                  <div
                    key={idx}
                    style={{
                      display: hidden ? 'none' : 'block',
                      background: 'rgba(23,23,23,0.7)',
                      borderRadius: 16,
                      border: isToday ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.05)',
                      padding: 12,
                      minHeight: 100,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      boxShadow: isToday ? '0 0 20px rgba(6,182,212,0.1)' : '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isToday ? '#06b6d4' : '#ffffff' }}>{DAY_SHORT[date.getDay()]}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{date.getMonth()+1}/{date.getDate()}</span>
                      {isToday && <span style={{ fontSize: 10, background: '#06b6d422', color: '#06b6d4', borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>TODAY</span>}
                    </div>
                    {dayItems.length === 0 ? (
                      <div style={{ color: '#374151', fontSize: 12, textAlign: 'center', paddingTop: 16 }}>—</div>
                    ) : (
                      dayItems.map(item => <ActivityCard key={item._id} item={item} compact />)
                    )}
                  </div>
                );
              })}
            </div>
            </>}

            {/* Guest CTA — only shown to logged-out users */}
            {!user && (
            <div style={{ marginTop: 32, textAlign: 'center', background: 'rgba(23,23,23,0.7)', borderRadius: 16, padding: '24px 16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ marginBottom: 12 }}><img src="/logo.png" alt="Chess Nexus" style={{ height: 48, width: 'auto', objectFit: 'contain' }} /></div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 16 }}>Ready to participate?</div>
              <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
                Login to join activities, track your progress, and compete with others.
              </div>
              <button
                style={{ background: '#06b6d4', color: '#000000', border: 'none', borderRadius: 20, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                onClick={() => window.location.href = '/login'}
              >
                Login to Join
              </button>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
