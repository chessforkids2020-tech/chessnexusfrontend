// pages/CoachHubPage.jsx
//
// /coach-hub — the public "Coach" destination in the sidebar.
//
// PUBLIC on purpose: visible to everyone, logged in or not. It is a page ABOUT
// coaching on Chess Nexus, NOT the coach's own dashboard (that is
// /coach/dashboard, reached from the coach-only shortcut in the sidebar footer).
//
// CLAIMING = ONBOARDING AS A COACH.
//
// The button does not file a request; it sends the visitor to
// /coach/onboarding. That is the only way to claim that makes sense: there is
// nothing to grant a Pro year TO until the person actually has a coach account,
// so a "your claim is in" confirmation on a visitor who never onboarded would be
// a dead end for them and an unusable lead for the admin.
//
// The prize itself is still granted BY HAND from Admin → Coaches → Grant plan
// (Pro, 12 months). There is no counter yet, so nothing stops a 51st claim —
// track the count yourself and pull the offer when it fills. If this ever needs
// to self-serve, a founding-coach counter + auto-grant on onboarding completion
// is where it would go.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import { FEATURES } from '../components/marketing/FeatureLinkGrid';
import { CoachCard } from './CoachesDirectoryPage';
import './CoachesDirectoryPage.css';
import { useAuth } from '../contexts/AuthContext';
import './CoachHubPage.css';

// The coach-facing marketing pages, in the order they are shown. Pulled FROM the
// FeatureLinkGrid registry rather than retyped, so an icon or title change there
// flows here automatically. Same list and order as the homepage row.
const COACH_DEEP_SLUGS = [
  '/chess-coaching',
  '/chess-academy-software',
  '/live-chess-classroom',
  '/chess-courses',
  '/chess-progress-reports',
  '/chess-coach-guide',
  '/chess-coach-referral',
  '/chess-coaching-questions',
];
const COACH_LINKS = COACH_DEEP_SLUGS
  .map(slug => FEATURES.find(f => f.slug === slug))
  .filter(Boolean);   // a renamed slug drops out rather than rendering a dead link

export default function CoachHubPage() {
  const { user } = useAuth();

  // Where "claim" goes depends on how far along the visitor already is:
  //   not logged in  -> make an account first
  //   logged in      -> the coach onboarding form
  //   already a coach-> their dashboard; there is nothing left to claim here
  // Spots left in the founding-coach offer. The number is set BY HAND in
  // Admin → Settings; see the note on AppSettings.foundingCoaches for why it is
  // not derived from the coach table.
  //
  // `null` while loading and on failure, which renders no counter at all — a
  // promo banner must never be the reason this page looks broken.
  const [spots, setSpots] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get('/api/public/founding-coaches')
      .then(r => { if (alive) setSpots(r.data); })
      .catch(() => { /* leave null — the offer simply shows no counter */ });
    return () => { alive = false; };
  }, []);
  // A few real coaches to show under the offer. The directory itself lives at
  // /coaches; this is a preview so a visitor sees actual people rather than
  // having to trust a link. Failure is silent — the section just does not
  // appear, because a marketing page must not break over it.
  const [coaches, setCoaches] = useState([]);
  useEffect(() => {
    let alive = true;
    api.get('/api/public/coaches')
      .then(r => { if (alive) setCoaches((r.data?.coaches || []).slice(0, 6)); })
      .catch(() => { /* no coaches section */ });
    return () => { alive = false; };
  }, []);

  const offerOpen = spots?.enabled !== false;
  const pct = spots && spots.total ? Math.min(100, Math.round((spots.claimed / spots.total) * 100)) : 0;

  const isCoach = !!user?.isCoach;
  const claimTo = !user ? '/signup-request' : isCoach ? '/coach/dashboard' : '/coach/onboarding';
  const claimLabel = isCoach ? '🎓 Go to your coach dashboard' : '🏆 Claim my spot — start as a coach';

  return (
    <div className="chub-page">
      <SEO
        title="Coaching on Chess Nexus — free for the first 50 coaches"
        description="Run your whole coaching practice on Chess Nexus: a live classroom, courses, assignments, attendance and parent reports. The first 50 coaches get the Pro plan free for a year."
        canonical="/coach-hub"
      />

      {/* ── THE OFFER ──────────────────────────────────────────────────
          When the admin switches it off (or the last spot goes), the whole gold
          treatment drops away rather than advertising an offer nobody can take.
          The page then reads as a plain "start coaching here" invitation. */}
      <section className={offerOpen ? 'chub-hero' : 'chub-hero chub-hero-plain'}>
        {offerOpen && (
          <span className="chub-badge">
            🏆 Founding coaches · first {spots?.total ?? 50} only
          </span>
        )}
        <h1 className="chub-title">
          {offerOpen
            ? <>Be one of the first <em>{spots?.total ?? 50} coaches</em> on Chess Nexus</>
            : <>Run your coaching on <em>Chess Nexus</em></>}
        </h1>
        <p className="chub-lead">
          {offerOpen
            ? <>We are opening Chess Nexus to its founding coaches. The first {spots?.total ?? 50} get
                the <strong>Pro plan free for a whole year</strong> — the complete
                coaching workspace, with nothing to pay and no card required.</>
            : <>The complete coaching workspace: a live classroom, courses,
                assignments, attendance and parent reports — free for up to 30
                students, with no card required.</>}
        </p>

        <ul className="chub-gets">
          {/* Kept for both states: this is what the paid Pro plan gives, whether
              it is being given away or bought. */}
          <li><span aria-hidden="true">👥</span> Up to <strong>70 students</strong></li>
          <li><span aria-hidden="true">🔴</span> <strong>Unlimited live classes</strong> — unlimited students in the room</li>
          <li><span aria-hidden="true">⏱️</span> Classes up to 120 minutes, or with <strong>no time limit</strong></li>
          <li><span aria-hidden="true">📚</span> Courses, assignments, attendance, parent reports</li>
          <li><span aria-hidden="true">⭐</span> Unlimited Team Race &amp; Monthly Focus</li>
        </ul>

        {/* The counter. Only rendered once the number has actually loaded —
            "0 spots left" while fetching would kill the offer stone dead. */}
        {spots && offerOpen && (
          <div className="chub-spots">
            <div className="chub-spots-n">
              <strong>{spots.remaining}</strong> of {spots.total} spots left
            </div>
            <div className="chub-spots-bar" role="img"
                 aria-label={`${spots.claimed} of ${spots.total} founding coach spots claimed`}>
              <span style={{ width: `${pct}%` }} />
            </div>
            {spots.remaining <= 10 && spots.remaining > 0 && (
              <div className="chub-spots-warn">Almost gone — {spots.remaining} left</div>
            )}
          </div>
        )}

        {offerOpen
          ? <div className="chub-worth">Worth <strong>$228</strong> over the year · yours free</div>
          : <div className="chub-worth">Pro is <strong>$19/month</strong> · free forever up to 30 students</div>}

        <Link to={claimTo} className="chub-cta">{claimLabel}</Link>
        <p className="chub-fineprint">
          {isCoach
            ? 'You are already set up as a coach. If you are one of the first 50, your Pro year is applied to your account — nothing else to do.'
            : 'Takes a few minutes: tell us about your coaching, and we verify you (usually within 12 hours). Already coaching elsewhere? Bring your students across — your first year costs nothing.'}
        </p>
      </section>

      {/* ── COACHES ON CHESS NEXUS ───────────────────────────────────── */}
      {coaches.length > 0 && (
        <section className="chub-coaches">
          <div className="chub-coaches-head">
            <h2 className="chub-more-title">Coaches on Chess Nexus</h2>
            <Link to="/coaches" className="chub-browse">Browse all coaches →</Link>
          </div>
          <div className="cd-grid">
            {coaches.map(c => <CoachCard key={c.code} c={c} />)}
          </div>
        </section>
      )}

      {/* ── DEEP LINKS ───────────────────────────────────────────────── */}
      <section className="chub-more">
        <h2 className="chub-more-title">Want more detail on any of it?</h2>
        <div className="chub-links">
          {COACH_LINKS.map(f => (
            <Link key={f.slug} to={f.slug} className="chub-link">
              <span aria-hidden="true">{f.icon}</span>{f.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
