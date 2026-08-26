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
import React, { useEffect, useState, useRef } from 'react';
import CoachProse from '../components/CoachProse';
import { htmlToText } from '../utils/htmlToText';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import './PublicCoachPage.css';

const LEVEL_LABEL = { beginner: 'Beginners', intermediate: 'Intermediate', advanced: 'Advanced' };

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Below this width the achievements text and the photo column stack, so no
// photos go in the side column — a 200px-wide photo beside a 200px-wide
// paragraph helps neither.
const SIDE_BY_SIDE_MIN_PX = 860;
// Height one side-column photo occupies: the image at its 4:3 ratio in a 200px
// column (150px), plus the gap. Used to work out how many fit beside the text.
// Kept in sync with .pc-ach-photos in PublicCoachPage.css.
const PHOTO_SLOT_PX = 162;

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
  // Gallery: index of the image open full-size, or null.
  const [lightbox, setLightbox] = useState(null);
  const galleryRef = useRef(null);
  // Measured height of the achievements prose, and whether the viewport is wide
  // enough to put photos beside it. Both drive how many photos go in the side
  // column — see asideCount below.
  const achTextRef = useRef(null);
  const [achHeight, setAchHeight] = useState(0);
  const [sideBySide, setSideBySide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= SIDE_BY_SIDE_MIN_PX : false
  );

  // Escape closes the lightbox — a modal that only closes by mouse is a trap
  // for anyone on a keyboard.
  useEffect(() => {
    if (lightbox === null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  // Measure the achievements text so the photo column can match its height.
  // ResizeObserver rather than a one-off read: the height changes when the
  // window is resized, when a web font finishes loading, and when the coach's
  // own formatting reflows — a single measurement on mount would be wrong in
  // all three cases.
  useEffect(() => {
    const el = achTextRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      setAchHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.coach]);

  useEffect(() => {
    const onResize = () => setSideBySide(window.innerWidth >= SIDE_BY_SIDE_MIN_PX);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scrollGallery = (dir) => {
    const el = galleryRef.current;
    if (!el) return;
    // Scroll by roughly a screenful rather than a fixed pixel count, so the
    // control feels the same on a phone and on a wide monitor.
    const amount = Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

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
  // Hourly, monthly, or both — whichever the coach quoted. The unit travels
  // WITH the number so the markup never has to assume one.
  const rateSym = c.rateCurrency === 'USD' ? '$' : '₹';
  const rate = [
    c.hourlyRate ? `${rateSym}${c.hourlyRate} / hour` : null,
    c.monthlyRate ? `${rateSym}${c.monthlyRate} / month` : null,
  ].filter(Boolean).join(' · ') || null;
  const years = c.coachingSince ? new Date(c.coachingSince).getFullYear() : null;

  const gallery = Array.isArray(c.gallery) ? c.gallery : [];

  // How many photos fit beside the achievements text.
  //
  // Driven by the MEASURED height of that text (see the effect above), not by a
  // guessed number: a coach with two lines of achievements and one with twenty
  // need very different counts, and picking a constant would either leave the
  // gap this was meant to fill or run photos far past the end of the prose.
  //
  // Zero when there is no achievements text, when the viewport is too narrow to
  // sit them side by side, or when there is only one photo — a lone photo in a
  // side column reads as a mistake rather than a layout.
  const asideCount = (() => {
    if (!c.achievements || !sideBySide || gallery.length < 2) return 0;
    if (!achHeight) return 0;                      // not measured yet
    const fit = Math.floor(achHeight / PHOTO_SLOT_PX);
    // Never leave exactly one photo for the section below — absorb it here
    // rather than render a "More photos" row containing a single image.
    const capped = Math.min(fit, gallery.length);
    return gallery.length - capped === 1 ? gallery.length : capped;
  })();

  const asidePhotos = gallery.slice(0, asideCount);
  const restPhotos = gallery.slice(asideCount);

  // Arrows only earn their place once there is more than a screenful. With 1-2
  // images they would point at nothing.
  const canScrollGallery = restPhotos.length > 3;

  return (
    <div className="pc-page">
      <SEO
        title={`${c.title ? c.title + ' ' : ''}${c.name} — chess coach on Chess Nexus`}
        description={
          // htmlToText: the bio is stored as HTML, and a meta description is
          // plain text — without this, search results showed literal tags.
          (htmlToText(c.bio) || `${c.name} teaches chess on Chess Nexus.`).slice(0, 155)
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
            {/* FIDE title first, then the Nexus title (NC / NS / NX), then the
                name — the same order <PlayerName> uses everywhere else, so a
                coach reads as "NC Sara" here too. */}
            {c.title && <span className="pc-title">{c.title}</span>}
            {c.nexusTitle && (
              // Reuses the global .nexus-title style so the badge looks the same
              // here as it does in every list rendered by <PlayerName>.
              <span
                className="nexus-title"
                title={c.nexusTitle === 'NC'
                  ? 'Nexus Coach — helps ChessNexus grow'
                  : c.nexusTitle === 'NX'
                    ? 'Nexus Expert — supports ChessNexus'
                    : 'Nexus Supporter — supports ChessNexus'}
              >{c.nexusTitle}</span>
            )}
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

            {/* The unit is part of `rate`, not appended here: a monthly figure
                with "/ hour" hardcoded after it would misprice the coach on
                their own public page. */}
            {rate && (
              <div className="pc-row">
                <dt>Rate</dt>
                <dd>{rate}</dd>
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
      {/* The coach's own words, rendered with THEIR formatting — headings,
          bold and lists they added in the editor. Sanitised on save (see
          backend/helpers/coachRichText.js), never at render time. */}
      {c.bio && (
        <section className="pc-section">
          <h2>About {c.name.split(' ')[0]}</h2>
          <CoachProse html={c.bio} />
        </section>
      )}

      {/* ── Achievements, with photos alongside ────────────────────────────
          The prose column stops at a readable measure (~65 characters), which
          left the entire right half of the card empty on a wide screen. The
          gallery fills it: a column of photos beside the text, as tall as the
          text is. Anything that does not fit continues in the Gallery section
          below, so no photo is lost and neither column is padded out. */}
      {(c.achievements || asidePhotos.length > 0) && (
        <section className="pc-section">
          <h2>Achievements</h2>
          <div className={asidePhotos.length > 0 ? 'pc-ach-split' : ''}>
            {c.achievements && (
              <div className="pc-ach-text" ref={achTextRef}>
                <CoachProse html={c.achievements} />
              </div>
            )}

            {asidePhotos.length > 0 && (
              <aside className="pc-ach-photos" aria-label="Photos">
                {asidePhotos.map((img) => (
                  <figure key={img.id || img.url} className="pc-ach-photo">
                    <button
                      type="button"
                      className="pc-gal-btn"
                      onClick={() => setLightbox(gallery.indexOf(img))}
                      aria-label={img.caption || 'Open photo'}
                    >
                      <img src={img.url} alt={img.caption || ''} loading="lazy" />
                    </button>
                    {img.caption && <figcaption>{img.caption}</figcaption>}
                  </figure>
                ))}
              </aside>
            )}
          </div>
        </section>
      )}

      {/* ── Gallery ────────────────────────────────────────────────────────
          Whatever did not fit beside the achievements. Up to 10 images scroll
          horizontally in ONE row with arrow controls; 11 or more wrap into TWO
          rows that scroll together. A grid was deliberately avoided — it makes
          a coach with four photos look empty and one with twenty look like a
          contact sheet. */}
      {restPhotos.length > 0 && (
        <section className="pc-section">
          <h2>{asidePhotos.length > 0 ? 'More photos' : 'Gallery'}</h2>
          <div className="pc-gal-wrap">
            {canScrollGallery && (
              <button
                type="button"
                className="pc-gal-nav pc-gal-nav-l"
                onClick={() => scrollGallery('left')}
                aria-label="Scroll gallery left"
              >‹</button>
            )}

            <div
              className={`pc-gal-track${restPhotos.length > 10 ? ' pc-gal-two-rows' : ''}`}
              ref={galleryRef}
            >
              {restPhotos.map((img) => (
                <figure key={img.id || img.url} className="pc-gal-item">
                  <button
                    type="button"
                    className="pc-gal-btn"
                    /* Index into the FULL gallery, not this slice — the
                       lightbox pages through every photo, including the ones
                       shown beside the achievements. */
                    onClick={() => setLightbox(gallery.indexOf(img))}
                    aria-label={img.caption || 'Open photo'}
                  >
                    <img src={img.url} alt={img.caption || ''} loading="lazy" />
                  </button>
                  {img.caption && <figcaption>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>

            {canScrollGallery && (
              <button
                type="button"
                className="pc-gal-nav pc-gal-nav-r"
                onClick={() => scrollGallery('right')}
                aria-label="Scroll gallery right"
              >›</button>
            )}
          </div>
        </section>
      )}

      {/* Full-size view. Closes on backdrop click or Escape. */}
      {lightbox !== null && gallery[lightbox] && (
        <div
          className="pc-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image"
        >
          <button
            type="button"
            className="pc-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >✕</button>
          <figure className="pc-lightbox-fig" onClick={(e) => e.stopPropagation()}>
            <img src={gallery[lightbox].url} alt={gallery[lightbox].caption || ''} />
            {gallery[lightbox].caption && (
              <figcaption>{gallery[lightbox].caption}</figcaption>
            )}
          </figure>
        </div>
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
