// ClassLeaderboard.jsx
//
// The Leaderboard section of a student's My Coach page (and the coach's own
// /coach/leaderboard page).
//
// This is built for a CHILD to want to open, not just for a coach to audit, so
// the order of the page is the order of what a student cares about:
//
//   1. HERO — "you are 4th of 18" in big type, with the score counting up and
//      the gap to the student directly above them. A rank alone is a verdict;
//      a rank plus "18 points behind Diya" is a rematch.
//   2. PODIUM — top 3 on an actual podium.
//   3. LAST MONTH — two settled boards: most engaged, and "star students"
//      (turned up, did the homework, joined what the coach ran). These lead
//      because a finished month cannot change under the student.
//   4. THE GRID — the complete class list in a narrow left rail (nobody is
//      hidden), with the boards that earn attention beside it: classroom
//      activities, tournaments, assignments. Each shows 5 with the full 10
//      behind "More".
//   5. BADGES — earned ones celebrated, locked ones showing PROGRESS ("3 of 5")
//      because a goal you can see yourself approaching is the one you finish.
//
// Students on a break are not returned by the API at all, so nothing here has
// to filter them out.
import React, { useEffect, useState } from 'react';
import api from '../../api';
import UserAvatar from '../UserAvatar';
import './ClassLeaderboard.css';

// Medal for the podium; plain number after that.
function rankLabel(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

// The four scored habits, in the order they appear on the coach's summary.
const PARTS = [
  { key: 'practice',    icon: '🔥', label: 'Practice' },
  { key: 'assignments', icon: '📝', label: 'Homework' },
  { key: 'tournaments', icon: '🏆', label: 'Events' },
  { key: 'attendance',  icon: '📅', label: 'Class' },
];

// A number that counts up to its value on mount. Watching a score climb is the
// small hit of drama that makes a child wait and watch instead of bouncing off
// the page. Honest: it always lands exactly on the real value.
function useCountUp(target, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const goal = Number(target) || 0;
    // Respect the OS "reduce motion" setting — for some people animation is a
    // vestibular problem, not a delight.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || goal === 0) { setN(goal); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(goal * (1 - Math.pow(1 - p, 3))));   // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

// Thin wrapper over the app's shared UserAvatar so this page resolves avatars
// exactly the way every other list does: uploaded photo, then preset, then 3D
// model, then an initial. The local photo-only version meant a student who had
// picked a preset avatar - which is most of them - showed a bare letter here
// while their avatar appeared correctly everywhere else in the app.
function Avatar({ row, size = 32 }) {
  return (
    <UserAvatar
      profilePhotoUrl={row?.avatar}
      activeAvatarUrl={row?.activeAvatarUrl}
      active3dModel={row?.active3dModel}
      displayName={row?.name}
      size={size}
      className="clb-avatar"
    />
  );
}

// ── Coach hero: the class at a glance ───────────────────────────────────────
// The coach view has no rank, no badges and no "you", so without this the page
// opens on a podium and reads as a spreadsheet. A coach comes here to answer
// two questions — is my class moving, and who has stalled — so those are the
// numbers, big, before anything else.
function CoachHero({ summary, topName }) {
  const avg = useCountUp(summary.avgScore);
  const pct = summary.students
    ? Math.round((summary.active / summary.students) * 100) : 0;

  return (
    <div className="clb-chero">
      <div className="clb-hero-glow" aria-hidden="true" />

      <div className="clb-chero-stats">
        <div className="clb-stat">
          <span className="clb-stat-num">{summary.students}</span>
          <span className="clb-stat-lab">Students</span>
        </div>
        <div className="clb-stat is-good">
          <span className="clb-stat-num">{summary.active}</span>
          <span className="clb-stat-lab">Active this month</span>
        </div>
        {/* The number a coach acts on. Styled as a warning only when non-zero —
            a class with nobody stalled should look clean, not red. */}
        <div className={`clb-stat ${summary.inactive > 0 ? 'is-warn' : ''}`}>
          <span className="clb-stat-num">{summary.inactive}</span>
          <span className="clb-stat-lab">Not started</span>
        </div>
        <div className="clb-stat">
          <span className="clb-stat-num">{avg}</span>
          <span className="clb-stat-lab">Average score</span>
        </div>
      </div>

      {/* Class-wide habit averages: which lever is flat across everyone. */}
      <div className="clb-chero-parts">
        {PARTS.map(p => {
          const v = summary.parts?.[p.key] || 0;
          return (
            <div key={p.key} className="clb-chero-part">
              <span className="clb-chero-part-top">
                <span>{p.icon} {p.label}</span>
                <strong>{v}%</strong>
              </span>
              <span className="clb-bar">
                <span className={`clb-bar-fill ${v < 35 ? 'is-low' : v >= 70 ? 'is-high' : ''}`}
                      style={{ width: `${v}%` }} />
              </span>
            </div>
          );
        })}
      </div>

      <p className="clb-chero-line">
        {summary.students === 0
          ? 'No active students yet.'
          : summary.inactive > 0
            ? <>{pct}% of your class is active. <strong>{summary.inactive}</strong> {summary.inactive === 1 ? 'student has' : 'students have'} not started this month.</>
            : <>Every student is active this month. {topName ? <>Leading: <strong>{topName}</strong>.</> : null}</>}
      </p>
    </div>
  );
}

// ── STAR RATING ─────────────────────────────────────────────────────────────
// Five slots, earned at most one per month and only for a month where the
// student practised 15+ days, finished every assignment set, missed no classes
// and joined an activity. Empty slots stay VISIBLE and dark: a goal you can see
// yourself approaching is the one you work towards, and five black outlines
// filling with gold over half a year is a much stronger pull than a number.
//
// Each rank has its own metal, so the first star a child earns already looks
// different from the fifth: gold, silver, bronze, then two medals.
const STAR_TIERS = ['gold', 'silver', 'bronze', 'medal', 'medal'];

function StarRating({ stars = 0, size = '' }) {
  const filled = Math.max(0, Math.min(5, stars));
  return (
    <span className={`clb-stars ${size ? `clb-stars-${size}` : ''}`}
          role="img"
          aria-label={`${filled} of 5 stars earned`}>
      {STAR_TIERS.map((tier, i) => (
        <span
          key={i}
          className={`clb-star ${i < filled ? `is-on clb-star-${tier}` : 'is-off'}`}
          aria-hidden="true"
        >★</span>
      ))}
    </span>
  );
}

// The inline mark that sits AFTER a student's name wherever they are listed.
// Deliberately compact — a count with one star, not five glyphs, because five
// repeated on every row of a thirty-student list is noise rather than reward.
function StarMark({ stars = 0 }) {
  if (!stars) return null;
  const tier = STAR_TIERS[Math.min(stars, 5) - 1];
  return (
    <span className={`clb-starmark clb-star-${tier}`} title={`${stars} of 5 stars`}>
      ★<span className="clb-starmark-n">{stars}</span>
    </span>
  );
}

// ── A ranked board: top 5 visible, the rest behind "Show all" ───────────────
// Every board on this page is the same shape, so they share one component: a
// board that looked different each time would make the page feel like four
// unrelated widgets stapled together.
//
// Five is what shows because five is what a child scans; the other five are one
// click away rather than a longer list nobody reads to the bottom of.
function RankBoard({ title, icon, rows, unit, empty, note, renderMeta, modalTitle, tone = '' }) {
  const [open, setOpen] = useState(false);
  const list = rows || [];
  const top = list.slice(0, 5);
  const hasMore = list.length > 5;

  const Row = ({ r }) => (
    <li className={`clb-rb-row ${r.isMe ? 'is-me' : ''}`}>
      <span className="clb-rb-rank">{rankLabel(r.rank)}</span>
      <Avatar row={r} size={28} />
      <span className="clb-rb-name">
        {r.name}<StarMark stars={r.stars} />{r.isMe && <em className="clb-you"> you</em>}
        {renderMeta && <span className="clb-rb-meta">{renderMeta(r)}</span>}
      </span>
      <span className="clb-rb-val">{r.value}{unit ? <small> {unit}</small> : null}</span>
    </li>
  );

  return (
    <div className={`clb-rb ${tone ? `clb-tone-${tone}` : ''}`}>
      <div className="clb-rb-head">
        {/* The gradient icon tile is what gives each panel its identity at a
            glance — the same device the Social Hub player panels use. */}
        <span className="clb-rb-icon" aria-hidden="true">{icon}</span>
        <span className="clb-rb-headtext">
          <h4 className="clb-rb-title">{title}</h4>
          {note && <p className="clb-rb-note">{note}</p>}
        </span>
        {hasMore && (
          <button className="clb-rb-more" onClick={() => setOpen(true)}>
            More <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
      {top.length === 0
        ? <p className="clb-empty-sm">{empty}</p>
        : <ol className="clb-rb-list">{top.map(r => <Row key={r.id} r={r} />)}</ol>}

      {/* The full ten. A dialog rather than an expanding panel so opening it
          never pushes the rest of the page around under the reader. */}
      {open && (
        <div className="clb-modal" role="dialog" aria-modal="true" aria-label={title}
             onClick={() => setOpen(false)}>
          <div className="clb-modal-card" onClick={e => e.stopPropagation()}>
            <div className="clb-modal-head">
              {/* The card title says "Top 5"; the dialog is showing ten, so it
                  must not repeat a number that is now wrong. */}
              <h4 className="clb-rb-title">{icon} {modalTitle || title} — top {list.length}</h4>
              <button className="clb-modal-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <ol className="clb-rb-list">{list.map(r => <Row key={r.id} r={r} />)}</ol>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Left rail: every active student, compact ────────────────────────────────
// The full class in a narrow scrolling card, the way the Social Hub lists
// players. It stays COMPLETE (not a top 5) — a student who is 14th still needs
// to find themselves — but it no longer dominates the page, because the boards
// beside it are the part worth being excited about.
function OverallRail({ rows, total, scopeLabel }) {
  return (
    <aside className="clb-rail">
      <div className="clb-rb-head clb-rail-head">
        <span className="clb-rb-icon" aria-hidden="true">👥</span>
        <span className="clb-rb-headtext">
          <h4 className="clb-rb-title">Overall Students</h4>
          <p className="clb-rb-note">{scopeLabel}</p>
        </span>
        <span className="clb-rail-count">{total}</span>
      </div>
      {rows.length === 0 ? (
        <p className="clb-empty-sm">
          No ranked students yet. Scores appear once students start practising,
          finishing assignments and attending classes.
        </p>
      ) : (
        <ol className="clb-rail-list">
          {rows.map(r => (
            <li key={r.id} className={`clb-rail-row ${r.isMe ? 'is-me' : ''} ${r.rank <= 3 ? 'is-top3' : ''}`}>
              <span className="clb-rb-rank">{rankLabel(r.rank)}</span>
              <Avatar row={r} size={28} />
              <span className="clb-rail-name">
                {r.name}<StarMark stars={r.stars} />{r.isMe && <em className="clb-you"> you</em>}
              </span>
              <span className="clb-rail-score">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

// ── The podium: top 3, on a real podium ─────────────────────────────────────
// Order is 2-1-3 so the winner stands in the middle and tallest, the way a
// podium actually looks.
function Podium({ rows }) {
  const top = rows.slice(0, 5);
  if (top.length === 0) return null;

  // Display order fans out from the winner: 5 - 3 - 1 - 2 - 4, so rank falls
  // as you move away from the centre in either direction. `size` drives the
  // trophy scale, so the eye lands on 1st before it reads a single number.
  const LAYOUT = [
    { idx: 4, size: 'sm' },
    { idx: 2, size: 'md' },
    { idx: 0, size: 'lg' },
    { idx: 1, size: 'mdl' },
    { idx: 3, size: 'sm' },
  ];

  return (
    <div className="clb-trophies">
      {LAYOUT.map(({ idx, size }) => {
        const r = top[idx];
        // A class with fewer than five ranked students leaves real gaps rather
        // than inventing filler names. The slot keeps its width so the winner
        // stays centred.
        if (!r) return <div key={'empty' + idx} className={`clb-tr clb-tr-${size} is-empty`} aria-hidden="true" />;
        const place = idx + 1;
        return (
          <div key={r.id} className={`clb-tr clb-tr-${size} ${r.isMe ? 'is-me' : ''}`}>
            {/* clb-tr-p{place} carries this trophy's own aspect ratio and ring
                position - the five images are not uniform. */}
            <div className={`clb-tr-art clb-tr-p${place}`}>
              <img
                className="clb-tr-img"
                src={`/trophies/mycoachleaderboard${place}.png`}
                alt=""
                loading="lazy"
              />
              {/* The trophy art is a RING - an empty frame. The student sits
                  inside it, positioned on the measured hole (18.5% / 8% of the
                  image box), so the photo looks mounted in the trophy rather
                  than floating over it. */}
              <span className="clb-tr-face">
                {(r.avatar || r.activeAvatarUrl || r.active3dModel)
                  ? <UserAvatar
                      profilePhotoUrl={r.avatar}
                      activeAvatarUrl={r.activeAvatarUrl}
                      active3dModel={r.active3dModel}
                      displayName={r.name}
                      size={'100%'}
                      className="clb-tr-photo"
                    />
                  : <span className="clb-tr-initial">{(r.name || '?').charAt(0).toUpperCase()}</span>}
              </span>
            </div>
            <div className="clb-tr-name">{r.name}<StarMark stars={r.stars} />{r.isMe && <em className="clb-you"> you</em>}</div>
            <div className="clb-tr-score">{r.score}<small> pts</small></div>
          </div>
        );
      })}
    </div>
  );
}

// ── The student's own standing, in words ────────────────────────────────────
// Replaces the old percentage bars under the hero. A child does not act on
// "practice 75%"; they act on "you are 32 points from 15th". Every line here is
// a number they can close.
function MyStanding({ me, total, rows }) {
  const pts = useCountUp(me.score);

  // The student directly above. Ranks can be SHARED, so "one rank up" is the
  // nearest row with a strictly better rank, not simply the previous index.
  const above = [...rows].reverse().find(r => r.rank < me.rank);
  const gapUp = above ? Math.max(0, above.score - me.score) + 1 : 0;

  return (
    <div className="clb-standing">
      <div className="clb-standing-head">
        <span className="clb-standing-name">{me.name}</span>
        <span className="clb-standing-rank">
          Rank <strong>{me.rank}</strong> <span className="clb-standing-of">of {total}</span>
        </span>
      </div>

      <div className="clb-standing-grid">
        <div className="clb-fact">
          <span className="clb-fact-num">{pts}</span>
          <span className="clb-fact-lab">Total points</span>
        </div>

        <div className="clb-fact is-climb">
          <span className="clb-fact-num">{above ? `+${gapUp}` : '—'}</span>
          <span className="clb-fact-lab">
            {above ? <>to pass <strong>{above.name}</strong> (#{above.rank})</> : 'You are top of the class'}
          </span>
        </div>

        <div className="clb-fact is-star">
          <span className="clb-fact-stars">
            <StarRating stars={me.stars || 0} />
            <span className="clb-fact-starnum">{me.stars || 0}<small>/5</small></span>
          </span>
          <span className="clb-fact-lab">
            {(me.stars || 0) >= 5
              ? 'All five stars earned'
              : <>Stars earned — <strong>one per month</strong> for a full month of work</>}
          </span>
        </div>
      </div>
    </div>
  );
}

// `mode` picks WHOSE view this is:
//   'student' (default) - the caller is a student in the class. Hits the
//                         student endpoint, highlights their row, shows badges.
//   'coach'             - the caller is the coach looking at their OWN class.
//                         Hits the coach endpoint (no coachId needed, the token
//                         identifies them), and hides the badge block: badges
//                         are one child's rewards, not information about a class.
export default function ClassLeaderboard({ coachId, coachName, mode = 'student' }) {
  // Monthly only. The weekly window still exists in the API and the service —
  // this is a UI decision, not a data one — so restoring the switch later means
  // putting the buttons back, nothing more.
  const period = 'month';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCoach = mode === 'coach';

  useEffect(() => {
    // The coach view identifies the class from the auth token, so it must NOT
    // wait for a coachId that will never arrive.
    if (!isCoach && !coachId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = isCoach
      ? `/api/coach/leaderboard?period=${period}`
      : `/api/coach/leaderboard/my/${coachId}?period=${period}`;
    api.get(url)
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError('Could not load the leaderboard.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [coachId, period, isCoach]);

  if (loading) {
    // A skeleton rather than a word: the page keeps its shape while it loads, so
    // it never jumps under the reader's eyes.
    return (
      <div className="clb">
        <div className="clb-skel clb-skel-hero" />
        <div className="clb-skel clb-skel-row" />
        <div className="clb-skel clb-skel-row" />
      </div>
    );
  }
  if (error) return <div className="clb-note clb-note-err">{error}</div>;
  if (!data) return null;

  const rows = data.overall?.rows || [];
  const badges = data.badges || { earned: [], locked: [] };
  const me = data.me;
  // The focused boards. Defaulted so an older API response (or a coach endpoint
  // that has not been redeployed yet) renders empty boards instead of crashing.
  const boards = data.boards || { classroom: [], assignments: [], tournaments: [] };
  const pm = boards.prevMonth || { label: '', engagement: [], stars: [] };

  return (
    <div className="clb">
      {/* Header + window switch. Weekly and monthly are the two the coach asked
          for; both are ROLLING windows, so the board is never empty on the 1st. */}
      <div className="clb-head">
        <div>
          {/* The coach page's own <h1> already says "Leaderboard", so repeating
              it here just stacked two near-identical titles. */}
          {!isCoach && <h3 className="clb-title">🏆 Class Leaderboard</h3>}
          <p className="clb-sub">
            {/* The API says what the board is actually scoped to. For an admin
                coach that is the student's BATCH, not the whole academy, so
                labelling it "X's class" there would be a lie. */}
            {isCoach ? 'Your class' : (data.scope || (coachName ? `${coachName}'s class` : 'Your class'))} · {data.overall?.totalStudents || 0} active
            {' '}student{(data.overall?.totalStudents || 0) === 1 ? '' : 's'}
          </p>
        </div>

        {/* ── YOUR STARS ── sits beside the title on desktop and drops below it
            on a phone. This is the one number on the page the student owns
            outright: it cannot be taken by a classmate having a better month,
            only earned or abandoned. */}
        {me && (
          <div className="clb-starbar">
            <StarRating stars={me.stars || 0} size="lg" />
            <span className="clb-starbar-count">{me.stars || 0}<small>/5</small></span>
          </div>
        )}
      </div>

      {/* ── TOP 5 TROPHIES ── first thing on BOTH views. The winner is centre
          and largest, ranks fanning out 5-3-1-2-4. */}
      <Podium rows={rows} />

      {/* The student's own standing, in plain numbers they can act on. */}
      {me && (
        <MyStanding
          me={me}
          total={data.overall?.totalStudents || rows.length}
          rows={rows}
        />
      )}

      {/* The coach's equivalent: no rank of their own, so the CLASS is the hero. */}
      {isCoach && data.summary && (
        <CoachHero summary={data.summary} topName={rows[0]?.name} />
      )}

      {/* ── THE MAIN GRID ──────────────────────────────────────────────────
          ONE grid: the full class list runs down the whole left side as a
          single column, and every other board stacks on the right. The rail
          previously sat beside only the first row and left a tall empty block
          under it; spanning the grid gives the class list room to be long
          without wasting the space next to it. */}
      <div className="clb-grid">
        <OverallRail
          rows={rows}
          total={data.overall?.totalStudents || rows.length}
          scopeLabel={isCoach ? 'Your class' : (data.scope || 'Your class')}
        />

        <div className="clb-col">
          {/* LAST MONTH is FINISHED, so these are the only results on the page
              that cannot change under the student. That is why they lead. */}
          <div className="clb-block">
            <h4 className="clb-block-title">
              ⭐ Last month{pm.label ? ` — ${pm.label}` : ''}
            </h4>
            <div className="clb-two">
              <RankBoard
                title="Top 5 Students" icon="🏅" modalTitle="Most Engaged" tone="gold"
                rows={pm.engagement} unit="pts"
                note="Most engaged overall last month"
                empty="Last month has no results yet."
              />
              <RankBoard
                title="Star Students" icon="🌟" tone="star"
                rows={pm.stars} unit="pts"
                note="Attendance + all homework + joined class activities"
                empty="No star students last month yet."
                renderMeta={r => (
                  <>
                    {r.perfectAttendance && <span className="clb-tag is-good">100% classes</span>}
                    {r.allAssignments && <span className="clb-tag">All homework</span>}
                    {!r.perfectAttendance && !r.allAssignments && (
                      <span className="clb-tag is-dim">{r.classes} classes · {r.assignmentsDone}/{r.assignmentsSet} homework</span>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="clb-two">
            <RankBoard
              title="Classroom Activities" icon="🏫" tone="class"
              rows={boards.classroom} unit="joined"
              note="Races, tournaments and live classes your coach ran"
              empty="No class activities yet this month."
            />
            <RankBoard
              title="Tournaments" icon="🏆" tone="cup"
              rows={boards.tournaments} unit="played"
              note="Tournaments, races and team races entered"
              empty="No tournaments yet this month."
            />
          </div>

          <RankBoard
            title="Assignments" icon="📝" tone="work"
            rows={boards.assignments} unit="done"
            note="Most homework finished — accuracy breaks ties"
            empty="No finished assignments yet this month."
            renderMeta={r => <span className="clb-tag is-dim">{r.accuracy}% accuracy</span>}
          />

      {/* ── BADGES ── student view only. A coach looking at their class does not
          have badges of their own here, and the endpoint sends none. */}
      {!isCoach && (
      <div className="clb-block">
        <h4 className="clb-block-title">
          Your badges
          <span className="clb-badge-count">{badges.earned.length}/{badges.earned.length + badges.locked.length}</span>
        </h4>
        <p className="clb-sub clb-sub-tight">
          Earned from your last 30 days. Badges are yours alone — everyone can earn every one.
        </p>
        <div className="clb-badges">
          {badges.earned.map(b => (
            <span key={b.id} className="clb-badge is-earned" title={b.hint}>
              <span className="clb-badge-icon">{b.icon}</span>
              <span className="clb-badge-label">{b.label}</span>
              <span className="clb-badge-got">Earned</span>
            </span>
          ))}
          {/* Locked badges stay visible WITH their requirement and how far along
              the student already is — a goal you cannot see is a goal nobody
              works towards, and "3 of 5" pulls far harder than "locked". */}
          {badges.locked.map(b => (
            <span key={b.id} className="clb-badge is-locked" title={b.hint}>
              <span className="clb-badge-icon">{b.icon}</span>
              <span className="clb-badge-label">{b.label}</span>
              {typeof b.pct === 'number' ? (
                <>
                  <span className="clb-badge-bar">
                    <span className="clb-badge-fill" style={{ width: `${b.pct}%` }} />
                  </span>
                  <span className="clb-badge-hint">{b.have}/{b.need} · {b.hint}</span>
                </>
              ) : (
                <span className="clb-badge-hint">{b.hint}</span>
              )}
            </span>
          ))}
        </div>
      </div>
      )}
        </div>
      </div>
    </div>
  );
}
