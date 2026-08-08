// pages/PublicCoachPage.jsx
//
// /coaches/:code — one coach's public page. Anyone can read it, logged in or not.
//
// NOT /coach/:code. There are already 17 routes under /coach/* (onboarding,
// dashboard, students, assignments…), and a bare parameter there would match
// every one of them — React Router takes the first match, so /coach/dashboard
// would have opened this page looking for a coach whose code is "dashboard".
// The directory owns /coaches, so the profile lives inside it.
//
// Served by GET /api/public/coaches/:code, which enforces three gates: the
// person is a coach, the Nexus team verified them, and they ticked "list me".
// A coach who fails any of those 404s here — including by direct link, because
// unlisting has to actually unpublish.
//
// Contact is deliberately NOT a message form. A student joins by asking, and
// the coach approves: that flow already exists at /join-coach/<code> and keeps
// the coach in control of who reaches them.
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import './PublicCoachPage.css';

const LEVEL_LABEL = { beginner: 'Beginners', intermediate: 'Intermediate', advanced: 'Advanced' };

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Compact rating for the header row: "FIDE 2343  Lichess 2585".
// Links out where we know the handle, so a visitor can check the number — these
// are typed by the coach, not fetched from anywhere.
function HeadRating({ label, value, href }) {
  if (!value) return null;
  const inner = <><span className="pc-hr-l">{label}</span> <strong>{value}</strong></>;
  return href
    ? <a className="pc-hr" href={href} target="_blank" rel="noopener noreferrer nofollow">{inner}</a>
    : <span className="pc-hr">{inner}</span>;
}

export default function PublicCoachPage() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, coach: null, error: '' });

  useEffect(() => {
    let alive = true;
    api.get(`/api/public/coaches/${encodeURIComponent(code)}`)
      .then(r => { if (alive) setState({ loading: false, coach: r.data.coach, error: '' }); })
      .catch(e => {
        if (alive) setState({
          loading: false, coach: null,
          error: e.response?.data?.message || 'That coach page is not available.',
        });
      });
    return () => { alive = false; };
  }, [code]);

  if (state.loading) {
    return <div className="pc-page"><div className="pc-muted">Loading…</div></div>;
  }

  if (state.error) {
    return (
      <div className="pc-page">
        <div className="pc-empty">
          <div className="pc-empty-ic" aria-hidden="true">🎓</div>
          <h1>Coach page not available</h1>
          <p>{state.error}</p>
          <Link to="/coaches" className="pc-btn">Browse all coaches</Link>
        </div>
      </div>
    );
  }

  const c = state.coach;
  const rate = c.hourlyRate
    ? `${c.rateCurrency === 'USD' ? '$' : '₹'}${c.hourlyRate}`
    : null;
  const years = c.coachingSince ? new Date(c.coachingSince).getFullYear() : null;

  return (
    <div className="pc-page">
      <SEO
        title={`${c.title ? c.title + ' ' : ''}${c.name} — chess coach on Chess Nexus`}
        description={
          (c.bio || `${c.name} teaches chess on Chess Nexus.`).slice(0, 155)
        }
        canonical={`/coaches/${c.code}`}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="pc-head">
        <div className="pc-photo">
          {c.photo ? <img src={c.photo} alt="" /> : <span>{initials(c.name)}</span>}
        </div>

        <div className="pc-head-tx">
          <h1 className="pc-name">
            {c.title && <span className="pc-title">{c.title}</span>}
            {c.name}
            {c.verified && <span className="pc-verified" title="Verified by the Nexus team">✓</span>}
          </h1>

          {/* The coach's one-liner, directly under the name. */}
          {c.specialization && <p className="pc-tagline">{c.specialization}</p>}

          {/* Labelled rows, so a visitor scans down the left edge for the fact
              they want instead of parsing a run of badges. Each row is dropped
              entirely when the coach left it blank. */}
          <dl className="pc-rows">
            {c.country && (
              <div className="pc-row">
                <dt>Location</dt>
                <dd>{c.country}</dd>
              </div>
            )}

            {c.languages.length > 0 && (
              <div className="pc-row">
                <dt>Languages</dt>
                <dd>{c.languages.join(', ')}</dd>
              </div>
            )}

            {(c.ratings.fide || c.ratings.lichess || c.ratings.chesscom) && (
              <div className="pc-row">
                <dt>Rating</dt>
                <dd className="pc-rate-line">
                  <HeadRating label="FIDE" value={c.ratings.fide}
                              href={c.handles.fideId ? `https://ratings.fide.com/profile/${c.handles.fideId}` : null} />
                  <HeadRating label="Lichess" value={c.ratings.lichess}
                              href={c.handles.lichess ? `https://lichess.org/@/${c.handles.lichess}` : null} />
                  <HeadRating label="Chess.com" value={c.ratings.chesscom}
                              href={c.handles.chesscom ? `https://www.chess.com/member/${c.handles.chesscom}` : null} />
                </dd>
              </div>
            )}

            {rate && (
              <div className="pc-row">
                <dt>Hourly rate</dt>
                <dd>{rate} / hour</dd>
              </div>
            )}

            {(c.isAcademy && c.academyName) && (
              <div className="pc-row">
                <dt>Academy</dt>
                <dd>{c.academyName}</dd>
              </div>
            )}

            {c.experienceYears != null && (
              <div className="pc-row">
                <dt>Teaching</dt>
                <dd>{c.experienceYears} {c.experienceYears === 1 ? 'year' : 'years'}</dd>
              </div>
            )}
          </dl>

          {/* No bio preview here on purpose: the full text sits in the "About"
              section just below, and repeating its opening lines at the top
              only pushes that section further down the page. The preview lives
              on the DIRECTORY card, where the full bio is not available. */}
          <div className="pc-badges">
            {c.acceptingStudents
              ? <span className="pc-badge pc-badge-open">● Taking new students</span>
              : <span className="pc-badge pc-badge-full">Not taking students right now</span>}
            {years && <span className="pc-badge">On Chess Nexus since {years}</span>}
          </div>
        </div>
      </header>

      {/* ── The long read ──────────────────────────────────────────────── */}
      {c.bio && (
        <section className="pc-section">
          <h2>About {c.name.split(' ')[0]}</h2>
          {/* pre-wrap, not a markdown renderer: the coach typed plain text with
              their own line breaks, and those are what they meant. */}
          <p className="pc-prose">{c.bio}</p>
        </section>
      )}

      {c.achievements && (
        <section className="pc-section">
          <h2>Achievements</h2>
          <p className="pc-prose">{c.achievements}</p>
        </section>
      )}

      {/* ── At a glance ────────────────────────────────────────────────── */}
      {(c.languages.length > 0 || c.teaches.length > 0) && (
        <section className="pc-section">
          <h2>Teaching</h2>
          <div className="pc-facts">
            {c.languages.length > 0 && (
              <div className="pc-fact">
                <span className="pc-fact-k">Languages</span>
                <span className="pc-fact-v">{c.languages.join(' · ')}</span>
              </div>
            )}
            {c.teaches.length > 0 && (
              <div className="pc-fact">
                <span className="pc-fact-k">Levels</span>
                <span className="pc-fact-v">
                  {c.teaches.map(t => LEVEL_LABEL[t] || t).join(' · ')}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Ask to join ────────────────────────────────────────────────── */}
      <section className="pc-cta">
        {c.acceptingStudents ? (
          <>
            <h2>Learn with {c.name.split(' ')[0]}</h2>
            <p>
              Send a request to join. {c.name.split(' ')[0]} decides who joins
              their roster — you will hear back either way.
            </p>
            <Link to={`/join-coach/${c.code}`} className="pc-btn pc-btn-primary">
              Ask to join as a student
            </Link>
          </>
        ) : (
          <>
            <h2>Not taking students right now</h2>
            <p>This coach's roster is full. Have a look at the other coaches on Chess Nexus.</p>
            <Link to="/coaches" className="pc-btn">Browse all coaches</Link>
          </>
        )}
      </section>

      <div className="pc-foot">
        <Link to="/coaches">← All coaches</Link>
      </div>
    </div>
  );
}
