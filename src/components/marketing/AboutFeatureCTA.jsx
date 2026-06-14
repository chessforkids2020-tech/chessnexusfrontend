import { Link } from "react-router-dom";

/**
 * Subtle "learn more" text link shown at the very bottom of an in-app hub page.
 * Deliberately low-key — small muted text with a tiny arrow, NOT a button — so it
 * adds an internal link for SEO without drawing the user's eye or cluttering the page.
 *
 * Props:
 *  - links: array of { label, to } -> rendered as small inline text links
 */
export default function AboutFeatureCTA({ links = [] }) {
  return (
    <div
      style={{
        margin: "32px auto 14px",
        textAlign: "center",
        lineHeight: 1.8,
      }}
    >
      {links.map((l, i) => (
        <span key={l.to}>
          {i > 0 && (
            <span style={{ color: "rgba(255,255,255,0.18)", margin: "0 10px" }}>·</span>
          )}
          <Link
            to={l.to}
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 12.5,
              fontWeight: 500,
              color: "rgba(255,255,255,0.34)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.34)";
            }}
          >
            {l.label} ›
          </Link>
        </span>
      ))}
    </div>
  );
}
