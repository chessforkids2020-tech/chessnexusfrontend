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
        <li>Live classroom — up to 25 students (+ you) on the top plan</li>
        <li>You pay for yourself</li>
      </ul>
      <div className="mkt-aud-price">
        Free forever up to 30 students
        <span>Paid plans from $29/month</span>
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
      <ul>
        <li>5, 10 or 25 coaches under one academy</li>
        <li>Up to 3,750 students across the academy</li>
        <li>One dashboard over every coach, student and class</li>
        <li>You pay once for everyone — coaches never pay</li>
      </ul>
      <div className="mkt-aud-price">
        From $88/month for 5 coaches
        <span>Bulk discounts up to 20%</span>
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
