import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <>
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

          .footer-text {
            margin: 0;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #ffffff;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            letter-spacing: 0.5px;
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
          </nav>
          <p className="footer-text">
            © {new Date().getFullYear()} CHESS NEXUS | CHESS FOR KIDS ♟️
          </p>
        </div>
      </footer>
    </>
  );
}