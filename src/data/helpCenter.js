import { GENERATED_ANSWERS } from './helpAnswers.generated.js';

// Nexus Help Center — the questions people actually ask, with plain answers.
//
// WHY A SEPARATE FILE
// The marketing pages already carry ~140 Q&As, but they are scattered one-per
// landing-page and written to sell rather than to instruct. A coach looking for
// "how do I set holidays" should not have to guess which marketing page mentions
// it. This file is the in-app reference: task-shaped, searchable, and grouped by
// who is asking.
//
// SHAPE
//   sections[] -> { id, title, blurb, icon, audience, articles[] }
//   articles[] -> { q, a, to? }   `to` deep-links into the app where relevant.
//
// `a` is plain text on purpose: it stays searchable, and a help answer that
// needs formatting usually needs to be shorter instead.

export const HELP_SECTIONS = [
  // ── COACHES ──────────────────────────────────────────────────────────────
  {
    id: 'coach-start',
    audience: 'coach',
    icon: '🚀',
    title: 'Getting started as a coach',
    blurb: 'Onboarding, your directory profile, and your first students.',
    articles: [
      {
        q: 'How do I become a coach on Chess Nexus?',
        a: 'Open the Coach page from the sidebar and complete the onboarding form. It asks for your name, country, languages, rating, years of coaching and a short "about you". Once submitted, the Nexus team reviews it — usually within a day or two — and your coach tools unlock.',
        to: '/coach/onboarding',
      },
      {
        q: 'What should I fill in on the onboarding form?',
        a: 'Write the "about you" as if a parent were reading it, because that is who usually is. Mention how long you have coached, the levels you teach, and how your classes run. Add your Lichess or Chess.com rating if you have one — a verified rating makes your profile far more convincing than a claim.',
        to: '/coach/onboarding',
      },
      {
        q: 'How do I appear in the coaches directory?',
        a: 'Three things have to be true, and the last one catches most people out.\n\n**1. Finish coach onboarding.**\n\n**2. Fill in your profile.** Go to your Coach dashboard and press “👤 Profile” at the top. Add your bio, rating, rate, languages and the levels you teach.\n\n**3. Turn the listing on.** At the bottom of that same page, tick “List me in the public coach directory”. This is OFF by default — if you skip it, nothing else you do will make your card appear. There is a separate tick for “I am taking new students”, which adds an “open to students” badge; that one does not list you on its own.\n\nYour page goes live once the Nexus team has verified you AND that box is ticked. A filled-in bio and a verified rating are what make parents get in touch.',
        to: '/coach/profile',
      },
      {
        q: 'Is coaching free?',
        a: 'Yes — free forever for up to 30 students, with no trial period and no card required. Paid plans lift the student cap and raise limits on live classes, saved templates and premium content for your students.',
        to: '/chess-coach-pricing',
      },
    ],
  },
  {
    id: 'coach-students',
    audience: 'coach',
    icon: '👥',
    title: 'Students and batches',
    blurb: 'Adding students, grouping them, and tracking what they do.',
    articles: [
      {
        q: 'How do I add students?',
        a: 'Send them your coach link, or add them from your Students page if they already have an account. They confirm the connection, and from then on their practice shows in your dashboard.',
        to: '/coach/dashboard',
      },
      {
        q: 'How do I create a batch?',
        a: 'Go to Batches and create one — give it a name like "Sunday Beginners". Then assign students to it. Assignments, courses, class schedules and private races can all target a whole batch at once, so running several groups of different levels stays manageable.',
        to: '/coach/batches',
      },
      {
        q: 'How do I see a student\'s progress?',
        a: 'Open any student from your Students page. You get their puzzle accuracy by theme, their rating history, their practice streak, the games they have played (including Lichess and Chess.com if they have linked those accounts), and their assignment completion.',
        to: '/coach/dashboard',
      },
      {
        q: 'What kinds of progress can I see?',
        a: 'Four kinds: activity (how much they practise and when), accuracy (how well they solve, broken down by theme so you can see which patterns they miss), rating (puzzle and game ratings over time), and assignment completion (what you set versus what they finished).',
      },
      {
        q: 'How do I set class days and holidays?',
        a: 'Use the Schedule page to set your weekly class slots per batch — days, IST time and a meeting link. Students see these on their My Coach page. Changing or cancelling a slot posts a notice in the batch chat automatically, so nobody turns up to a class that is not running.',
        to: '/coach/schedule',
      },
    ],
  },
  {
    id: 'coach-teaching',
    audience: 'coach',
    icon: '🎓',
    title: 'Teaching tools',
    blurb: 'Live classroom, assignments, courses and studies.',
    articles: [
      {
        q: 'How do I run a live class?',
        a: 'Chess Nexus has a built-in live classroom — no Zoom needed. You get a shared board with video and audio, and you can push a position, an endgame or a puzzle straight onto every student\'s board. Every coach gets at least one live class a day free.',
        to: '/coach/live',
      },
      {
        q: 'How do I set an assignment?',
        a: 'From Assignments, pick what the student should do: puzzles (a theme, a rating range, or a theme at a difficulty you choose), a study chapter, a puzzle rush, an arena tournament, or positions you set yourself. Choose the students or batch, add a due date, and it appears on their dashboard.',
        to: '/coach/assignments',
      },
      {
        q: 'Can I give beginners easy puzzles on a hard theme?',
        a: 'Yes. Choose "A theme at a set difficulty" when creating a puzzle assignment, then pick a band such as 400–800. The puzzles come from that band rather than from the student\'s own rating, so a beginner learning back-rank mates gets easy back-rank mates.',
        to: '/coach/assignments',
      },
      {
        q: 'How do I build a course?',
        a: 'Course Builder lets you order lessons into a syllabus: your own studies, Nexus studies, videos, master games and endgame positions. Enrol a batch and every student in it follows the same path in order.',
        to: '/coach/courses',
      },
    ],
  },

  // ── PLAYERS ──────────────────────────────────────────────────────────────
  {
    id: 'play-start',
    audience: 'player',
    icon: '♟',
    title: 'Playing on Chess Nexus',
    blurb: 'Games, tournaments and playing the computer.',
    articles: [
      {
        q: 'How do I play a game?',
        a: 'Open Play from the sidebar. You can play a friend by sharing a code, play Stockfish at six strength levels with any time control, join an arena tournament, or play on the 3D board.',
        to: '/games',
      },
      {
        q: 'How do I play against the computer (Stockfish)?',
        a: 'Play → Play vs Stockfish. Pick a time control (or unlimited), a strength from Depth 2 up to full strength, and whether to start from the normal position or one you set up yourself. Your clock only starts after your first move.',
        to: '/play/ai',
      },
      {
        q: 'What is an arena tournament?',
        a: 'A timed tournament where you are paired with a new opponent as soon as your last game ends. Play as many games as you can before the clock runs out — the more you win, the higher you place. Everyone starts each arena at the same tournament rating.',
        to: '/arenatournament',
      },
    ],
  },
  {
    id: 'play-improve',
    audience: 'player',
    icon: '📈',
    title: 'Improving my chess',
    // `directAnswer` makes this topic reply with the improvement plan instead
    // of listing its articles. Someone tapping "Improving my chess" wants the
    // answer, not another menu — the articles are still reachable by search.
    directAnswer: 'improve',
    blurb: 'Puzzles, your own mistakes, and replay training.',
    articles: [
      {
        q: 'How do I improve fastest here?',
        a: 'Three things, in order: solve puzzles daily (little and often beats a long session once a week), work through My Moments — the mistakes from your own games, which are the patterns you personally keep missing — and keep a practice streak so it becomes a habit.',
        to: '/puzzles-hub',
      },
      {
        q: 'What is Nexus Guide?',
        a: 'Your personal guide on the dashboard. It analyses your own games, counts the mistakes you actually make, and ranks your weaknesses — so you are told what to train instead of guessing. It shows you the exact positions where you went wrong, and lets you drill your weakest theme straight away. Press Analyse on the dashboard and it works through your recent games.',
        to: '/dashboard',
      },
      {
        q: 'What is My Moments?',
        a: 'The exact positions where you went wrong in your own games, turned into puzzles. It is practice only and never changes your rating. These are more valuable than random puzzles because they are your own blind spots rather than someone else\'s.',
        to: '/training/my-moments',
      },
      {
        q: 'What is Replay Training and does it help?',
        a: 'You replay a real game from the winning side. The opening plays out, then from move 11 you play every one of that side\'s moves while the opponent replies exactly as in the real game. You score 10 points for the engine\'s best move, 9 for the move actually played, 7 or 5 for a strong alternative. It trains the thing that decides games: choosing between reasonable-looking moves under real conditions.',
        to: '/replay-training',
      },
      {
        q: 'How do puzzle themes work?',
        a: 'You can practise a specific pattern — forks, pins, back-rank mates, and so on — instead of random puzzles. Pick a theme in Healthy Mix. Puzzles come from near your rating and upward, so the theme keeps stretching you rather than repeating what you already find easy.',
        to: '/training/healthy-mix',
      },
      {
        q: 'Can I ask someone how to improve my chess?',
        a: 'Yes. Ask me your question first — most answers are already here. If I cannot answer it, a “Message a moderator” button appears. You give your Lichess username, your current rating, and what you want help with — and a moderator writes back with what to work on. The reply appears in this same help chat and your notification bell tells you when it lands. It is for players rated 800+ on Chess Nexus, Lichess or Chess.com, because below that the best plan is the same for everyone: puzzles every day and My Moments. You get one message a month; supporters get three.',
        to: '/help',
      },
      {
        q: 'How do I contact the Nexus team?',
        a: 'It depends what you need. For anything about your account, a payment, or something broken, use the Contact page — anyone can write. For advice on improving your chess, ask me first — if I have no answer, a “Message a moderator” button appears, and that one goes to someone who will look at how you play and write back a practice plan.',
        to: '/contact',
      },
      {
        q: 'What is the practice streak?',
        a: 'A day counts when you do all three: ten puzzles, one game, and one endgame against the computer. Five days in a row earns a report on your play — your accuracy by phase, your worst patterns, and what to work on next.',
      },
    ],
  },
  {
    id: 'social-friends',
    audience: 'player',
    icon: '🤝',
    title: 'Friends, invites and clubs',
    blurb: 'Inviting people, adding friends, and starting a club.',
    articles: [
      {
        q: 'How do I invite people to Chess Nexus?',
        a: 'Click “Social Hub” in the left sidebar, then open the “🔓 Invite to Unlock” tab. At the top you will see “Your Invite Link” in a box, with a “Copy” button next to it. Press Copy — it turns into “✓ Copied!” — then paste the link to your friends on WhatsApp or anywhere else. Anyone who joins using your link is counted as your invite. They become “Active” once they verify their email and then play games or solve puzzles to earn 10 activity points, and active friends unlock avatar rewards: 5 for Basic Avatars, 15 for a Custom Photo, 45 for 3D Models.',
        to: '/invite',
      },
      {
        q: 'How do I send a friend request to someone?',
        a: 'Click “Social Hub” in the left sidebar, then the “👥 Friends” tab. At the top choose “Find”. Type the person’s username or display name in the search box — you need at least 2 letters. When you see them in the list, press the “+ Add” button on the right of their name. The button changes to “Sent”, which means they now have your request and just need to accept it.',
        to: '/friends',
      },
      {
        q: 'How do I accept a friend request from someone?',
        a: 'Click “Social Hub” in the left sidebar, then the “👥 Friends” tab, then choose “Requests” at the top. When someone has asked to be your friend, a small number appears on that tab so you know. You will see their name with two buttons: press the green “Accept” to become friends, or “Decline” to say no. Once you accept, they show up in your “Friends” tab.',
        to: '/friends',
      },
      {
        q: 'How do I find a player to send a friend request to?',
        a: 'There are two ways. Easiest: Social Hub → “👥 Friends” → “Find”, then type their name in the search box and press “+ Add”. You can also open Social Hub → “👤 Players” to browse people on Chess Nexus and click a player to see their profile. If you cannot find someone, ask them for their exact username — search needs the real username or display name, not their real-life name.',
        to: '/players',
      },
      {
        q: 'How do I create a club?',
        a: 'Click “Social Hub” in the left sidebar, then the “🏰 Clubs” tab, then press the “+ Create Club” button at the top right. Type a club name (this is required), add a short description if you want, and choose whether it is public or private. Public clubs (🌍) can be found by anyone browsing the clubs list; private clubs (🔒) are hidden and can only be joined with your invite link. Press Create and your club is ready — you are the owner.',
        to: '/clubs',
      },
      {
        q: 'How do I invite people to join my club?',
        a: 'Open your club from Social Hub → “🏰 Clubs” and look for the “Invite Others” box on the left. If your club is PUBLIC, press “🔑 Reveal Join Code”, then “📋 Copy”, and send that short code — your friends enter it using the “🔑 Join with Code” button on the Clubs page. If your club is PRIVATE, press “🔗 Get Invite Link”, then “🔗 Copy Link”, and send the whole link — clicking it opens Chess Nexus with the code already filled in. Only club members can see these, so join your own club first.',
        to: '/clubs',
      },
    ],
  },
  {
    id: 'play-account',
    audience: 'player',
    icon: '⚙️',
    title: 'Your account',
    blurb: 'Ratings, XP, linked accounts and profile.',
    articles: [
      {
        q: 'How do I link my Lichess or Chess.com account?',
        a: 'Settings → Profile, then enter your username for either site. Once linked, games you play there count toward your practice streak and appear in your progress reports, and your coach can see them too.',
        to: '/settings',
      },
      {
        q: 'What is the XP wallet?',
        a: 'XP tracks how active you are across the app: 5 XP per puzzle, 5 per arena tournament game, 5 per race, 3 per game analysis, 2 per arcade game, and 30 for inviting a friend who joins. XP unlocks things like your streak report. It is separate from Monthly Focus XP.',
      },
      {
        q: 'Why do I have several ratings?',
        a: 'Bullet, blitz, rapid and classical are separate game ratings, exactly as on other chess sites — being quick is a different skill from being accurate. Your puzzle rating is separate again, and Replay is a points total rather than a rating.',
      },
    ],
  },
];

/** The curated articles, flattened. These drive the browsable topic chips. */
export const CURATED_ARTICLES = HELP_SECTIONS.flatMap(s =>
  s.articles.map(a => ({ ...a, sectionId: s.id, sectionTitle: s.title, audience: s.audience }))
);

/**
 * Everything the chat can ANSWER, curated first.
 *
 * The generated bank is every FAQ answer already written across the marketing
 * pages — far broader than the curated set, but written to sell rather than to
 * instruct. Curated entries are listed first so an exact-quality answer wins
 * ties, while the generated ones mean a question like "is the classroom free?"
 * still gets a real reply instead of "I don't know".
 */
export const ALL_ARTICLES = [
  ...CURATED_ARTICLES,
  ...GENERATED_ANSWERS.filter(g =>
    // Skip anything the curated set already covers, so the chat never offers
    // two answers to the same question.
    !CURATED_ARTICLES.some(c =>
      c.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
        === g.q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    )
  ),
];
