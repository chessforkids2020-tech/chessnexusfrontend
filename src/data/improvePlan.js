// The "how do I get better at chess?" flow.
//
// WHY THIS EXISTS SEPARATELY FROM helpCenter.js
// Every other help answer is one question -> one paragraph. This one cannot be:
// the honest answer depends on how strong the player already is. Telling a 700
// to study rook endgames and telling a 1900 to check their opponent's last move
// are both useless. So this asks for a rating first, then answers for that band.
//
// The advice is the academy's own coaching, not generic engine talk. It is
// deliberately about HABITS (what to do at the board, how to practise) rather
// than opening lines, because habits are what actually move a club player.

/**
 * The reply when someone taps the "Improving my chess" topic.
 *
 * Points, not prose: this is a checklist someone should be able to scan and
 * act on, and a paragraph hides the individual actions inside it.
 */
export const IMPROVE_POINTS = `Here is what actually moves your rating:

**1. Do harder puzzles without touching the pieces**
Calculate the whole line in your head, then check. Moving pieces to "see it" trains your hands, not your calculation.

**2. Get a 5-day streak and analyse your games**
Study your own mistakes — they are the patterns you personally keep repeating, which is why they cost you far more than anything general.

**3. Let Nexus Guide find your weakness**
It reads your own games, counts the mistakes you actually make, and ranks them. You stop guessing what to train and get told.

**4. Stop playing so much bullet and blitz**
Fast games rehearse your existing habits at speed. They do not build new ones. Play longer games where you have time to think.

**5. Use Replay Training**
Replay real games from the winning side and find the moves yourself. It trains choosing between reasonable-looking moves — which is what actually decides your games.`;

export const RATING_PROMPT = 'Now tell me your Lichess rating and I will show you exactly where you are losing.';

/**
 * The bands. `label` is the chip; `plan` is what the coach says.
 * Keep these in ascending order — the UI renders them as-is.
 */
export const BANDS = [
  {
    id: '400-800',
    label: '400 – 800',
    max: 800,
    plan: `At your level, the fastest improvement usually comes from preventing simple blunders and recognizing basic tactical patterns.

**For the next four weeks:**

• Solve 10 easy puzzles daily, focusing on forks, pins, skewers, hanging pieces and checkmates.
• Before every move, ask: "What is my opponent attacking?"
• In the opening, develop your knights and bishops, control the centre, castle early, and avoid moving the same piece repeatedly.
• Play slower games such as 10+5 or 15+10 instead of only bullet.
• Learn king-and-queen versus king, king-and-rook versus king, and basic pawn checkmates.

Your goal is not to memorise openings. Your goal is to stop giving away pieces.`,
  },
  {
    id: '801-1200',
    label: '801 – 1200',
    max: 1200,
    plan: `Your main goal is to become consistent. You probably already know basic tactics, but you may still miss your opponent's threats or play too quickly.

**Follow this routine:**

• Solve 15 puzzles daily, spending time calculating before moving.
• Play three 15+10 games each week.
• Analyse your games without an engine first, then check the critical moments with an engine.
• Learn one reliable opening setup as White, and one response to 1.e4 and 1.d4 as Black.
• Study opposition, the rule of the square, basic king-and-pawn endings, and simple rook endings.

Record your recurring mistakes. If you repeatedly lose to forks, weak back ranks, or missed captures, train that specific pattern.`,
  },
  {
    id: '1201-1600',
    label: '1201 – 1600',
    max: 1600,
    plan: `At this level, improvement comes from better calculation, better plans, and more serious analysis of your own games.

**Focus on:**

• Calculating two or three candidate moves before choosing.
• Solving mixed tactical puzzles, including zwischenzugs, discovered attacks, deflections and defensive tactics.
• Studying common pawn structures and learning the typical plans for each side.
• Reviewing every serious loss and identifying the first important decision — not only the final blunder.
• Learning practical rook endings, including Lucena and Philidor positions.
• Studying model games related to your openings.

Spend less time memorising long opening variations and more time understanding the middlegame positions that arise from them.`,
  },
  {
    id: '1601-2000',
    label: '1601 – 2000',
    max: 2000,
    plan: `Your improvement should now be personalised around recurring weaknesses. At this level, simply solving more easy puzzles or memorising more opening moves will usually have limited value.

**Use this training structure:**

• Analyse your own games deeply, especially equal positions where your plan became inaccurate.
• Practise calculation with difficult positions, and write down your variations before checking the answer.
• Study strategic themes: weak squares, outposts, minority attacks, pawn breaks, good versus bad pieces, and prophylaxis.
• Build practical endgame technique in rook, opposite-coloured bishop, same-coloured bishop and minor-piece endings.
• Maintain a compact opening repertoire based on ideas, typical plans and critical positions.
• Review your time management and decision-making in difficult positions.

Your goal is to convert small advantages and reduce inaccurate strategic decisions.`,
  },
  {
    id: '2001-2400',
    label: '2001 – 2400',
    max: 9999,
    plan: `At this level, you need a highly individualised training plan. Your rating alone is not enough to identify the correct priorities.

**Start by analysing 20–30 recent serious games and classify your losses into categories:**

• Opening preparation
• Calculation errors
• Strategic misjudgement
• Endgame technique
• Time management
• Psychological or practical decisions

**Then choose the two most frequent categories.** Work on them through deeply analysed positions, training games, coach feedback, and a carefully maintained opening file.

**Your training should include:**

• Critical positions from your own games.
• Advanced calculation and defensive-resource exercises.
• High-level model games in your repertoire.
• Theoretical and practical endgames.
• Regular review of tournament performance and time usage.

At this level, a coach or strong training partner can often identify patterns that an engine score cannot explain.`,
  },
];

/** Match a typed number to a band, so "1400" works as well as tapping a chip. */
export function bandForRating(n) {
  const r = Number(n);
  if (!Number.isFinite(r) || r <= 0) return null;
  return BANDS.find(b => r <= b.max) || BANDS[BANDS.length - 1];
}

/**
 * Does this message look like "how do I get better at chess?"
 *
 * Deliberately broad: this flow is a better answer than any single article for
 * ANY phrasing of the question, so a false positive costs little. It is checked
 * BEFORE the article search, which otherwise returns a one-paragraph answer or,
 * for "how can i get better at chess", nothing at all.
 */
export function isImproveQuestion(text) {
  const t = String(text).toLowerCase();
  // Needs an "improve" verb AND a chess/game object, so "how do I get better
  // reception" style false hits stay out.
  const verb = /(improve|get better|getting better|become better|become good|get good|be better|progress|advance|grow|level up|stronger|strength)/.test(t);
  const obj  = /(chess|game|games|rating|play|playing|elo)/.test(t);
  // "how do I improve" on its own is unambiguous in a chess app.
  const bare = /^(how (do|can|should) i (improve|get better|get stronger|progress)|how to (improve|get better|get stronger)|ways? to (improve|get better))\b/.test(t.trim());
  return bare || (verb && obj);
}

/**
 * "People also ask" — the two questions that naturally follow a training plan.
 *
 * A plan tells someone WHAT to work on; these tell them WHERE in the app to do
 * it, and how to see whether it worked. Offered as chips after every band so
 * the advice does not dead-end in a wall of text.
 */
export const FOLLOWUPS = [
  {
    id: 'use-nexus',
    q: 'How do I use Chess Nexus to become better at chess?',
    a: `Seven tools, and the order matters — each one feeds the next.

**1. Nexus Guide**
Start here. It analyses your own games, tallies the mistakes you actually make, and ranks your weaknesses — so instead of guessing what to train, you are told. It shows the exact positions where you went wrong and lets you drill your weakest theme directly. Find it on your dashboard; press Analyse and it works through your recent games.

**2. Puzzles**
Your daily pattern training. Use Healthy Mix to solve by THEME (forks, pins, back-rank mates) rather than at random, so you drill the pattern you actually keep missing. Ten a day beats a hundred on Sunday.

**3. Analyse your games**
Run your own games through the engine, right in the browser. Look at the moments where the evaluation swung — that is where you went wrong, and it is far more useful than any general advice. Do this before you look at the engine's suggestion: guess first, then check.

**4. My Moments**
Every mistake from your own games, turned into a puzzle. These are YOUR blind spots rather than someone else's, which makes them the most valuable practice on the site. It never affects your rating, so there is no reason to avoid the hard ones.

**5. Replay Training**
Replay a real game from the winning side and find the moves yourself. It trains the thing that actually decides games: choosing between several reasonable-looking moves, under real conditions, without knowing which one is right.

**6. Endgame training**
Play theoretical endings out against the computer until the technique is automatic. Rook endings appear in more of your games than any opening you will ever study.

**7. Help Center**
Ask here whenever you are stuck on what to do next. If you are rated 800+, you can also message a Nexus moderator for a plan built around your own games.

The routine that works: let Nexus Guide tell you your weakness, drill that theme daily, analyse every serious loss, and put whatever you find into My Moments.`,
    links: [
      { to: '/dashboard',            label: 'Nexus Guide' },
      { to: '/training/healthy-mix', label: 'Puzzles by theme' },
      { to: '/game-analysis',        label: 'Analyse my games' },
      { to: '/training/my-moments',  label: 'My Moments' },
      { to: '/replay-training',      label: 'Replay Training' },
      { to: '/study/endgames',       label: 'Endgames' },
    ],
  },
  {
    id: 'report',
    q: 'How do I generate a report of my games in Chess Nexus?',
    a: `Chess Nexus builds the report from a **5-day practice streak** — it is earned by playing, not requested from a menu.

**How a day counts**
You need all three on the same day:
• 10 puzzles
• 1 game
• 1 endgame against the computer

**What you get after 5 days in a row**
A full report on your play: your accuracy by phase (opening, middlegame, endgame), the patterns you keep getting wrong, your rating movement, and a study plan of what to work on next.

**Why it is built this way**
Five days of real practice gives enough games to find a genuine pattern. A report from two blitz games would just be noise, and would send you off training the wrong thing.

You can also analyse any single game at any time from Analyse My Games — no streak needed. The streak report is the bigger picture; game analysis is the close-up.`,
    links: [
      { to: '/training/healthy-mix', label: 'Start today\u2019s puzzles' },
      { to: '/game-analysis',        label: 'Analyse a game' },
    ],
  },
];

/**
 * "Can I talk to a moderator?" — an explicit request for a human.
 *
 * Unlike isImproveQuestion, this is NOT about chess content: they already know
 * what they want and are asking for the door. Detecting it means they get the
 * form straight away instead of having to fail a search first.
 */
export function isModeratorRequest(text) {
  const t = String(text).toLowerCase();
  const who  = /(moderator|moderater|moderador|admin|nexus team|human|real person|someone|coach|staff|support team)/.test(t);
  const want = /(talk|speak|contact|message|msg|chat|reach|ask|write|connect|get in touch)/.test(t);
  return who && want;
}
