import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import SEO from "../../components/SEO";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { t as tr } from '../../i18n/LanguageContext';
import "./ChessboardPage.css";

const CANONICAL = "/chessboard";

// Sales open 24 Nov 2026, 00:00 IST (= 23 Nov 18:30 UTC).
const LAUNCH_AT = Date.parse("2026-11-23T18:30:00Z");

// Time left, computed AFTER mount only: this page is prerendered, so a value
// baked in at build time would be wrong by the time anyone reads it (and would
// mismatch on hydration). `null` renders dashes until the first tick.
function useCountdown() {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, LAUNCH_AT - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

const pad = (n) => String(n).padStart(2, "0");

// The product photo (public/chessnexus-board.webp, 1200x902, transparent background). The lit squares
// in the picture are the real board showing the move e2-e4.
function BoardArt() {
  return (
    <div className="cbl-board-wrap">
      <img
        className="cbl-photo"
        src="/chessnexus-board.webp"
        alt={tr("The ChessNexus electronic chessboard with the e2 and e4 squares lit up")}
        width="1200"
        height="902"
        fetchpriority="high"
      />
      <div className="cbl-board-glow" />
    </div>
  );
}

// Digits only; a bare 10-digit number is taken as Indian (+91). Returns "" when
// the box is empty, null when what was typed cannot be a phone number.
function normalizeWhatsapp(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return String(raw || "").trim() ? null : "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Guesses can be made in rupees or dollars. Keep LIMITS in step with
// backend/routes/boardGuess.js. The offer itself (how close = how much off) is
// decided by the admin at reveal time and is deliberately NOT shown here.
const LIMITS = { INR: [1000, 300000], USD: [10, 5000] };
const SYMBOL = { INR: "₹", USD: "$" };
const money = (n, cur = "INR") =>
  `${SYMBOL[cur]}${Number(n).toLocaleString(cur === "INR" ? "en-IN" : "en-US")}`;

// Whether guessing is still open / the real price has been revealed.
function useGuessStatus() {
  const [status, setStatus] = useState({ open: true, revealed: false, namers: 0 });
  useEffect(() => {
    let alive = true;
    api.get("/api/board-guess/status")
      .then((r) => { if (alive) setStatus(r.data); })
      .catch(() => { /* keep the open default; the server re-checks on submit */ });
    return () => { alive = false; };
  }, []);
  return status;
}

// After the reveal: a player checks how close they were.
function GuessResult() {
  const [email, setEmail] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function check(e) {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await api.post("/api/board-guess/result", { email: email.trim() });
      setRes(r.data);
    } catch (ex) {
      setErr(ex.response?.data?.message || tr("Something went wrong. Please try again."));
    } finally { setBusy(false); }
  }

  return (
    <div className="cbl-result">
      <h3>{tr("Check your guess")}</h3>
      <form onSubmit={check} className="cbl-result-form">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
               placeholder={tr("Email you used")} aria-label={tr("Email you used")} />
        <button type="submit" className="cbl-btn" disabled={busy}>{busy ? tr("Checking…") : tr("Check")}</button>
      </form>
      {err && <p className="cbl-err">{err}</p>}
      {res && !res.found && <p className="cbl-err">{tr("We couldn't find a guess for that email.")}</p>}
      {res && res.found && (
        <p className="cbl-result-out">
          {tr("The price is")} <b>{money(res.actualPrice, res.currency)}</b> · {tr("you guessed")} <b>{money(res.guess, res.currency)}</b> ({res.offByPct}% {tr("off")}).{" "}
          {res.discountPct > 0
            ? <><b>{res.discountPct}% {tr("off")}</b> {tr("your first board. We'll send your code by email.")}</>
            : tr("No discount this time, thanks for playing!")}
        </p>
      )}
    </div>
  );
}

// The naming challenge: a highlighted band right under the hero. Framed as a
// game and ANONYMOUS: no name, no email. A random id kept in the visitor's own
// browser caps ideas per browser, and they get a secret code; if their idea
// wins, showing the code proves it was theirs.
const DEVICE_KEY = "cbl_device";
const CODE_KEY = "cbl_name_code";

function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked: a per-visit id still works, it just is not remembered.
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
  }
}
const savedCode = () => { try { return localStorage.getItem(CODE_KEY) || ""; } catch { return ""; } };

function NameBoardBanner({ namers }) {
  const [ideas, setIdeas] = useState({ electronic: "", robotic: "" });
  const [st, setSt] = useState("idle"); // idle | sending | done | error
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState({});          // what was entered this visit, by board
  const [code, setCode] = useState(savedCode);   // the visitor's secret claim code

  async function send(e) {
    e.preventDefault();
    if (st === "sending") return;
    const payload = {};
    if (ideas.electronic.trim()) payload.electronic = ideas.electronic.trim();
    if (ideas.robotic.trim()) payload.robotic = ideas.robotic.trim();
    if (!Object.keys(payload).length) { setMsg(tr("Type a name for at least one board.")); setSt("error"); return; }
    setSt("sending"); setMsg("");
    try {
      const r = await api.post("/api/board-guess/name", { deviceId: getDeviceId(), ideas: payload });
      setSent(payload);
      setCode(r.data.code);
      try { localStorage.setItem(CODE_KEY, r.data.code); } catch { /* fine */ }
      setIdeas({ electronic: "", robotic: "" });
      setSt("done");
    } catch (ex) {
      setMsg(ex.response?.data?.message || tr("Something went wrong. Please try again."));
      setSt("error");
    }
  }

  const set = (board) => (e) => setIdeas({ ...ideas, [board]: e.target.value });

  return (
    <section className="cbl-name" aria-label={tr("The naming challenge")}>
      <div className="cbl-name-text">
        <span className="cbl-name-badge">🎮 {tr("Naming challenge")}</span>
        <h2>{tr("Be the one who names it.")}</h2>
        <div className="cbl-name-mask" aria-hidden="true">
          <span>ChessNexus</span><b>? ? ? ? ?</b>
        </div>
        <p>{tr("Both boards are about to get their names, and they could be yours. Nobody sees who sent what. The winning names, and who sent them, are revealed at launch.")}</p>
        {namers >= 10 && (
          <p className="cbl-name-count">🔥 <b>{namers}</b> {tr("players have entered")}</p>
        )}
      </div>

      {st === "done" ? (
        <div className="cbl-name-done">
          <div className="cbl-name-in">🎉 {tr("You're in!")}</div>
          {sent.electronic && <p>💡 {tr("Electronic board")}: <b>“{sent.electronic}”</b></p>}
          {sent.robotic && <p>🤖 {tr("Robotic board")}: <b>“{sent.robotic}”</b></p>}
          <div className="cbl-name-code">
            <span>{tr("Your secret code")}</span>
            <b>{code}</b>
            <small>{tr("Keep it. If your name wins, this code proves it's yours.")}</small>
          </div>
          <button type="button" onClick={() => setSt("idle")}>{tr("Enter more ideas")}</button>
        </div>
      ) : (
        <form className="cbl-name-form" onSubmit={send}>
          <label className="cbl-name-field">
            <span>💡 {tr("Electronic board")}</span>
            <input maxLength={30} value={ideas.electronic} onChange={set("electronic")}
                   placeholder={tr("Its name…")} aria-label={tr("Name for the electronic board")} />
          </label>
          <label className="cbl-name-field">
            <span>🤖 {tr("Robotic board")}</span>
            <input maxLength={30} value={ideas.robotic} onChange={set("robotic")}
                   placeholder={tr("Its name…")} aria-label={tr("Name for the robotic board")} />
          </label>
          <p className="cbl-name-note">{tr("Name one board, or both. No name or email needed.")}</p>
          <button type="submit" className="cbl-btn" disabled={st === "sending"}>
            {st === "sending" ? tr("Sending…") : tr("Enter the challenge")}
          </button>
          {st === "error" && <p className="cbl-err cbl-name-err">{msg}</p>}
          {code && <p className="cbl-name-mycode">{tr("Your secret code")}: <b>{code}</b></p>}
        </form>
      )}
    </section>
  );
}

function NotifyForm({ guessOpen }) {
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", board: "Both boards", guess: "", currency: "INR" });
  const [state, setState] = useState("idle"); // idle | sending | done | error | badphone | badguess
  const [guessed, setGuessed] = useState(null);
  const [serverMsg, setServerMsg] = useState("");
  const [guessNote, setGuessNote] = useState("");   // why a guess was not saved, if the sign-up still went through

  async function submit(e) {
    e.preventDefault();
    if (state === "sending") return;
    const wa = normalizeWhatsapp(form.whatsapp);
    if (wa === null) { setState("badphone"); return; }
    const guessDigits = form.guess.replace(/\D/g, "");
    const guess = guessDigits ? Number(guessDigits) : null;
    const [minG, maxG] = LIMITS[form.currency];
    if (guess !== null && (guess < minG || guess > maxG)) { setState("badguess"); return; }
    setState("sending");
    try {
      // One sign-up endpoint for everyone (signed-in, guest account or visitor);
      // the server records which, and files the sign-up for the admin. The price
      // guess is optional.
      const body = { name: form.name.trim(), email: form.email.trim(), whatsapp: wa, board: form.board };
      if (guess !== null) { body.guess = guess; body.currency = form.currency; }
      const r = await api.post("/api/board-guess", body);
      if (guess !== null && r.data.guessSaved) setGuessed({ amount: guess, currency: form.currency });
      setGuessNote(r.data.guessRejected || "");
      setState("done");
    } catch (ex) {
      setServerMsg(ex.response?.data?.message || "");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="cbl-done">
        <div className="cbl-done-ic">✅</div>
        <h3>{tr("You're on the list")}</h3>
        <p>{tr("We'll email you the moment sales open on 24 November.")}</p>
        {guessNote && <p className="cbl-err">{guessNote}</p>}
        {guessed && (
          <p className="cbl-done-guess">
            🎯 {tr("Your guess")} <b>{money(guessed.amount, guessed.currency)}</b> {tr("is locked in. The real price is revealed on 24 November. Come back to see how close you were.")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="cbl-form" onSubmit={submit}>
      <input
        required
        placeholder={tr("Your name")}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        aria-label={tr("Your name")}
      />
      <input
        required
        type="email"
        placeholder={tr("Email address")}
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        aria-label={tr("Email address")}
      />
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={tr("WhatsApp number (optional)")}
        value={form.whatsapp}
        onChange={(e) => { setForm({ ...form, whatsapp: e.target.value }); if (state === "badphone") setState("idle"); }}
        aria-label={tr("WhatsApp number (optional)")}
      />
      <p className="cbl-hint">{tr("Add your WhatsApp number and we'll send you one reminder when sales open.")}</p>
      {guessOpen && (
        <>
          <div className="cbl-cur" role="group" aria-label={tr("Currency")}>
            {["INR", "USD"].map((cur) => (
              <button
                key={cur}
                type="button"
                className={form.currency === cur ? "on" : ""}
                onClick={() => { setForm({ ...form, currency: cur }); if (state === "badguess") setState("idle"); }}
              >
                {SYMBOL[cur]} {cur}
              </button>
            ))}
          </div>
          <div className="cbl-money">
            <span aria-hidden="true">{SYMBOL[form.currency]}</span>
            <input
              inputMode="numeric"
              placeholder={tr("Your price guess (optional)")}
              value={form.guess}
              onChange={(e) => { setForm({ ...form, guess: e.target.value.replace(/[^\d,]/g, "") }); if (state === "badguess") setState("idle"); }}
              aria-label={tr("Your price guess (optional)")}
            />
          </div>
          <p className="cbl-hint">{tr("The closer your guess when we reveal the price on 24 November, the better your discount. One guess per person.")}</p>
        </>
      )}
      <select
        value={form.board}
        onChange={(e) => setForm({ ...form, board: e.target.value })}
        aria-label={tr("Which board?")}
      >
        <option value="Both boards">{tr("Both boards")}</option>
        <option value="Electronic board">{tr("Electronic board")}</option>
        <option value="Robotic board">{tr("Robotic board")}</option>
      </select>
      <button type="submit" className="cbl-btn" disabled={state === "sending"}>
        {state === "sending" ? tr("Sending…") : tr("Notify me at launch")}
      </button>
      {state === "badphone" && (
        <p className="cbl-err">{tr("That WhatsApp number doesn't look right. Use 10 digits, or include your country code.")}</p>
      )}
      {state === "badguess" && (
        <p className="cbl-err">{`${tr("Enter a whole-number price between")} ${money(LIMITS[form.currency][0], form.currency)} ${tr("and")} ${money(LIMITS[form.currency][1], form.currency)}.`}</p>
      )}
      {state === "error" && (
        <p className="cbl-err">{serverMsg || tr("Something went wrong. Please try again.")}</p>
      )}
    </form>
  );
}

export default function ChessboardPage() {
  const left = useCountdown();
  const onSale = left === 0;
  const guessStatus = useGuessStatus();
  const { user } = useAuth();
  const guessOpen = guessStatus.open && !onSale;

  const units = left == null
    ? [["--", "Days"], ["--", "Hours"], ["--", "Minutes"], ["--", "Seconds"]]
    : [
        [pad(Math.floor(left / 86400000)), "Days"],
        [pad(Math.floor(left / 3600000) % 24), "Hours"],
        [pad(Math.floor(left / 60000) % 60), "Minutes"],
        [pad(Math.floor(left / 1000) % 60), "Seconds"],
      ];

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "ChessNexus Electronic & Robotic Chessboard",
      description:
        "The ChessNexus electronic chessboard with light-up squares and voice, and the robotic chessboard that moves the pieces for you. Sales start 24 November 2026.",
      url: `https://www.chessnexus.in${CANONICAL}`,
    },
  ];

  // "Guess & win a discount": jump to the form and put the cursor in the price box.
  const goGuess = () => {
    document.getElementById("notify")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => document.querySelector(".cbl-money input")?.focus({ preventScroll: true }), 600);
  };

  const scrollToNotify = () =>
    document.getElementById("notify")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="cbl-page">
      <SEO
        title={tr("ChessNexus Chessboard — Electronic & Robotic")}
        description="The ChessNexus electronic chessboard with light-up squares and a voice that guides every move, and a robotic chessboard that moves the pieces for you. Sales start 24 November 2026."
        keywords="electronic chessboard, robotic chessboard, smart chessboard India, light up chessboard, chess board for kids, chessnexus chessboard"
        canonical={CANONICAL}
      />
      <Helmet>
        {schema.map((s, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
        ))}
      </Helmet>

      {/* ── HERO ── */}
      <header className="cbl-hero">
        <div className="cbl-hero-text">
          <h1>{tr("The chessboard that plays back.")}</h1>

          {!onSale && (
            <div className="cbl-count" role="timer" aria-label={tr("Time until launch")}>
              {units.map(([n, label]) => (
                <div className="cbl-tile" key={label}>
                  <b>{n}</b>
                  <span>{tr(label)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="cbl-actions">
            <button type="button" className="cbl-btn cbl-btn-lg" onClick={scrollToNotify}>
              {onSale ? tr("Order now") : tr("Notify me at launch")}<span className="cbl-arrow"> →</span>
            </button>
            {guessOpen && (
              <button type="button" className="cbl-btn-ghost" onClick={goGuess}>
                🎯 {tr("Guess to win a discount")}
              </button>
            )}
          </div>
        </div>
        <BoardArt />
      </header>

      {!onSale && <NameBoardBanner namers={guessStatus.namers} />}

      {/* ── TICKER ── */}
      <div className="cbl-ticker" aria-hidden="true">
        <div className="cbl-ticker-track">
          {[0, 1].map((k) => (
            <span key={k}>
              ✨ {tr("Light-up squares")} &nbsp;·&nbsp; 🔊 {tr("Voice guidance")} &nbsp;·&nbsp; ♟️ {tr("Moves the pieces")} &nbsp;·&nbsp; 🧠 {tr("Plays Stockfish")} &nbsp;·&nbsp; 📵 {tr("No screen needed")} &nbsp;·&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── THE TWO BOARDS ── */}
      <section className="cbl-section">
        <p className="cbl-eyebrow">{tr("Two boards. One launch.")}</p>
        <div className="cbl-products">
          <article className="cbl-product cbl-p-elec">
            <span className="cbl-ribbon">{tr("Coming 24 Nov")}</span>
            <div className="cbl-p-ic">💡</div>
            <h2>{tr("Electronic Chessboard")}</h2>
            <p className="cbl-tag">{tr("Light says where. Voice says what.")}</p>
            <p>{tr("Screen-free training. Every square can light up, so the board shows where to move, and a voice tells you what the idea is.")}</p>
          </article>
          <article className="cbl-product cbl-p-robo">
            <span className="cbl-ribbon">{tr("Coming 24 Nov")}</span>
            <div className="cbl-p-ic">🤖</div>
            <h2>{tr("Robotic Chessboard")}</h2>
            <p className="cbl-tag">{tr("It moves the pieces for you.")}</p>
            <p>{tr("Play a real game on a real board. A hidden mechanism under the board slides the opponent's pieces, so the computer plays back like a person would.")}</p>
          </article>
        </div>
      </section>

      {/* ── TWO WAYS TO PLAY: connect ChessNexus and Lichess ── */}
      <section className="cbl-section cbl-accounts" aria-label={tr("Connect your accounts")}>
        <p className="cbl-eyebrow">{tr("Connect your accounts")}</p>
        <h2 className="cbl-accounts-title">{tr("Sign in once. Play either way.")}</h2>
        <div className="cbl-accounts-grid">
          <article className="cbl-acct cbl-acct-cn">
            <div className="cbl-acct-head"><span className="cbl-acct-ic" aria-hidden="true">♟</span><h3>ChessNexus</h3></div>
            <p className="cbl-acct-lead">{tr("Your academy account, on a real board.")}</p>
            <ul>
              <li>{tr("Solve puzzles on a real board")}</li>
              <li>{tr("Play Stockfish and friends")}</li>
              <li>{tr("Do your coach's assignments")}</li>
              <li>{tr("Keep every game in your account")}</li>
            </ul>
            {!user && <Link to="/signup-request" className="cbl-acct-link">{tr("Create a free account")} →</Link>}
          </article>

          <article className="cbl-acct cbl-acct-li">
            <div className="cbl-acct-head"><span className="cbl-acct-ic" aria-hidden="true">♞</span><h3>Lichess</h3></div>
            <p className="cbl-acct-lead">{tr("Play real opponents online.")}</p>
            <ul>
              <li>{tr("Random opponents and tournaments")}</li>
              <li>{tr("Rapid and classical games")}</li>
              <li>{tr("Your games stay on Lichess")}</li>
            </ul>
            <p className="cbl-acct-note">{tr("Connect it once in Settings when your board arrives.")}</p>
          </article>
        </div>
      </section>

      {/* ── NOTIFY ── */}
      <section className="cbl-section cbl-notify" id="notify">
        <h2>{tr("Be first in line")}</h2>
        <p>{tr("Leave your email and we'll tell you the moment sales open.")}</p>

        <NotifyForm guessOpen={guessOpen} />
        {guessStatus.revealed && <GuessResult />}
      </section>
    </div>
  );
}
