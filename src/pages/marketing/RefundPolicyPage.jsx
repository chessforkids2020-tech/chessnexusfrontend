import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import "../../components/marketing/marketing.css";

const CANONICAL = "/refund-policy";

// ⚠️ REVIEW BEFORE PUBLISHING — placeholders to confirm with the operator:
//   • LEGAL_ENTITY:  the registered name of the business/person operating the app.
//   • GOVERNING_LAW: the country/state whose law applies.
//   • EFFECTIVE_DATE: keep updated whenever this policy materially changes.
// Contact is handled via the on-site /contact page (faster than email).
// This document is a good-faith template, not legal advice. Have it reviewed by a
// lawyer (especially the refund and chargeback clauses).
const LEGAL_ENTITY = "Chess Nexus";
const GOVERNING_LAW = "India";
const EFFECTIVE_DATE = "June 25, 2026";

export default function RefundPolicyPage() {
  const refundSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chess Nexus Refund & Cancellation Policy",
    description:
      "How refunds and cancellations work on Chess Nexus — supporter contributions (Buy Us a Coffee) and coach subscriptions.",
    url: `https://chessnexus.in${CANONICAL}`,
  };

  return (
    <div className="mkt-page">
      <SEO
        title="Refund & Cancellation Policy"
        description="How refunds and cancellations work on Chess Nexus — supporter contributions (Buy Us a Coffee) and coach subscriptions."
        keywords="chess nexus refund policy, cancellation policy, coach subscription refund, donation refund"
        canonical={CANONICAL}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(refundSchema)}</script>
      </Helmet>

      <div className="mkt-inner">
        <header className="mkt-hero">
          <img src="/logo.png" alt="Chess Nexus logo" className="mkt-hero-logo" />
          <h1>Refund &amp; Cancellation Policy</h1>
          <p className="mkt-hero-sub">
            This policy explains how refunds and cancellations work for payments made
            on Chess Nexus. Please read it before you pay.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>
            Effective date: {EFFECTIVE_DATE}
          </p>
        </header>

        <article className="mkt-legal">
          <section>
            <h2>1. Overview</h2>
            <p>
              This Refund &amp; Cancellation Policy applies to payments processed on
              the Chess Nexus website and application at <strong>chessnexus.in</strong>{" "}
              (the “Service”), operated by {LEGAL_ENTITY} (“we”, “us”, “our”). It forms
              part of, and should be read together with, our{" "}
              <Link to="/terms">Terms &amp; Conditions</Link> and{" "}
              <Link to="/privacy-policy">Privacy Policy</Link>.
            </p>
            <p>
              We process two kinds of payments, and each is treated differently below:
            </p>
            <ul>
              <li>
                <strong>Supporter contributions</strong> — the optional “Buy Us a
                Coffee” gesture.
              </li>
              <li>
                <strong>Coach subscriptions</strong> — paid access to coaching tools
                for coaches.
              </li>
            </ul>
            <p>
              All payments are handled by our payment provider,{" "}
              <strong>Razorpay</strong>. This policy is governed by the laws of{" "}
              {GOVERNING_LAW}.
            </p>
          </section>

          <section>
            <h2>2. Supporter contributions (“Buy Us a Coffee”)</h2>
            <ul>
              <li>
                Supporter contributions are <strong>voluntary gifts</strong> that help
                keep Chess Nexus running. They are not a purchase of goods or services
                and are not required to use the Service.
              </li>
              <li>
                Because they are voluntary contributions, they are{" "}
                <strong>non-refundable</strong>.
              </li>
              <li>
                Any perks tied to supporting us — the ☕ supporter badge, Elite
                Membership for longer-term support, or access to chess books — are a
                token of our gratitude, not a paid product, and do not change the
                non-refundable nature of the contribution.
              </li>
              <li>
                If you were charged by mistake, charged more than once for the same
                contribution, or believe a payment was made fraudulently,{" "}
                <Link to="/contact">contact us</Link> within <strong>7 days</strong> of
                the charge and we will review it in good faith.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Coach subscriptions</h2>
            <ul>
              <li>
                Coach subscriptions are a <strong>one-time payment</strong> for the
                duration you select (for example 1, 3, 6 or 12 months). There is{" "}
                <strong>no auto-renewal</strong> — you are only charged when you choose
                to subscribe or renew.
              </li>
              <li>
                A <strong>free trial</strong> is available so you can evaluate the
                coaching tools before paying. We encourage you to use the trial to make
                sure the Service fits your needs.
              </li>
              <li>
                You may cancel your subscription at any time. Cancellation stops future
                access, but the payment for the period you already purchased is{" "}
                <strong>non-refundable</strong> for the unused portion of that period.
              </li>
              <li>
                If you were charged in error, charged more than once for the same
                subscription, or experienced a billing problem,{" "}
                <Link to="/contact">contact us</Link> within <strong>7 days</strong> of
                the charge and we will review it in good faith.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. How to request a review</h2>
            <p>
              To ask us to review a charge, reach us through our{" "}
              <Link to="/contact">Contact Us</Link> page within{" "}
              <strong>7 days</strong> of the payment and include:
            </p>
            <ul>
              <li>the email or username on your Chess Nexus account;</li>
              <li>
                the Razorpay payment ID or order reference (shown on your receipt); and
              </li>
              <li>a short description of the issue.</li>
            </ul>
            <p>
              We will respond within a reasonable time. Where we agree a refund is due
              (for example a duplicate or erroneous charge), it will be returned to the
              original payment method via Razorpay; the time it takes to appear depends
              on your bank or card issuer.
            </p>
          </section>

          <section>
            <h2>5. Chargebacks and disputes</h2>
            <p>
              If you have a problem with a payment, please{" "}
              <strong>contact us first</strong> — we can usually resolve it quickly.
              Raising a bank or card chargeback without contacting us may result in
              temporary suspension of your account or supporter perks while we
              investigate the dispute.
            </p>
          </section>

          <section>
            <h2>6. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. When we make material
              changes, we will update the effective date above and, where appropriate,
              notify you within the Service. Your continued use of the Service after an
              update means you accept the revised policy.
            </p>
          </section>

          <section>
            <h2>7. Contact us</h2>
            <p>
              Questions about refunds or cancellations? Reach us through our{" "}
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
