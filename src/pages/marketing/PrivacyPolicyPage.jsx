import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import "../../components/marketing/marketing.css";

const CANONICAL = "/privacy-policy";

// ⚠️ REVIEW BEFORE PUBLISHING — placeholders to confirm with the operator:
//   • CONTACT_EMAIL: the address you actually monitor for privacy requests.
//   • LEGAL_ENTITY:  the registered name of the business/person operating the app.
//   • EFFECTIVE_DATE: keep updated whenever this policy materially changes.
// This document is a good-faith template, not legal advice. Have it reviewed by a
// lawyer for GDPR/UK GDPR (EU/UK) and the DPDP Act 2023 (India) compliance.
// Chess Nexus is a general-audience service and does not knowingly collect data
// from children under 13 (or the minimum age in your jurisdiction).
const CONTACT_EMAIL = "chessforkids2020@gmail.com";
const LEGAL_ENTITY = "Chess Nexus";
const EFFECTIVE_DATE = "June 12, 2026";

export default function PrivacyPolicyPage() {
  const policySchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chess Nexus Privacy Policy",
    description:
      "How Chess Nexus collects, uses, protects and shares your information, and the rights you have over your information.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <div className="mkt-page">
      <SEO
        title="Privacy Policy"
        description="How Chess Nexus collects, uses, protects and shares your information — and the privacy rights you have."
        keywords="chess nexus privacy policy, data protection, GDPR, DPDP"
        canonical={CANONICAL}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(policySchema)}</script>
      </Helmet>

      <div className="mkt-inner">
        <header className="mkt-hero">
          <img src="/logo.png" alt="Chess Nexus logo" className="mkt-hero-logo" />
          <h1>Privacy Policy</h1>
          <p className="mkt-hero-sub">
            Your privacy matters to us. This policy explains what information Chess
            Nexus collects, why we collect it, how we protect it, and the choices
            and rights you have.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>
            Effective date: {EFFECTIVE_DATE}
          </p>
        </header>

        <article className="mkt-legal">
          <section>
            <h2>1. Who we are</h2>
            <p>
              Chess Nexus (“we”, “us”, “our”) operates the website and application
              at <strong>chessnexus.in</strong> — an online chess learning and
              competition platform offering puzzles, tactics races, live games,
              game analysis, tournaments, study tools and a community. This policy
              applies to all of those services. The service is operated by{" "}
              {LEGAL_ENTITY}.
            </p>
          </section>

          <section>
            <h2>2. Information we collect</h2>
            <h3>2.1 Information you provide</h3>
            <ul>
              <li>
                <strong>Account details:</strong> username, display name, password
                (stored only as a secure hash — we never store your plain
                password), and, optionally, your email address.
              </li>
              <li>
                <strong>Profile details (optional):</strong> country, chess
                experience level, a short biography, an avatar, and your Chess.com
                and Lichess usernames if you choose to link them.
              </li>
              <li>
                <strong>Content you create:</strong> studies, positions, puzzles,
                community posts and messages, and similar content you submit.
              </li>
            </ul>

            <h3>2.2 Information generated as you use the service</h3>
            <ul>
              <li>
                <strong>Gameplay and progress:</strong> moves, puzzle attempts and
                results, ratings, scores, streaks, tournament and race results,
                achievements and activity history.
              </li>
              <li>
                <strong>Usage and device data:</strong> log data such as IP
                address, browser/device type, pages viewed, approximate activity
                times, and online/offline status, used to operate and secure the
                service.
              </li>
            </ul>

            <h3>2.3 Cookies and local storage</h3>
            <p>
              We use cookies and browser local storage to keep you signed in,
              remember your preferences (such as board and piece themes), and keep
              the service secure. We do not use third-party advertising cookies.
              You can clear or block cookies in your browser, but some features may
              stop working.
            </p>
          </section>

          <section>
            <h2>3. How we use your information</h2>
            <ul>
              <li>To create and manage your account and authenticate you.</li>
              <li>
                To provide the service — run games, puzzles, races, tournaments,
                ratings, leaderboards, study tools and the community.
              </li>
              <li>To save your progress, preferences and achievements.</li>
              <li>
                To keep the service safe — detect and prevent cheating, abuse,
                fraud and security incidents.
              </li>
              <li>
                To communicate with you about your account, important changes, and
                support requests.
              </li>
              <li>To understand and improve how the service is used.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal information, and we do
              <strong> not</strong> show third-party advertising.
            </p>
          </section>

          <section>
            <h2>4. Children’s privacy</h2>
            <p>
              Chess Nexus is a general-audience service intended for chess players
              of all levels. It is <strong>not directed to children under 13</strong>{" "}
              (or the minimum age required in your country), and we do not knowingly
              collect personal information from such children. We do not ask for a
              user’s age, date of birth, or parent/guardian contact details at
              sign-up.
            </p>
            <p>
              If you are a parent or guardian and believe a child under the
              applicable minimum age has provided us with personal information,
              please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will
              delete it promptly.
            </p>
          </section>

          <section>
            <h2>5. Coaches and their students</h2>
            <p>
              Chess Nexus offers tools for chess coaches to teach and manage their
              own students. <strong>The core platform is free for players.</strong>{" "}
              Coaching tools are offered to coaches on a paid subscription because
              they provide additional capabilities — managing a student roster,
              progress dashboards, assignments, attendance and study packs — that
              cost us more to host, store and operate. Subscription tiers are based
              on the number of students a coach manages.
            </p>
            <p>If you use the service as a coach, please note:</p>
            <ul>
              <li>
                <strong>Coach information we process</strong> includes your account
                and profile details, your chosen subscription plan, and records of
                your subscription payments (see “Payments” below).
              </li>
              <li>
                <strong>Student information a coach adds</strong> — such as a
                student’s name, username, email, group, attendance, fees, notes and
                assignment progress — is stored securely and made available{" "}
                <strong>only to that coach</strong> to provide the coaching tools.
                When you add a student, you are responsible for having any consent
                required to share their information with us, and for using it
                lawfully and only for legitimate coaching purposes.
              </li>
              <li>
                A coach can see the progress and activity of students linked to
                them. Students can see which coach they are linked to.
              </li>
              <li>
                <strong>Our administrators do not access individual coach or
                student records.</strong> The operator’s dashboard shows only
                aggregate statistics — for example how many coaches have joined, how
                many have an active subscription, the total number of students, and
                how many payments were made — and never the names, emails, notes or
                other details of any specific coach or student.
              </li>
              <li>
                We process student information on behalf of the coach to deliver
                these features, and we protect it with the same security measures
                described below.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Payments</h2>
            <p>
              Coach subscriptions are processed through{" "}
              <strong>Razorpay</strong>, a third-party payment provider. When you
              pay, your payment is handled directly by Razorpay on their secured,
              PCI-DSS-compliant systems.
            </p>
            <ul>
              <li>
                <strong>We do not see or store your full card number, CVV, or other
                sensitive payment credentials.</strong> Whatever payment method you
                use at Razorpay’s checkout, those details are collected and processed
                by Razorpay under their own privacy policy.
              </li>
              <li>
                What <em>we</em> store is limited transaction information needed to
                manage your subscription and our records — for example the plan and
                billing cycle, the amount and currency, the payment status, the
                period covered, and the transaction reference IDs Razorpay returns
                (order ID, payment ID).
              </li>
              <li>
                Every payment is verified using a cryptographic signature check
                (HMAC-SHA256), and payment notifications from Razorpay are verified
                with a signed webhook, so we can confirm a payment is genuine before
                activating a subscription.
              </li>
              <li>
                For business reporting, our administrators see only aggregate
                payment figures — such as how many payments were made and total
                revenue over a period — not the payment details of any individual
                coach.
              </li>
            </ul>
            <p>
              Please review{" "}
              <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">
                Razorpay’s Privacy Policy
              </a>{" "}
              to understand how they handle your payment information.
            </p>
          </section>

          <section>
            <h2>7. Supporters and donations</h2>
            <p>
              Chess Nexus may offer an optional “Buy Me a Coffee” feature that lets
              you make a voluntary donation to support the platform. Donations are
              entirely optional and are not required to use any feature.
            </p>
            <ul>
              <li>
                <strong>How payment is made:</strong> donations are processed
                through our payment provider, <strong>Razorpay</strong>, the same as
                coach subscriptions. We do not see or store your card or banking
                credentials — those are handled by Razorpay.
              </li>
              <li>
                <strong>What we store:</strong> a record of your donation — the
                amount and currency, a transaction reference, the date, and an
                optional note you choose to leave.
              </li>
              <li>
                <strong>Supporter badge (public):</strong> as a thank-you, making a
                donation may display a supporter badge (for example a “☕” icon) next
                to your display name for a limited time. If we show a list of recent
                supporters, it may include your display name, avatar and donation
                amount. If you would prefer not to appear publicly as a supporter,
                contact us and we will hide it.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. How we share information</h2>
            <p>We share information only in these limited situations:</p>
            <ul>
              <li>
                <strong>Publicly within the service:</strong> your display name,
                avatar, ratings, achievements and activity may appear on profiles,
                leaderboards, tournament results and the community, so other users
                can see them. Please avoid putting sensitive personal information in
                your display name, biography or posts.
              </li>
              <li>
                <strong>Service providers:</strong> trusted vendors who help us run
                the service (for example, hosting, database and infrastructure
                providers, and our payment provider Razorpay) under agreements that
                require them to protect your data and use it only on our
                instructions or as needed to provide their service.
              </li>
              <li>
                <strong>Legal reasons:</strong> when required by law, or to protect
                the rights, safety and security of our users and the service.
              </li>
              <li>
                <strong>Business transfers:</strong> if the service is involved in a
                merger, acquisition or asset sale, your information may be
                transferred, subject to this policy.
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Third-party links</h2>
            <p>
              If you link your Chess.com or Lichess username, or follow links to
              external sites, those services have their own privacy policies. We are
              not responsible for the practices of third-party sites and encourage
              you to read their policies.
            </p>
          </section>

          <section>
            <h2>10. Data retention</h2>
            <p>
              We keep your information for as long as your account is active and as
              needed to provide the service. If you delete your account, we delete
              or anonymise your personal information within a reasonable period,
              except where we must keep certain records to comply with the law,
              resolve disputes, or enforce our agreements.
            </p>
          </section>

          <section>
            <h2>11. Security</h2>
            <p>
              We use reasonable technical and organisational measures to protect
              your information — including hashed passwords and access controls. No
              method of transmission or storage is perfectly secure, so we cannot
              guarantee absolute security, but we work to protect your data and to
              respond promptly to any incident.
            </p>
          </section>

          <section>
            <h2>12. Your rights and choices</h2>
            <p>
              Depending on where you live, you may have the right to access,
              correct, delete, or export your personal information, to object to or
              restrict certain processing, and to withdraw consent. You can update
              much of your information directly in your profile settings, or contact
              us to exercise these rights. We will respond as required by applicable
              law, including the GDPR (EU/UK) and the Digital Personal Data
              Protection Act, 2023 (India).
            </p>
          </section>

          <section>
            <h2>13. International users</h2>
            <p>
              We are based in India and our service is operated from there. If you
              access Chess Nexus from outside India, your information may be
              processed in India and other countries, which may have different data
              protection laws than your own.
            </p>
          </section>

          <section>
            <h2>14. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. When we make material
              changes, we will update the effective date above and, where
              appropriate, notify you within the service. Your continued use of
              Chess Nexus after an update means you accept the revised policy.
            </p>
          </section>

          <section>
            <h2>15. Contact us</h2>
            <p>
              If you have questions, concerns or requests about your privacy —
              including to access, correct, export or delete your information —
              please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
