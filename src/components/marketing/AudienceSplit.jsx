import { Link } from "react-router-dom";
import "./marketing.css";
import { t as tr } from '../../i18n/LanguageContext';

/**
 * The two-product chooser: ONE COACH vs ACADEMY.
 *
 * Chess Nexus sells two different things and they were easy to confuse — the
 * coach pricing page never even mentioned academies, so a school with six
 * coaches landed on solo pricing and saw no path to the multi-coach product.
 * This block states the split up front on every relevant page.
 *
 * Props:
 *   current: "solo" | "academy" — the page this is rendered on. That card is
 *            marked "You are here" and is NOT a link (nothing to click through
 *            to); the other card links across.
 */
export default function AudienceSplit({ current }) {
  const soloBody = (
    <>
      <div className="mkt-aud-icon" aria-hidden="true">🎓</div>
      <span className="mkt-aud-badge">
        {current === "solo" ? "You are here" : "One coach"}
      </span>
      <h3>{tr("Individual coach")}</h3>
      <p className="mkt-aud-for">{tr("For one coach teaching their own students.")}</p>
      <ul>
        <li>{tr("Your own student roster, up to 150 students")}</li>
        <li>{tr("Courses, assignments, attendance, parent reports")}</li>
        {/* "on the live plans" is gone — the separate live plans no longer
            exist; the classroom is in every coach plan (see coachPlans.js). */}
        <li>{tr("Live classroom — unlimited students (+ you) on the paid plans")}</li>
        <li>{tr("You pay for yourself")}</li>
      </ul>
      <div className="mkt-aud-price">
        {tr("Free forever up to 30 students")}
        <span>{tr("Paid plans from $19/month")}</span>
      </div>
    </>
  );

  const academyBody = (
    <>
      <div className="mkt-aud-icon" aria-hidden="true">🏫</div>
      <span className="mkt-aud-badge">
        {current === "academy" ? "You are here" : "Multiple coaches"}
      </span>
      <h3>{tr("Academy or institute")}</h3>
      <p className="mkt-aud-for">{tr("For an organisation with several coaches.")}</p>
      {/* No academy-wide student total here any more: Institute has UNLIMITED
          coaches, so there is no finite "students across the academy" figure. */}
      <ul>
        <li>{tr("5, 10 or unlimited coaches under one academy")}</li>
        <li>{tr("100 students for every coach, on every plan")}</li>
        <li>{tr("One dashboard over every coach, student and class")}</li>
        <li>{tr("You pay once for everyone — coaches never pay")}</li>
      </ul>
      <div className="mkt-aud-price">
        {tr("From $89/month for 5 coaches")}
        <span>{tr("Unlimited live classes on every plan")}</span>
      </div>
    </>
  );

  // The whole card used to BE the link, with nothing to say so — no button, no
  // affordance, just a block of text that happened to navigate when clicked.
  // A coach reading the two cards to compare them had no reason to think either
  // was interactive, so the pricing pages behind them went unvisited.
  //
  // The card is now plain, with an explicit "See pricing" button. The card the
  // visitor is already on shows no button — there is nowhere to go.
  return (
    <div className="mkt-audience">
      <div className="mkt-aud mkt-aud-solo">
        {soloBody}
        {current !== "solo" && (
          <Link to="/chess-coach-pricing" className="mkt-aud-btn">{tr("See pricing →")}</Link>
        )}
      </div>
      <div className="mkt-aud mkt-aud-academy">
        {academyBody}
        {current !== "academy" && (
          <Link to="/chess-academy-pricing" className="mkt-aud-btn">{tr("See pricing →")}</Link>
        )}
      </div>
    </div>
  );
}
