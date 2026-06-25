import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import "../../components/marketing/marketing.css";

const CANONICAL = "/terms";

// ⚠️ REVIEW BEFORE PUBLISHING — placeholders to confirm with the operator:
//   • LEGAL_ENTITY:  the registered name of the business/person operating the app.
//   • GOVERNING_LAW: the country/state whose law and courts apply.
//   • EFFECTIVE_DATE: keep updated whenever these terms materially change.
// This document is a good-faith template, not legal advice. Have it reviewed by a
// lawyer (especially the payments, refunds, liability and governing-law clauses).
const LEGAL_ENTITY = "Chess Nexus";
const GOVERNING_LAW = "India";
const EFFECTIVE_DATE = "June 12, 2026";

export default function TermsPage() {
  const termsSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chess Nexus Terms & Conditions",
    description:
      "The terms that govern your use of Chess Nexus — accounts, acceptable use, coach subscriptions, payments, donations, content and liability.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <div className="mkt-page">
      <SEO
        title="Terms & Conditions"
        description="The terms that govern your use of Chess Nexus — accounts, acceptable use, coach subscriptions, payments, donations, content and your responsibilities."
        keywords="chess nexus terms and conditions, terms of service, user agreement"
        canonical={CANONICAL}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(termsSchema)}</script>
      </Helmet>

      <div className="mkt-inner">
        <header className="mkt-hero">
          <img src="/logo.png" alt="Chess Nexus logo" className="mkt-hero-logo" />
          <h1>Terms &amp; Conditions</h1>
          <p className="mkt-hero-sub">
            These terms are the agreement between you and Chess Nexus. Please read
            them carefully — by using the service you agree to them.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>
            Effective date: {EFFECTIVE_DATE}
          </p>
        </header>

        <article className="mkt-legal">
          <section>
            <h2>1. Acceptance of these terms</h2>
            <p>
              These Terms &amp; Conditions (“Terms”) govern your access to and use
              of the Chess Nexus website and application at{" "}
              <strong>chessnexus.in</strong> and all related features (the
              “Service”), operated by {LEGAL_ENTITY} (“we”, “us”, “our”). By
              creating an account or using the Service, you agree to these Terms and
              to our{" "}
              <Link to="/privacy-policy">Privacy Policy</Link>. If you do not agree,
              please do not use the Service.
            </p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>
              The Service is a general-audience platform and is not directed to
              children under 13 (or the minimum age required in your country). By
              using the Service you confirm that you meet the minimum age and are
              able to enter into these Terms. If you use the Service on behalf of an
              organisation, you confirm you are authorised to bind it to these
              Terms.
            </p>
          </section>

          <section>
            <h2>3. Your account</h2>
            <ul>
              <li>
                You must provide accurate information when you register and keep it
                up to date.
              </li>
              <li>
                You are responsible for keeping your password secure and for all
                activity that happens under your account. Tell us promptly if you
                suspect unauthorised use.
              </li>
              <li>
                One person should not maintain multiple accounts to gain an unfair
                advantage (for example, in ratings, races or tournaments).
              </li>
              <li>
                You may close your account at any time. We may suspend or terminate
                accounts that breach these Terms (see “Suspension and termination”).
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>
                Cheat or manipulate gameplay — for example using chess engines or
                outside assistance where not allowed, colluding, or abusing bugs to
                affect ratings, puzzles, races, tournaments or leaderboards.
              </li>
              <li>
                Harass, threaten, bully, impersonate or abuse other users, or post
                unlawful, hateful, sexual, or otherwise harmful content.
              </li>
              <li>
                Choose usernames, display names, avatars, or content that are
                offensive, deceptive, infringing, or impersonate others.
              </li>
              <li>
                Attempt to disrupt, overload, reverse-engineer, scrape, or gain
                unauthorised access to the Service or other users’ accounts or data.
              </li>
              <li>Use the Service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2>5. The Service is free for players</h2>
            <p>
              The core Chess Nexus experience — puzzles, tactics races, online games,
              analysis, tournaments, study tools and the community — is provided to
              players free of charge. We may add, change, or remove features over
              time, and we may run, pause, or modify free features at our
              discretion.
            </p>
          </section>

          <section>
            <h2>6. Coaches and subscriptions</h2>
            <ul>
              <li>
                Coaching tools are offered on a paid subscription, with tiers based
                on the number of students a coach manages. Prices and plan features
                are shown at the point of purchase and may change for future billing
                periods.
              </li>
              <li>
                Subscriptions renew for the billing cycle you select (for example
                monthly or yearly) unless cancelled before the renewal date. You can
                cancel at any time; cancellation stops future renewals and your plan
                remains active until the end of the current paid period.
              </li>
              <li>
                If you use the Service as a coach, you are responsible for the
                students you add and for having any consent required to handle their
                information, and you must use the coaching tools lawfully and only
                for legitimate coaching. Our handling of coach and student data is
                described in the <Link to="/privacy-policy">Privacy Policy</Link>.
              </li>
              <li>
                We may change subscription pricing or plan limits; where required,
                we will give reasonable notice before changes affect you.
              </li>
            </ul>
          </section>

          <section>
            <h2>7. Payments, donations and refunds</h2>
            <ul>
              <li>
                Payments (coach subscriptions and any optional “Buy Me a Coffee”
                donations) are processed by our third-party payment provider,{" "}
                <strong>Razorpay</strong>. We do not collect or store your full card
                number, banking or other sensitive payment credentials — those are
                handled by Razorpay.
              </li>
              <li>
                You must use a valid payment method that you are authorised to use.
                Applicable taxes may be added.
              </li>
              <li>
                Donations are voluntary, are not required to use the Service, and
                are generally <strong>non-refundable</strong>.
              </li>
              <li>
                Subscription payments are non-refundable except where required by
                law or expressly stated by us. If you believe you were charged in
                error, <Link to="/contact">contact us</Link> and we will
                review it in good faith. See our{" "}
                <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link> for
                full details.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. User content</h2>
            <ul>
              <li>
                “User content” means anything you submit — studies, positions,
                puzzles, messages, posts, profile details and similar. You keep
                ownership of your content.
              </li>
              <li>
                You grant us a non-exclusive, worldwide, royalty-free licence to
                host, store, display and use your content as needed to operate and
                provide the Service (for example, showing your moves, profile or
                community posts to others).
              </li>
              <li>
                You are responsible for your content and confirm you have the rights
                to share it and that it does not break these Terms or the law.
              </li>
              <li>
                We may remove content that violates these Terms or that we
                reasonably consider harmful, unlawful or inappropriate.
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Our intellectual property</h2>
            <p>
              The Service, including its software, design, logos, text and graphics
              (excluding your user content and third-party materials), belongs to us
              or our licensors and is protected by law. We grant you a personal,
              limited, non-transferable, revocable licence to use the Service for its
              intended purpose. You may not copy, resell, or create derivative works
              from the Service except as allowed by law or with our permission.
            </p>
          </section>

          <section>
            <h2>10. Third-party services</h2>
            <p>
              The Service may link to or integrate third-party services (for example
              Chess.com, Lichess, or payment providers). We are not responsible for
              third-party services, and your use of them is subject to their own
              terms and privacy policies.
            </p>
          </section>

          <section>
            <h2>11. Suspension and termination</h2>
            <p>
              We may suspend or terminate your access to the Service, with or without
              notice, if you breach these Terms, if your use harms other users or the
              Service, or as required by law. You may stop using the Service and
              close your account at any time. Sections that by their nature should
              survive termination (such as content licences already granted, and the
              disclaimers and limitations below) will continue to apply.
            </p>
          </section>

          <section>
            <h2>12. Disclaimers</h2>
            <p>
              The Service is provided “as is” and “as available”, without warranties
              of any kind, whether express or implied, to the maximum extent
              permitted by law. We do not guarantee that the Service will be
              uninterrupted, error-free, or secure, or that ratings, results or
              content will always be accurate.
            </p>
          </section>

          <section>
            <h2>13. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, we will not be liable for any
              indirect, incidental, special, consequential or punitive damages, or
              for loss of data, profits, or goodwill, arising from your use of (or
              inability to use) the Service. Nothing in these Terms excludes
              liability that cannot be excluded under applicable law.
            </p>
          </section>

          <section>
            <h2>14. Changes to the Service and these Terms</h2>
            <p>
              We may update these Terms from time to time. When we make material
              changes, we will update the effective date above and, where
              appropriate, notify you within the Service. Your continued use of the
              Service after an update means you accept the revised Terms. We may also
              change, suspend or discontinue parts of the Service.
            </p>
          </section>

          <section>
            <h2>15. Governing law</h2>
            <p>
              These Terms are governed by the laws of {GOVERNING_LAW}, without regard
              to conflict-of-law rules, and the courts located in {GOVERNING_LAW}{" "}
              will have jurisdiction over any disputes, except where applicable law
              gives you the right to bring a claim elsewhere.
            </p>
          </section>

          <section>
            <h2>16. Contact us</h2>
            <p>
              Questions about these Terms? Reach us through our{" "}
              <Link to="/contact">Contact Us</Link> page.
            </p>
          </section>

          <p className="mkt-legal-back">
            <Link to="/">← Back to Chess Nexus</Link>
          </p>
        </article>
      </div>
    </div>
  );
}
