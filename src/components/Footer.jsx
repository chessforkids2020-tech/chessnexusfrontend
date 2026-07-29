import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  // The footer's inline stylesheet is ~4.8k characters and renders on EVERY
  // page. Text extractors (search crawlers, AI readers) treat <style> contents
  // as page text, so those 4.8k chars counted as 27–62% of each prerendered
  // page's extractable text — pure noise competing with the actual copy. Skip
  // it in the snapshot only; real browsers still get it.
  const skipInlineCss = typeof window !== 'undefined' && window.__PRERENDER__;

  return (
    <>
      {!skipInlineCss && (
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

          .site-footer {
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding: 20px;
            text-align: center;
            position: relative;
            box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.5);
            z-index: 50;
          }

          .footer-content {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }

          .footer-logo {
            height: 32px;
            width: auto;
            object-fit: contain;
            filter: brightness(0.9);
          }

          .contact-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #06b6d4;
            text-decoration: none;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 20px;
            background: rgba(6, 182, 212, 0.1);
            border: 1px solid rgba(6, 182, 212, 0.2);
            transition: all 0.3s ease;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          .contact-link:hover {
            background: rgba(6, 182, 212, 0.2);
            border-color: rgba(6, 182, 212, 0.4);
            color: #67e8f9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
          }

          .contact-icon {
            font-size: 16px;
            filter: drop-shadow(0 1px 2px rgba(6, 182, 212, 0.3));
          }

          .footer-nav {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .footer-nav a {
            color: #06b6d4;
            text-decoration: none;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 600;
            transition: color 0.25s ease;
          }

          .footer-nav a:hover {
            color: #67e8f9;
            text-decoration: underline;
          }

          .footer-sep {
            color: rgba(255, 255, 255, 0.25);
            font-size: 13px;
          }

          .footer-social {
            display: inline-flex;
            align-items: center;
            gap: 12px;
          }

          .footer-social a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            color: #06b6d4;
            background: rgba(6, 182, 212, 0.1);
            border: 1px solid rgba(6, 182, 212, 0.2);
            transition: all 0.3s ease;
          }

          .footer-social a:hover {
            color: #ffffff;
            background: rgba(6, 182, 212, 0.25);
            border-color: rgba(6, 182, 212, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
          }

          .footer-social svg {
            width: 18px;
            height: 18px;
          }

          .footer-text {
            margin: 0;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #ffffff;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            letter-spacing: 0.5px;
          }

          .footer-text-logo {
            height: 22px;
            width: auto;
            object-fit: contain;
            filter: brightness(0.9);
          }

          /* Subtle gradient overlay effect */
          .site-footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg,
              transparent,
              rgba(6, 182, 212, 0.3) 30%,
              rgba(16, 185, 129, 0.3) 70%,
              transparent
            );
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .site-footer {
              padding: 16px;
            }

            .footer-content {
              flex-direction: column;
              gap: 10px;
            }

            .contact-link {
              font-size: 13px;
              padding: 6px 12px;
            }

            .footer-text {
              font-size: 12px;
            }
          }
        `}
      </style>
      )}

      <footer className="site-footer">
        <div className="footer-content">
          <img src="/logo.png" alt="Chess Nexus Logo" className="footer-logo" />
          <nav className="footer-nav">
            <Link to="/">Home</Link>
            <span className="footer-sep">|</span>
            <Link to="/features">Features</Link>
            <span className="footer-sep">|</span>
            <Link to="/members">Members</Link>
            <span className="footer-sep">|</span>
            <Link to="/contact">Contact Us</Link>
            <span className="footer-sep">|</span>
            <Link to="/report">Report</Link>
            <span className="footer-sep">|</span>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <span className="footer-sep">|</span>
            <Link to="/terms">Terms</Link>
            <span className="footer-sep">|</span>
            <Link to="/refund-policy">Refund</Link>
          </nav>
          <div className="footer-social">
            <a
              href="https://www.instagram.com/chessnexus.in/"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label="Chess Nexus on Instagram"
              title="Chess Nexus on Instagram"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100064068341481"
              target="_blank"
              rel="noopener noreferrer me"
              aria-label="Chess Nexus on Facebook"
              title="Chess Nexus on Facebook"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
              </svg>
            </a>
          </div>
          <p className="footer-text">
            © {new Date().getFullYear()} CHESS NEXUS
            <img src="/logo.png" alt="Chess Nexus Logo" className="footer-text-logo" />
          </p>
        </div>
      </footer>
    </>
  );
}