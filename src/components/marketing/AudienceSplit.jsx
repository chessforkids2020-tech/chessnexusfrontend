import { Link } from "react-router-dom";
import "./marketing.css";

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
      <h3>Individual coach</h3>
      <p className="mkt-aud-for">For one coach teaching their own students.</p>
      <ul>
        <li>Your own student roster, up to 150 students</li>
        <li>Courses, assignments, attendance, parent reports</li>
        {/* "on the live plans" is gone — the separate live plans no longer
            exist; the classroom is in every coach plan (see coachPlans.js). */}
        <li>Live classroom — unlimited students (+ you) on the paid plans</li>
        <li>You pay for yourself</li>
      </ul>
      <div className="mkt-aud-price">
        Free forever up to 20 students
        <span>Paid plans from $19/month</span>
      </div>
    </>
  );

  const academyBody = (
    <>
      <div className="mkt-aud-icon" aria-hidden="true">🏫</div>
      <span className="mkt-aud-badge">
        {current === "academy" ? "You are here" : "Multiple coaches"}
      </span>
      <h3>Academy or institute</h3>
      <p className="mkt-aud-for">For an organisation with several coaches.</p>
      {/* No academy-wide student total here any more: Institute has UNLIMITED
          coaches, so there is no finite "students across the academy" figure. */}
      <ul>
        <li>5, 10 or unlimited coaches under one academy</li>
        <li>100 students for every coach, on every plan</li>
        <li>One dashboard over every coach, student and class</li>
        <li>You pay once for everyone — coaches never pay</li>
      </ul>
      <div className="mkt-aud-price">
        From $89/month for 5 coaches
        <span>Unlimited live classes on every plan</span>
      </div>
    </>
  );

  return (
    <div className="mkt-audience">
      {current === "solo" ? (
        <div className="mkt-aud mkt-aud-solo">{soloBody}</div>
      ) : (
        <Link to="/chess-coach-pricing" className="mkt-aud mkt-aud-solo">{soloBody}</Link>
      )}
      {current === "academy" ? (
        <div className="mkt-aud mkt-aud-academy">{academyBody}</div>
      ) : (
        <Link to="/chess-academy-pricing" className="mkt-aud mkt-aud-academy">{academyBody}</Link>
      )}
    </div>
  );
}
