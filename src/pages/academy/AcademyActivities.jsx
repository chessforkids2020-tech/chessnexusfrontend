// pages/academy/AcademyActivities.jsx — /academy/activities
// Academy-wide activities: races, tournaments, team races and Monthly Focus
// whose roster is EVERY student of EVERY coach in the academy, not one coach's
// class. Creating, watching and results all live on this one page.
//
// Two audiences, one page:
//   • the head (or any member coach, when the academy's setting says 'any')
//     creates activities here;
//   • every active member coach READS here — a head schedules an event that
//     pulls in their students, and the coach has to be able to see it.
// `mayCreate` from /context decides which of the two this viewer gets, so a
// coach is never shown a button that would 403.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import './AcademyDashboard.css';
import './AcademyActivities.css';

// Arena race + tournament already accept `academyWide` on their own create
// routes, so those two link out to the shared create form in academy mode.
// Team race + Monthly Focus are created inline here (their own create paths are
// admin-only / per-coach-quota, neither of which fits an academy event).
const CREATE_OPTIONS = [
  { id: 'arenaRace', label: '🏁 Arena Race', to: '/arena/create?academy=1' },
  { id: 'arenaTournament', label: '🏆 Arena Tournament', to: '/arenatournament/create?academy=1' },
  { id: 'teamRace', label: '🏃 Team Race', inline: 'teamRace' },
  { id: 'monthlyFocus', label: '🎯 Monthly Focus', inline: 'monthlyFocus' },
];

const TYPE_META = {
  arena_race: { icon: '🏁', label: 'Arena Race' },
  arena_tournament: { icon: '🏆', label: 'Arena Tournament' },
  team_race: { icon: '🏃', label: 'Team Race' },
  monthly_focus: { icon: '🎯', label: 'Monthly Focus' },
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'arena_race', label: '🏁 Races' },
  { id: 'arena_tournament', label: '🏆 Tournaments' },
  { id: 'team_race', label: '🏃 Team Races' },
  { id: 'monthly_focus', label: '🎯 Monthly Focus' },
];

// One status vocabulary across four different engines, so the page reads as one
// thing rather than four. Each engine's own words map onto live / upcoming / done.
const STATUS_CHIP = {
  waiting: ['⏳ Waiting', 'is-wait'],
  created: ['⏳ Waiting', 'is-wait'],
  scheduled: ['⏳ Scheduled', 'is-wait'],
  lobby: ['⏳ Lobby', 'is-wait'],
  draft: ['📝 Draft', 'is-wait'],
  active: ['🔴 Live', 'is-live'],
  running: ['🔴 Live', 'is-live'],
  pairing_stopped: ['🔴 Live', 'is-live'],
  completed: ['✅ Done', 'is-done'],
  finished: ['✅ Done', 'is-done'],
  cancelled: ['✖ Cancelled', 'is-off'],
  archived: ['✖ Archived', 'is-off'],
};

function fmtWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
  } catch { return ''; }
}

// Default the scheduled start to a round-ish time shortly from now, so the
// create forms open with something valid already filled in.
function defaultStartLocal(minutesAhead = 30) {
  const d = new Date(Date.now() + minutesAhead * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AcademyActivities() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(null);       // { academy, mayCreate, studentCount, … }
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('all');
  const [showMenu, setShowMenu] = useState(false);
  const [form, setForm] = useState(null);     // 'teamRace' | 'monthlyFocus' | null
  const [saving, setSaving] = useState(false);

  // Inline create forms.
  const [tr, setTr] = useState({ raceName: '', topic: '', duration: 10, scheduledStartTime: defaultStartLocal() });
  const [mf, setMf] = useState({ title: '', theme: 'tactics', startDate: '', endDate: '' });
  const [topics, setTopics] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        api.get('/api/academy-activities/context'),
        api.get('/api/academy-activities'),
      ]);
      setCtx(c.data || null);
      setActivities(a.data?.activities || []);
      setErr('');
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load academy activities.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Team Race needs a puzzle topic; reuse the arena topic list.
  useEffect(() => {
    api.get('/api/arena/topics')
      .then(r => {
        const list = r.data?.topics || [];
        setTopics(list);
        if (list.length) setTr(v => (v.topic ? v : { ...v, topic: list[0].id }));
      })
      .catch(() => {});
  }, []);

  const createTeamRace = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setErr(''); setMsg('');
    try {
      const res = await api.post('/api/academy-activities/team-race', {
        raceName: tr.raceName.trim(),
        topic: tr.topic,
        duration: Number(tr.duration) * 60, // model stores seconds
        scheduledStartTime: new Date(tr.scheduledStartTime).toISOString(),
      });
      const reach = res.data?.reach;
      setMsg(reach
        ? `Team Race created for ${reach.students} student${reach.students === 1 ? '' : 's'} across ${reach.coaches} coach${reach.coaches === 1 ? '' : 'es'}.`
        : 'Team Race created.');
      setForm(null);
      setTr({ raceName: '', topic: topics[0]?.id || '', duration: 10, scheduledStartTime: defaultStartLocal() });
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not create the team race.');
    } finally {
      setSaving(false);
    }
  };

  const createMonthlyFocus = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setErr(''); setMsg('');
    try {
      const res = await api.post('/api/academy-activities/monthly-focus', {
        title: mf.title.trim(),
        theme: mf.theme,
        ...(mf.startDate ? { startDate: new Date(mf.startDate).toISOString() } : {}),
        ...(mf.endDate ? { endDate: new Date(mf.endDate).toISOString() } : {}),
      });
      const reach = res.data?.reach;
      setMsg(reach
        ? `Monthly Focus created for ${reach.students} student${reach.students === 1 ? '' : 's'}. Add days, then activate it.`
        : 'Monthly Focus created. Add days, then activate it.');
      setForm(null);
      setMf({ title: '', theme: 'tactics', startDate: '', endDate: '' });
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not create the Monthly Focus.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !ctx) return <div className="acad-wrap"><div className="acad-empty">Loading activities…</div></div>;
  if (err && !ctx) return <div className="acad-wrap"><div className="acad-error">⚠️ {err}</div></div>;

  const shown = tab === 'all' ? activities : activities.filter(a => a.type === tab);
  const counts = activities.reduce((m, a) => ({ ...m, [a.type]: (m[a.type] || 0) + 1 }), {});
  const noStudents = (ctx?.studentCount || 0) === 0;
  const logo = ctx?.academy?.logoUrl || '';

  return (
    <div className="acad-wrap">
      <div className="acad-head">
        <div>
          <h1>
            {logo
              ? <img src={logo} alt="" className="acad-act-headlogo" />
              : <span>🎯 </span>}
            Academy Activities
          </h1>
          <div className="acad-code">
            Run across every coach in {ctx?.academy?.name || 'your academy'} ·{' '}
            <strong>{ctx?.studentCount || 0}</strong> student{ctx?.studentCount === 1 ? '' : 's'} ·{' '}
            <strong>{ctx?.coachCount || 0}</strong> coach{ctx?.coachCount === 1 ? '' : 'es'}
          </div>
        </div>
        <div className="acad-act-headbtns">
          {ctx?.mayCreate && (
            <div className="acad-act-menu">
              <button
                className="acad-act-create"
                disabled={noStudents}
                title={noStudents ? 'No coach in this academy has students yet' : ''}
                onClick={() => setShowMenu(v => !v)}
              >
                ➕ Create Activity ▾
              </button>
              {showMenu && (
                <>
                  <div className="acad-act-backdrop" onClick={() => setShowMenu(false)} />
                  <div className="acad-act-dropdown">
                    {CREATE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        className="acad-act-item"
                        onClick={() => {
                          setShowMenu(false);
                          if (opt.inline) { setForm(opt.inline); setMsg(''); setErr(''); }
                          else navigate(opt.to);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <Link to="/academy/overview" className="acad-act-back">← Overview</Link>
        </div>
      </div>

      {err && <div className="acad-error">⚠️ {err}</div>}
      {msg && <div className="acad-msg">{msg}</div>}

      {/* A member coach who may only read is told so explicitly — otherwise the
          missing Create button just looks like something failed to load. */}
      {ctx && !ctx.mayCreate && (
        <div className="acad-act-note">
          👀 You can follow every academy-wide activity here. Only the academy head
          can create them — your own class activities are unaffected and stay on
          your <Link to="/coach/activities">Coach Activities</Link> page.
        </div>
      )}

      {ctx?.mayCreate && noStudents && (
        <div className="acad-act-note">
          No coach in this academy has students yet. Once coaches enrol students,
          you can run activities across the whole academy from here.
        </div>
      )}

      {/* ── Inline create: Team Race ── */}
      {form === 'teamRace' && (
        <form className="acad-act-form" onSubmit={createTeamRace}>
          <h3>🏃 New academy Team Race</h3>
          <div className="acad-act-grid">
            <label>
              <span>Race name</span>
              <input value={tr.raceName} onChange={e => setTr({ ...tr, raceName: e.target.value })}
                     placeholder="Friday Team Sprint" required maxLength={80} />
            </label>
            <label>
              <span>Topic</span>
              <select value={tr.topic} onChange={e => setTr({ ...tr, topic: e.target.value })} required>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
              </select>
            </label>
            <label>
              <span>Duration (minutes)</span>
              <input type="number" min={1} max={120} value={tr.duration}
                     onChange={e => setTr({ ...tr, duration: e.target.value })} required />
            </label>
            <label>
              <span>Starts at</span>
              <input type="datetime-local" value={tr.scheduledStartTime}
                     onChange={e => setTr({ ...tr, scheduledStartTime: e.target.value })} required />
            </label>
          </div>
          <div className="acad-act-formbtns">
            <button type="submit" className="acad-act-create" disabled={saving}>
              {saving ? 'Creating…' : 'Create team race'}
            </button>
            <button type="button" className="acad-act-back" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── Inline create: Monthly Focus ── */}
      {form === 'monthlyFocus' && (
        <form className="acad-act-form" onSubmit={createMonthlyFocus}>
          <h3>🎯 New academy Monthly Focus</h3>
          <div className="acad-act-grid">
            <label>
              <span>Title</span>
              <input value={mf.title} onChange={e => setMf({ ...mf, title: e.target.value })}
                     placeholder="March Tactics Push" required maxLength={120} />
            </label>
            <label>
              <span>Theme</span>
              <select value={mf.theme} onChange={e => setMf({ ...mf, theme: e.target.value })}>
                <option value="tactics">Tactics</option>
                <option value="endgame">Endgame</option>
                <option value="opening">Opening</option>
                <option value="strategy">Strategy</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label>
              <span>Starts (optional)</span>
              <input type="date" value={mf.startDate} onChange={e => setMf({ ...mf, startDate: e.target.value })} />
            </label>
            <label>
              <span>Ends (optional)</span>
              <input type="date" value={mf.endDate} onChange={e => setMf({ ...mf, endDate: e.target.value })} />
            </label>
          </div>
          <p className="acad-act-hint">
            Created as a draft. Add its days on the Monthly Focus page, then activate
            it — students across the academy see it once it is active.
          </p>
          <div className="acad-act-formbtns">
            <button type="submit" className="acad-act-create" disabled={saving}>
              {saving ? 'Creating…' : 'Create Monthly Focus'}
            </button>
            <button type="button" className="acad-act-back" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── Type tabs ── */}
      <div className="acad-act-tabs">
        {TABS.map(t => {
          const n = t.id === 'all' ? activities.length : (counts[t.id] || 0);
          return (
            <button
              key={t.id}
              className={`acad-act-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}{n ? ` (${n})` : ''}
            </button>
          );
        })}
      </div>

      {/* ── Activity cards ── */}
      {shown.length === 0 ? (
        <div className="acad-empty">
          {activities.length === 0
            ? (ctx?.mayCreate
                ? 'No academy activities yet. Use Create Activity to run one across every coach’s students.'
                : 'No academy activities yet.')
            : 'Nothing of this type yet.'}
        </div>
      ) : (
        <div className="acad-act-cards">
          {shown.map(a => {
            const meta = TYPE_META[a.type] || { icon: '•', label: a.type };
            const [chipLabel, chipCls] = STATUS_CHIP[a.status] || [a.status, 'is-off'];
            const done = chipCls === 'is-done';
            return (
              <div key={`${a.type}-${a._id}`} className="acad-act-card">
                <div className="acad-act-cardtop">
                  {/* The academy logo doubles as the badge: every card here is an
                      academy event, and the crest says so at a glance. */}
                  {logo
                    ? <img src={logo} alt="" className="acad-act-badge" />
                    : <span className="acad-act-badge-ph">{meta.icon}</span>}
                  <div className="acad-act-cardname">
                    <div className="acad-act-title">{a.name || meta.label}</div>
                    <div className="acad-act-type">{meta.icon} {meta.label}</div>
                  </div>
                  <span className={`acad-act-chip ${chipCls}`}>{chipLabel}</span>
                </div>

                <div className="acad-act-meta">
                  {a.topic && <span>{a.topic}</span>}
                  {a.timeLimit ? <span>{a.timeLimit} min</span> : null}
                  {a.month && <span>{a.month}</span>}
                  {a.startedAt && <span>{fmtWhen(a.startedAt)}</span>}
                </div>

                <div className="acad-act-reach">
                  {a.joined != null
                    ? <><strong>{a.joined}</strong>/{a.invited} joined</>
                    : <><strong>{a.invited}</strong> invited</>}
                  {a.createdBy && <span className="acad-act-by"> · by {a.createdBy}</span>}
                </div>

                {a.resultsPath && (
                  <Link to={a.resultsPath} className="acad-act-open">
                    {done ? 'View results' : 'Watch live'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
