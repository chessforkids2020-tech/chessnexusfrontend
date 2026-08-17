// pages/CoachesDirectoryPage.jsx
//
// /coaches — the browsable coach directory.
//
// Only coaches who are VERIFIED by the Nexus team AND have ticked "list me
// publicly" appear here; the server enforces both, so this page cannot leak an
// unverified account by forgetting a filter.
//
// Contacting a coach still goes through the ask-and-approve flow — browsing is
// open, but nobody reaches a coach without that coach agreeing.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import { htmlToText } from '../utils/htmlToText';
import './CoachesDirectoryPage.css';

const LEVEL_LABEL = { beginner: 'Beginners', intermediate: 'Intermediate', advanced: 'Advanced' };

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Exported so the Coach hub page can show the same cards without duplicating
// the markup — one card definition, so a change to it shows up in both places.
// First line or two of a coach's bio, for the card.
//
// The full bio only exists on the coach's own page, so unlike the header there,
// a preview here is the only prose a browser sees — it is what turns a row of
// tags into a person. Cuts on a sentence end rather than a character count,
// since a bio is free text and a blind slice reads as broken mid-word.
function shortBioOf(bio, max = 170) {
  // htmlToText first: bios are stored as sanitised HTML for the coach's public
  // page, and collapsing whitespace alone printed the markup verbatim on the
  // card — "<h3>I have been playing <strong>competitive </strong>chess…".
  const text = htmlToText(bio);
  if (!text) return '';
  if (text.length <= max) return text;

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences) {
    let out = '';
    for (const s of sentences) {
      if ((out + s).trim().length > max) break;
      out += s;
    }
    if (out.trim()) return out.trim();
  }
  // No sentence break early enough — fall back to a word boundary.
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).trim() + '…';
}

export function CoachCard({ c }) {
  // A coach may quote hourly, monthly, or both. Show whichever they gave —
  // reading only hourlyRate left monthly-only coaches with no price at all.
  const rateSym = c.rateCurrency === 'USD' ? '$' : '₹';
  const rate = [
    c.hourlyRate ? `${rateSym}${c.hourlyRate}/hr` : null,
    c.monthlyRate ? `${rateSym}${c.monthlyRate}/mo` : null,
  ].filter(Boolean).join(' · ') || null;
  const best = c.ratings.fide || c.ratings.lichess || c.ratings.chesscom;
  const bestLabel = c.ratings.fide ? 'FIDE' : c.ratings.lichess ? 'Lichess' : 'Chess.com';
  const blurb = shortBioOf(c.bio);

  // Credibility line. The API already returns all of this — the card simply was
  // not using it, which is what made it read as plain: a parent choosing a coach
  // wants to know "is this person real, experienced, and already teaching?" and
  // none of that was on screen.
  //
  // Each entry is only rendered when the coach actually supplied it, so a new
  // coach shows a shorter strip rather than a row of zeroes.
  const credentials = [
    c.experienceYears ? { k: 'exp', n: c.experienceYears, l: c.experienceYears === 1 ? 'yr coaching' : 'yrs coaching' } : null,
    c.studentsCount ? { k: 'stu', n: c.studentsCount, l: c.studentsCount === 1 ? 'student' : 'students' } : null,
  ].filter(Boolean);

  return (
    <Link to={`/coaches/${c.code}`} className="cd-card">
      <div className="cd-card-top">
        {/* Photo carries the verified tick, so the badge reads as being about
            the PERSON rather than floating among the tags below. */}
        <div className="cd-photo-wrap">
          <div className="cd-photo">
            {c.photo ? <img src={c.photo} alt="" /> : <span>{initials(c.name)}</span>}
          </div>
          {c.verified && (
            <span className="cd-verified" title="Verified by ChessNexus" aria-label="Verified coach">✓</span>
          )}
        </div>

        <div className="cd-id">
          <div className="cd-name">
            {c.title && <span className="cd-title">{c.title}</span>}
            {c.name}
          </div>

          <div className="cd-meta-line">
            {c.country && <span className="cd-country">{c.country}</span>}
            {c.isAcademy && <span className="cd-academy">🏫 Academy</span>}
          </div>

          {/* The coach's one-liner, then the opening of their bio. */}
          {c.specialization && <p className="cd-spec">{c.specialization}</p>}

          <div className="cd-facts">
            {best && <span className="cd-fact"><b>{best}</b> {bestLabel}</span>}
            {rate && <span className="cd-fact cd-fact-rate">{rate}</span>}
            {c.languages.length > 0 && (
              <span className="cd-fact cd-fact-lang">{c.languages.slice(0, 3).join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      {credentials.length > 0 && (
        <div className="cd-creds">
          {credentials.map(cr => (
            <div key={cr.k} className="cd-cred">
              <span className="cd-cred-n">{cr.n}</span>
              <span className="cd-cred-l">{cr.l}</span>
            </div>
          ))}
        </div>
      )}

      {blurb && <p className="cd-bio">{blurb}</p>}

      <div className="cd-tags">
        {c.acceptingStudents && <span className="cd-tag cd-tag-open">● Taking students</span>}
        {c.teaches.map(t => <span key={t} className="cd-tag">{LEVEL_LABEL[t] || t}</span>)}
      </div>

      {/* A card that is a link should say where it goes. */}
      <span className="cd-view">View profile →</span>
    </Link>
  );
}

export default function CoachesDirectoryPage() {
  const [all, setAll] = useState(null);      // null = loading
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');

  // Fetched ONCE and filtered client-side. The endpoint caps at 60 coaches, so
  // the whole directory fits comfortably in memory, and filtering locally means
  // typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    let alive = true;
    api.get('/api/public/coaches')
      .then(r => { if (alive) setAll(r.data.coaches || []); })
      .catch(e => {
        if (alive) { setAll([]); setErr(e.response?.data?.message || 'Could not load coaches.'); }
      });
    return () => { alive = false; };
  }, []);

  // Language options come from the coaches themselves rather than a fixed list,
  // so a coach teaching in Telugu makes Telugu filterable without a code change.
  const languages = useMemo(() => {
    const set = new Set();
    (all || []).forEach(c => c.languages.forEach(l => set.add(l)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [all]);

  const shown = useMemo(() => {
    let list = all || [];
    if (openOnly) list = list.filter(c => c.acceptingStudents);
    if (level) list = list.filter(c => c.teaches.includes(level));
    if (language) list = list.filter(c => c.languages.includes(language));
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(term)
        || (c.specialization || '').toLowerCase().includes(term)
        || (c.bio || '').toLowerCase().includes(term)
        || (c.country || '').toLowerCase().includes(term));
    }
    return list;
  }, [all, q, openOnly, level, language]);

  return (
    <div className="cd-page">
      <SEO
        title="Chess coaches — find a coach on Chess Nexus"
        description="Browse verified chess coaches on Chess Nexus. Filter by language, level and rate, then ask to join their students."
        canonical="/coaches"
      />

      <header className="cd-head">
        <h1>Find a chess coach</h1>
        <p>
          Every coach here is verified by the Chess Nexus team. Browse their
          pages, then ask to join — the coach decides who joins their students.
        </p>
      </header>

      <div className="cd-filters">
        <input
          className="cd-search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, country or what they teach"
          aria-label="Search coaches"
        />
        <div className="cd-filter-row">
          <button type="button"
                  className={`cd-chip ${openOnly ? 'on' : ''}`}
                  onClick={() => setOpenOnly(v => !v)}>
            {openOnly ? '✓ ' : ''}Taking students
          </button>
          <select className="cd-select" value={level} onChange={e => setLevel(e.target.value)} aria-label="Level">
            <option value="">Any level</option>
            {Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {languages.length > 0 && (
            <select className="cd-select" value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language">
              <option value="">Any language</option>
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
        </div>
      </div>

      {all === null ? (
        <div className="cd-muted">Loading coaches…</div>
      ) : err ? (
        <div className="cd-muted">{err}</div>
      ) : all.length === 0 ? (
        // No coaches listed yet — say so plainly rather than showing an empty
        // grid that reads as a broken page.
        <div className="cd-empty">
          <div className="cd-empty-ic" aria-hidden="true">🎓</div>
          <h2>No coaches listed yet</h2>
          <p>
            Coaches appear here once they are verified and choose to be listed.
            Are you a coach? Your first year is free.
          </p>
          <Link to="/coach-hub" className="cd-btn">Start coaching on Chess Nexus</Link>
        </div>
      ) : shown.length === 0 ? (
        <div className="cd-empty">
          <h2>No coaches match that</h2>
          <p>Try clearing a filter or searching for something else.</p>
          <button type="button" className="cd-btn"
                  onClick={() => { setQ(''); setOpenOnly(false); setLevel(''); setLanguage(''); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="cd-count">
            {shown.length} coach{shown.length === 1 ? '' : 'es'}
            {shown.length !== all.length && ` of ${all.length}`}
          </div>
          <div className="cd-grid">
            {shown.map(c => <CoachCard key={c.code} c={c} />)}
          </div>
        </>
      )}
    </div>
  );
}
