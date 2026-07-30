import React, { useState, useEffect } from "react";
import api from "./api";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Footer from "./components/Footer";
import UserLayout from "./components/UserLayout";
import MarketingLayout from "./components/MarketingLayout";
import AnalyticsTracker from "./components/AnalyticsTracker";
import UserDashboard from "./pages/UserDashboard";
import StudentProgressPage from "./pages/StudentProgressPage";
import CoachOnboarding from "./pages/coach/CoachOnboarding";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachStudentDetail from "./pages/coach/CoachStudentDetail";
import CoachAssignments from "./pages/coach/CoachAssignments";
import CourseBuilder from "./pages/coach/CourseBuilder";
import CoachLibrary from "./pages/coach/CoachLibrary";
import CourseProgress from "./pages/coach/CourseProgress";
import CoachSubscription from "./pages/coach/CoachSubscription";
import CoachAttendancePage from "./pages/coach/CoachAttendancePage";
import CoachSchedulePage from "./pages/coach/CoachSchedulePage";
import MyMeetingsPage from "./pages/coach/MyMeetingsPage";
import LiveClassroomPage from "./pages/coach/LiveClassroomPage";
import CoachActivities from "./pages/coach/CoachActivities";
import CoachBatches from "./pages/coach/CoachBatches";
import CoachProfile from "./pages/coach/CoachProfile";
import CoachArenaLive from "./pages/coach/CoachArenaLive";
import CoachArenaTournamentLive from "./pages/coach/CoachArenaTournamentLive";
import PublicProfile from "./pages/PublicProfile";
import UserAttendancePage from "./pages/UserAttendancePage";
import MyCoachPortal from "./pages/MyCoachPortal";

// Public SEO feature/about pages
import FeaturesPage from "./pages/marketing/FeaturesPage";
import MembersPage from "./pages/marketing/MembersPage";
import PrivacyPolicyPage from "./pages/marketing/PrivacyPolicyPage";
import TermsPage from "./pages/marketing/TermsPage";
import RefundPolicyPage from "./pages/marketing/RefundPolicyPage";
import ChessPuzzlesPage from "./pages/marketing/ChessPuzzlesPage";
import ChessTacticsRacePage from "./pages/marketing/ChessTacticsRacePage";
import PlayChessOnlinePage from "./pages/marketing/PlayChessOnlinePage";
import PlayWithFriendsPage from "./pages/marketing/PlayWithFriendsPage";
import MastersGamesPage from "./pages/marketing/MastersGamesPage";
import AnalyseMyChessGamePage from "./pages/marketing/AnalyseMyChessGamePage";
import ImproveAtChessPage from "./pages/marketing/ImproveAtChessPage";
import ChessCoachingPage from "./pages/marketing/ChessCoachingPage";
import FreeCoachPlanPage from "./pages/marketing/FreeCoachPlanPage";
import FreeChessClassesPage from "./pages/marketing/FreeChessClassesPage";
import AdminFreeClassRequests from "./pages/AdminFreeClassRequests";
import CoachGuidePage from "./pages/marketing/CoachGuidePage";
import CoachPricingPage from "./pages/marketing/CoachPricingPage";
import ChessAcademyPage from "./pages/marketing/ChessAcademyPage";
import ChessAcademyPricingPage from "./pages/marketing/ChessAcademyPricingPage";
import CoachReferralPage from "./pages/marketing/CoachReferralPage";
import CoachFaqPage from "./pages/marketing/CoachFaqPage";
import AcademyDashboard from "./pages/academy/AcademyDashboard";
import AcademyCoaches from "./pages/academy/AcademyCoaches";
import AcademyBilling from "./pages/academy/AcademyBilling";
import AcademyPayments from "./pages/academy/AcademyPayments";
import AcademySettings from "./pages/academy/AcademySettings";
import JoinAcademy from "./pages/academy/JoinAcademy";
import LiveClassroomMarketingPage from "./pages/marketing/LiveClassroomPage";
import EndgameTrainingPage from "./pages/marketing/EndgameTrainingPage";
import OpeningRepertoirePage from "./pages/marketing/OpeningRepertoirePage";
import ChessCoursesPage from "./pages/marketing/ChessCoursesPage";
import ProgressReportsPage from "./pages/marketing/ProgressReportsPage";
import ArenaTournamentPage from "./pages/marketing/ArenaTournamentPage";
import ChessStudyPage from "./pages/marketing/ChessStudyPage";
import ChessCommunityPage from "./pages/marketing/ChessCommunityPage";

// Reports / complaints
import ReportPage from "./pages/ReportPage";
import MyReportsPage from "./pages/MyReportsPage";
import CoachRequests from "./pages/CoachRequests";
import AdminReports from "./pages/AdminReports";
import AdminTestimonials from "./pages/AdminTestimonials";
import AdminFeedback from "./pages/AdminFeedback";

import ArenaTournamentDashboard from "./pages/ArenaTournamentDashboard";

// Monthly Focus pages
import MonthlyFocusList from "./pages/monthlyFocus/MonthlyFocusList";
import MonthlyFocusDashboard from "./pages/monthlyFocus/MonthlyFocusDashboard";
import FocusTaskPage from "./pages/monthlyPractice/FocusTaskPage";
import MonthlyFocusLeaderboard from "./pages/monthlyFocus/MonthlyFocusLeaderboard";
import EliteMonthlyFocus from "./pages/monthlyFocus/EliteMonthlyFocus";

import PuzzleTournament from "./pages/PuzzleTournament";
import Race from "./pages/Race";
import WaitingRoom from "./pages/WaitingRoom";
import PuzzleBoard from "./pages/PuzzleBoard";
import Scoreboard from "./pages/Scoreboard";
import RoundScoreboard from "./pages/RoundScoreboard";
import AdminDashboard from './pages/AdminDashboard';
import AdminEndgamesPage from './pages/AdminEndgamesPage';
import AdminSupporters from './pages/AdminSupporters';
import AdminCoaches from './pages/AdminCoaches';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminContestPage from './pages/AdminContestPage';
import AdminMetricsPage from './pages/AdminMetricsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminMonthlyFocus from './pages/monthlyFocus/AdminMonthlyFocus';
import AdminBlunderLibrary from './pages/AdminBlunderLibrary';
import StockfishTest from './pages/StockfishTest';
import IndividualResults from './pages/IndividualResults';
import Leaderboard from './pages/Leaderboard';
import TimedRace from './pages/TimedRace';
import ErrorBoundary from './components/ErrorBoundary';
import RaceResults from './pages/RaceResults';
import ChooseTopic from './pages/ChooseTopic';
import Racer from './pages/Racer';
import ArenaJoin from './pages/arena-race/ArenaJoin';
import ArenaCreate from './pages/arena-race/ArenaCreate';
import ArenaWaiting from './pages/arena-race/ArenaWaiting';
import ArenaRace from './pages/arena-race/ArenaRace';
import ArenaResult from './pages/arena-race/ArenaResult';
import ArenaAdmin from './pages/arena-race/ArenaAdmin';
import ArenaWaitingAdmin from './pages/arena-race/ArenaWaitingAdmin';
import ArenaTournament from './pages/arenatournament/ArenaTournament';
import ArenaTournamentCreate from './pages/arenatournament/ArenaTournamentCreate';
import ArenaTournamentJoin from './pages/arenatournament/ArenaTournamentJoin';
import ArenaTournamentLobby from './pages/arenatournament/ArenaTournamentLobby';
import ArenaTournamentLive from './pages/arenatournament/ArenaTournamentLive';
import ArenaTournamentLeaderboard from './pages/arenatournament/ArenaTournamentLeaderboard';
import ArenaTournamentGames from './pages/arenatournament/ArenaTournamentGames';
import UserGamesPage from './pages/UserGamesPage';
import ContestRules from './pages/ContestRules';
import ContactPage from './pages/ContactPage';
import BuyMeACoffee from './pages/BuyMeACoffee';
import EventForm from './pages/EventForm';
import EventRegistration from './pages/EventRegistration';
import EventPage from './pages/EventPage';
import EventSubmissions from './pages/EventSubmissions';
import StudyOverview from './pages/study/StudyOverview';
import StudyEndgamesPage from './pages/study/StudyEndgamesPage';
import EndgameChallengesPage from './pages/study/EndgameChallengesPage';
import BeginnersAcademyPage from './pages/study/beginners/BeginnersAcademyPage';
import StudySelection from './pages/study/StudySelection';
import StudyChapterSelection from './pages/study/StudyChapterSelection';
import StudyPuzzleView from './pages/study/StudyPuzzleView';
import StudyTest from './pages/study/StudyTest';
import StudyTestResult from './pages/study/StudyTestResult';
import TestTimeSelection from './pages/study/TestTimeSelection';
import TestMode from './pages/study/TestMode';
import TestChapterSelection from './pages/study/TestChapterSelection';
import TestChapterSelectionDetail from './pages/study/TestChapterSelectionDetail';
import StudyResult from './pages/study/StudyResult';
import AdminStudyManagement from './pages/study/AdminStudyManagement';
import AdminBookManagement from './pages/study/AdminBookManagement';
import BooksList from './pages/study/BooksList';
import BookContents from './pages/study/BookContents';
import BookReader from './pages/study/BookReader';
// New Test Puzzle System
import AdminTestManagement from './pages/test/AdminTestManagement';
import UserTestStudySelection from './pages/test/UserTestStudySelection';
import UserTestChapterSelection from './pages/test/UserTestChapterSelection';
import UserTestTimeSelection from './pages/test/UserTestTimeSelection';
import UserTestPlay from './pages/test/UserTestPlay';
import UserTestResult from './pages/test/UserTestResult';
import AdminTeamRace from './pages/TeamRace/AdminTeamRace';
import AdminTeamRaceManage from './pages/TeamRace/AdminTeamRaceManage';
import EliteTeamRace from './pages/TeamRace/EliteTeamRace';
import EliteTeamRaceManage from './pages/TeamRace/EliteTeamRaceManage';
import TeamRaceSelection from './pages/TeamRace/TeamRaceSelection';
import TeamSelection from './pages/TeamRace/TeamSelection';
import TeamLobby from './pages/TeamRace/TeamLobby';
import TeamRacePuzzle from './pages/TeamRace/TeamRacePuzzle';
import TeamRaceResults from './pages/TeamRace/TeamRaceResults';
import Chat from './pages/Chat';
import AdminAttendancePage from './pages/AdminAttendancePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResendVerificationPage from './pages/ResendVerificationPage';
import SocialHubPage from './pages/SocialHubPage';
import ClubsPage from './pages/ClubsPage';
import ClubDetailPage from './pages/ClubDetailPage';
import Puzzles from './pages/Puzzles';
import PuzzlesHub from './pages/PuzzlesHub';
import Training from './pages/Training';
import MyMoments from './pages/MyMoments';
import HealthyMix from './pages/HealthyMix';
import PuzzleDashboard from './pages/PuzzleDashboard';
import ThemesPicker from './pages/ThemesPicker';
import PiecesPicker from './pages/PiecesPicker';
import SignupRequestForm from './pages/SignupRequestForm';
import SignupRequests from './pages/SignupRequests';
import AdminTitleClaims from './pages/AdminTitleClaims';
import BestRacersPage from './pages/BestRacersPage';
import Games from './pages/game/Games';
import MasterGamesHome from './pages/masterGames/MasterGamesHome';
import OpeningRepertoire from './pages/OpeningRepertoire';
import MasterGamesBrowse from './pages/masterGames/MasterGamesBrowse';
import MasterPlayer from './pages/masterGames/MasterPlayer';
import ImmortalGames from './pages/masterGames/ImmortalGames';
import AllPlayers from './pages/masterGames/AllPlayers';
import Play from './pages/game/Play';
import PlayWithStockfish from './pages/game/PlayWithStockfish';
import GameAnalysis from './pages/GameAnalysis';
import ArcadeHome from './pages/arcade/ArcadeHome';
import ArcadeLobby from './pages/arcade/ArcadeLobby';
import TTTChoose from './pages/arcade/TTTChoose';
import BingoChoose from './pages/arcade/BingoChoose';
import ArcadeGame from './pages/arcade/ArcadeGame';
import FriendGame from './pages/game/FriendGame';
import LiveGame from './pages/game/LiveGame';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SupporterProvider } from './context/SupporterContext';
import { BoardThemeProvider } from './contexts/BoardThemeContext';
import { PieceThemeProvider } from './contexts/PieceThemeContext';
import SettingsPage from './pages/SettingsPage';
// Study Sparring + Position Creator
import StudyDuelCreate from './pages/study-sparring/StudyDuelCreate';
import StudyDuelWaiting from './pages/study-sparring/StudyDuelWaiting';
import StudyDuelBoard from './pages/study-sparring/StudyDuelBoard';
import CoachingRoomCreate from './pages/study-sparring/CoachingRoomCreate';
import CoachingRoomStudent from './pages/study-sparring/CoachingRoomStudent';
import StudySparringJoin from './pages/study-sparring/StudySparringJoin';
import PositionCreatorPage from './pages/PositionCreatorPage';
import MyStudiesPage from './pages/MyStudiesPage';
import PublicStudiesPage from './pages/PublicStudiesPage';
import UserStudyDetailPage from './pages/UserStudyDetailPage';
import UserStudyPuzzleView from './pages/UserStudyPuzzleView';
import SchedulePage from './pages/SchedulePage';
import AdminSchedulePage from './pages/AdminSchedulePage';

// Protected Route Component
function ProtectedRoute({ children, requiredRole, noGuest, allowCoach }) {
  const { user, loading } = useAuth();

  if (loading) {
    // Debug overlay to help troubleshoot persistent loading issues
    const showDebug = window.location.search.includes('debug=1');
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div>Loading authentication...</div>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          If this takes too long, try refreshing the page or <a href="/login">logging in again</a>
        </div>
        {showDebug && (
          <div style={{ marginTop: 20, padding: 12, border: '1px solid #eee', display: 'inline-block', textAlign: 'left' }}>
            <div><strong>DEBUG</strong></div>
            <div>loading: {String(loading)}</div>
            <div>token present: {String(!!localStorage.getItem('authToken'))}</div>
            <div>API_URL: {import.meta.env.VITE_API_URL}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>(Add ?debug=1 to URL to see this)</div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (noGuest && (user.role === 'guest' || user.isGuest)) {
    return <Navigate to="/login" state={{ message: 'Please log in or create a free account to access this feature.' }} replace />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    // allowCoach lets any coach through a role-gated route (e.g. Monthly Focus,
    // where a free coach gets a one-time create — the backend enforces the rule).
    const coachOk = allowCoach && user.isCoach;
    if (!allowed.includes(user.role) && !coachOk) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

/**
 * CoachRoute — everything under /coach/* except onboarding.
 *
 * ProtectedRoute only checks "is logged in", so ANY signed-in student could open
 * the coach dashboard, batches, assignments and subscription pages just by typing
 * the URL. The backend does enforce isCoach (requireCoachRole), so no student data
 * ever leaked — but the shell rendered, which is confusing and looks broken.
 *
 * Non-coaches are sent to onboarding, which is the page that actually explains what
 * coaching is and how to start. Already-onboarded coaches are unaffected.
 */
function CoachRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const inCoachArea = location.pathname.startsWith('/coach/') && location.pathname !== '/coach/onboarding';

  // The auth-context `user.isCoach` can be briefly stale right after navigation,
  // which made this guard bounce a real coach to /coach/onboarding while the page
  // itself (fresh /api/coach/status) disagreed → the screen flickered. To avoid
  // that, resolve coach + academy state from the SAME fresh API here, once, and
  // hold a loading state until we know. Never redirect on the stale context flag.
  const [checked, setChecked] = React.useState(false);
  const [state, setState] = React.useState({ isCoach: false, noToolsOwner: false });

  React.useEffect(() => {
    // Only guests / logged-out are decided synchronously below; everyone else
    // waits for the fresh status.
    if (!user || user.isGuest || user.role === 'guest') { setChecked(true); return; }
    if (user.role === 'admin') { setState({ isCoach: true, noToolsOwner: false }); setChecked(true); return; }
    let alive = true;
    (async () => {
      let isCoach = false, noToolsOwner = false;
      try {
        const s = await api.get('/api/coach/status');
        isCoach = !!s.data?.isCoach;
        if (isCoach && inCoachArea) {
          try {
            const me = await api.get('/api/academy/me');
            noToolsOwner = !!(me.data?.isOwner && me.data?.usesCoachingTools === false);
          } catch { /* not an academy member */ }
        }
      } catch { /* status failed — treat as not-a-coach */ }
      if (alive) { setState({ isCoach, noToolsOwner }); setChecked(true); }
    })();
    return () => { alive = false; };
  }, [user, inCoachArea]);

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'guest' || user.isGuest) {
    return <Navigate to="/login" state={{ message: 'Please log in to access coach tools.' }} replace />;
  }
  // Hold until the fresh status resolves — prevents redirecting on stale data.
  if (!checked) return <div style={{ textAlign: 'center', padding: 50 }}>Loading…</div>;
  if (!state.isCoach && user.role !== 'admin') return <Navigate to="/coach/onboarding" replace />;
  if (state.noToolsOwner) return <Navigate to="/academy/overview" replace />;
  return children;
}

// AcademyGate: academy pages require an ACTIVE academy plan. Until the academy
// pays, everything except Billing + Settings redirects to Billing (pay first).
// `allowUnpaid` pages (Billing, Settings) render regardless so they can pay /
// see status.
function AcademyGate({ children, allowUnpaid = false }) {
  const { user, loading } = useAuth();
  const [me, setMe] = React.useState(undefined); // undefined = loading

  React.useEffect(() => {
    let alive = true;
    api.get('/api/academy/me').then(r => { if (alive) setMe(r.data || null); }).catch(() => { if (alive) setMe(null); });
    return () => { alive = false; };
  }, []);

  if (loading || me === undefined) return <div style={{ textAlign: 'center', padding: 50 }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Not an academy owner at all → shouldn't be here; send to coach dashboard.
  if (!me?.academy || !me?.isOwner) return <Navigate to="/coach/dashboard" replace />;

  const paid = me.academy.planStatus === 'active';
  if (!paid && !allowUnpaid) return <Navigate to="/academy/billing" replace />;
  return children;
}

// Guest-allowed Route: like ProtectedRoute, but auto-creates a guest account if not logged in.
// Use for pages that allow non-authenticated users to participate (auto-scheduled races/tournaments).
function GuestAllowedRoute({ children }) {
  const { user, loading, loginAsGuest } = useAuth();
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [guestError, setGuestError] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (creatingGuest) return;
    setCreatingGuest(true);
    loginAsGuest()
      .catch(err => setGuestError(err?.message || 'Failed to create guest'))
      .finally(() => setCreatingGuest(false));
  }, [user, loading, creatingGuest, loginAsGuest]);

  if (loading || creatingGuest || (!user && !guestError)) {
    return <div style={{ textAlign: 'center', padding: 50 }}>Setting up guest session…</div>;
  }
  if (guestError && !user) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <div style={{ marginBottom: 12, color: '#ef4444' }}>Could not create guest session.</div>
        <a href="/login" style={{ color: '#06b6d4' }}>Log in instead →</a>
      </div>
    );
  }
  return children;
}

function ChatRedirect() {
  const location = useLocation();
  return <Navigate to={`/social/chat${location.search || ''}`} replace />;
}

// Inner wrapper so BoardThemeProvider and PieceThemeProvider can access the authenticated user id
function AppWithTheme({ children }) {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  return (
    <BoardThemeProvider userId={userId}>
      <PieceThemeProvider userId={userId}>
        {children}
      </PieceThemeProvider>
    </BoardThemeProvider>
  );
}

// Styles object
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f5f5dc",
    fontFamily: "Poppins, sans-serif",
  },
  content: {
    flex: 1,
    padding: "0",
    margin: "0",
  },
};


export default function App() {
  return (
    <AuthProvider>
      <SupporterProvider>
        <AppWithTheme>
        <AnalyticsTracker />
        <Routes>
        {/* Routes WITHOUT side navigator */}
        <Route path="/" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <HomePage />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/schedule" element={<SchedulePage />} />
        {/* Public player profile — no login required; uses the SAME UserDashboard layout */}
        <Route path="/player/:displayName" element={
          <UserLayout>
            <UserDashboard />
          </UserLayout>
        } />
        {/* Parent progress report — tokenized, read-only, shareable link */}
        <Route path="/progress/:token" element={<StudentProgressPage />} />
        {/* Public player Puzzle Dashboard — spectators can view another user's */}
        <Route path="/player/:displayName/puzzle-dashboard" element={
          <UserLayout>
            <PuzzleDashboard />
          </UserLayout>
        } />
        {/* Public player games — no login required */}
        <Route path="/player/:displayName/games" element={
          <UserLayout>
            <UserGamesPage />
          </UserLayout>
        } />
        <Route path="/contest-rules" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ContestRules />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/contact" element={
          <MarketingLayout>
            <ContactPage />
          </MarketingLayout>
        } />
        {/* Reports / complaints */}
        <Route path="/report" element={
          <UserLayout>
            <ReportPage />
          </UserLayout>
        } />
        <Route path="/my-reports" element={
          <UserLayout>
            <ProtectedRoute>
              <MyReportsPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/coach-requests" element={
          <UserLayout>
            <ProtectedRoute>
              <CoachRequests />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/arena-tournament-dashboard" element={
          <ProtectedRoute>
            <ArenaTournamentDashboard />
          </ProtectedRoute>
        } />
        {/* Spectator view — another player's tournament dashboard (public) */}
        <Route path="/arena-tournament-dashboard/:displayName" element={
          <ArenaTournamentDashboard />
        } />
        {/* Public SEO feature/about pages */}
        <Route path="/features" element={
          <MarketingLayout>
            <FeaturesPage />
          </MarketingLayout>
        } />
        <Route path="/members" element={
          <UserLayout>
            <MembersPage />
          </UserLayout>
        } />
        <Route path="/privacy-policy" element={
          <MarketingLayout>
            <PrivacyPolicyPage />
          </MarketingLayout>
        } />
        <Route path="/terms" element={
          <MarketingLayout>
            <TermsPage />
          </MarketingLayout>
        } />
        <Route path="/refund-policy" element={
          <MarketingLayout>
            <RefundPolicyPage />
          </MarketingLayout>
        } />
        <Route path="/chess-puzzles" element={
          <MarketingLayout>
            <ChessPuzzlesPage />
          </MarketingLayout>
        } />
        <Route path="/chess-tactics-race" element={
          <MarketingLayout>
            <ChessTacticsRacePage />
          </MarketingLayout>
        } />
        <Route path="/play-chess-online" element={
          <MarketingLayout>
            <PlayChessOnlinePage />
          </MarketingLayout>
        } />
        <Route path="/play-chess-with-friends" element={
          <MarketingLayout>
            <PlayWithFriendsPage />
          </MarketingLayout>
        } />
        <Route path="/masters-chess-games" element={
          <MarketingLayout>
            <MastersGamesPage />
          </MarketingLayout>
        } />
        <Route path="/analyse-my-chess-game" element={
          <MarketingLayout>
            <AnalyseMyChessGamePage />
          </MarketingLayout>
        } />
        <Route path="/improve-at-chess" element={
          <MarketingLayout>
            <ImproveAtChessPage />
          </MarketingLayout>
        } />
        <Route path="/chess-coaching" element={
          <MarketingLayout>
            <ChessCoachingPage />
          </MarketingLayout>
        } />
        <Route path="/free-chess-coaching-software" element={
          <MarketingLayout>
            <FreeCoachPlanPage />
          </MarketingLayout>
        } />
        <Route path="/free-chess-classes-for-kids" element={
          <MarketingLayout>
            <FreeChessClassesPage />
          </MarketingLayout>
        } />
        <Route path="/chess-coach-guide" element={
          <MarketingLayout>
            <CoachGuidePage />
          </MarketingLayout>
        } />
        <Route path="/chess-coach-pricing" element={
          <MarketingLayout>
            <CoachPricingPage />
          </MarketingLayout>
        } />
        {/* Academies / institutes: the feature story + public pricing. The in-app
            /academy/* pages are owner-gated, so these are the only way a
            prospective academy can see how it works and what it costs. */}
        <Route path="/chess-academy-software" element={
          <MarketingLayout>
            <ChessAcademyPage />
          </MarketingLayout>
        } />
        <Route path="/chess-academy-pricing" element={
          <MarketingLayout>
            <ChessAcademyPricingPage />
          </MarketingLayout>
        } />
        <Route path="/chess-coach-referral" element={
          <MarketingLayout>
            <CoachReferralPage />
          </MarketingLayout>
        } />
        <Route path="/chess-coaching-questions" element={
          <MarketingLayout>
            <CoachFaqPage />
          </MarketingLayout>
        } />
        <Route path="/live-chess-classroom" element={
          <MarketingLayout>
            <LiveClassroomMarketingPage />
          </MarketingLayout>
        } />
        <Route path="/chess-endgame-training" element={
          <MarketingLayout>
            <EndgameTrainingPage />
          </MarketingLayout>
        } />
        <Route path="/chess-opening-repertoire" element={
          <MarketingLayout>
            <OpeningRepertoirePage />
          </MarketingLayout>
        } />
        <Route path="/chess-courses" element={
          <MarketingLayout>
            <ChessCoursesPage />
          </MarketingLayout>
        } />
        <Route path="/chess-progress-reports" element={
          <MarketingLayout>
            <ProgressReportsPage />
          </MarketingLayout>
        } />
        <Route path="/3d-chess-arena-tournament" element={
          <MarketingLayout>
            <ArenaTournamentPage />
          </MarketingLayout>
        } />
        <Route path="/chess-study" element={
          <MarketingLayout>
            <ChessStudyPage />
          </MarketingLayout>
        } />
        <Route path="/chess-community" element={
          <MarketingLayout>
            <ChessCommunityPage />
          </MarketingLayout>
        } />
        <Route path="/settings" element={
          <UserLayout>
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/buy-coffee" element={
          <UserLayout>
            <BuyMeACoffee />
          </UserLayout>
        } />
        {/* event listing and registration use an id parameter */}
        <Route path="/event/:eventId" element={
          <UserLayout>
            <EventRegistration />
          </UserLayout>
        } />
        <Route path="/event/:eventId/register" element={
          <UserLayout>
            <EventRegistration />
          </UserLayout>
        } />

        {/* Admin routes WITHOUT side navigator */}
        <Route path="/admin" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/free-class-requests" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminFreeClassRequests />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/signup-requests" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <SignupRequests />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/title-claims" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminTitleClaims />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/event-submissions" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <EventSubmissions />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/users" element={
          <div style={styles.container}>

            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminUsersPage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/reports" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminReports />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/testimonials" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminTestimonials />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/feedback" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminFeedback />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/supporters" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminSupporters />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/coaches" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminCoaches />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/endgames" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminEndgamesPage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/contest" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminContestPage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/metrics" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminMetricsPage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/analytics" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminAnalyticsPage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/monthly-focus" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminMonthlyFocus />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/blunder-library" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminBlunderLibrary />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/attendance" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminAttendancePage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/arena" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <ArenaAdmin />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/arena/waiting/:roomId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <ArenaWaitingAdmin />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/arena/live/:roomId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <ArenaRace isAdminView={true} />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/arena/result/:roomId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <ArenaResult isAdminView={true} />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/studies" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminStudyManagement />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/books" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminBookManagement />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/schedule" element={
          <ProtectedRoute requiredRole="admin">
            <AdminSchedulePage />
          </ProtectedRoute>
        } />
        <Route path="/admin/team-race" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminTeamRace />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/team-race/:raceId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminTeamRaceManage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/admin/team-race/:raceId/results" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <TeamRaceResults />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/elite/team-race" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="elite">
                <EliteTeamRace />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/elite/team-race/:raceId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="elite">
                <EliteTeamRaceManage />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/elite/team-race/:raceId/results" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="elite">
                <TeamRaceResults />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/racer" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <Racer />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />

        {/* Chessboard and Result pages WITHOUT side navigator */}
        <Route path="/waiting/:roundId/:batchId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <WaitingRoom />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/puzzle/:roundId/:batchId/:puzzleId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <PuzzleBoard />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/results/:batchId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <IndividualResults />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/leaderboard/:batchId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <Leaderboard />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/arena/result/:roomId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute>
                <ArenaResult />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/team-race/:raceId/results" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute>
                <TeamRaceResults />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/study/result/:resultId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute>
                <StudyResult />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/study/test/result/:resultId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <ProtectedRoute>
                <StudyTestResult />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/scoreboard" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <Scoreboard />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/scoreboard/round/:roundNumber" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <RoundScoreboard />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/bestracers" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <BestRacersPage />
            </div>
            <Footer />
          </div>
        } />

        {/* Routes WITH side navigator */}
        <Route path="/login" element={
          <UserLayout showFooter={false}>
            <LoginPage />
          </UserLayout>
        } />
        <Route path="/signup-request" element={
          <UserLayout>
            <SignupRequestForm />
          </UserLayout>
        } />
        <Route path="/puzzles-hub" element={
          <UserLayout>
            <PuzzlesHub />
          </UserLayout>
        } />
        <Route path="/dashboard" element={
          <UserLayout>
            <ProtectedRoute noGuest>
              <UserDashboard />
            </ProtectedRoute>
          </UserLayout>
        } />

        {/* ── Coach Tools ───────────────────────────── */}
        <Route path="/coach/onboarding" element={
          <UserLayout>
            <ProtectedRoute>
              <CoachOnboarding />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/coach/dashboard" element={
          <UserLayout>
            <CoachRoute>
              <CoachDashboard />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/academy/dashboard" element={<Navigate to="/academy/overview" replace />} />
        <Route path="/academy/overview" element={
          <UserLayout><CoachRoute><AcademyGate><AcademyDashboard /></AcademyGate></CoachRoute></UserLayout>
        } />
        <Route path="/academy/coaches" element={
          <UserLayout><CoachRoute><AcademyGate><AcademyCoaches /></AcademyGate></CoachRoute></UserLayout>
        } />
        <Route path="/academy/billing" element={
          <UserLayout><CoachRoute><AcademyGate allowUnpaid><AcademyBilling /></AcademyGate></CoachRoute></UserLayout>
        } />
        <Route path="/academy/payments" element={
          <UserLayout><CoachRoute><AcademyGate><AcademyPayments /></AcademyGate></CoachRoute></UserLayout>
        } />
        <Route path="/academy/settings" element={
          <UserLayout><CoachRoute><AcademyGate allowUnpaid><AcademySettings /></AcademyGate></CoachRoute></UserLayout>
        } />
        <Route path="/join-academy/:code" element={
          <UserLayout>
            <CoachRoute>
              <JoinAcademy />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/students/:studentLinkId" element={
          <UserLayout>
            <CoachRoute>
              <CoachStudentDetail />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/assignments" element={
          <UserLayout>
            <CoachRoute>
              <CoachAssignments />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/courses" element={
          <UserLayout>
            <CoachRoute>
              <CourseBuilder />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/library" element={
          <UserLayout>
            <CoachRoute>
              <CoachLibrary />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/courses/:courseId/progress" element={
          <UserLayout>
            <CoachRoute>
              <CourseProgress />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/subscription" element={
          <UserLayout>
            <CoachRoute>
              <CoachSubscription />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/attendance" element={
          <UserLayout>
            <CoachRoute>
              <CoachAttendancePage />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/schedule" element={
          <UserLayout>
            <CoachRoute>
              <CoachSchedulePage />
            </CoachRoute>
          </UserLayout>
        } />
        {/* Live Classroom — host-only meeting management + live session. Route
            visibility is gated in the sidebar by canHostLiveClassroom; the API
            enforces it server-side (requireLiveClassroomHost). */}
        <Route path="/coach/live" element={
          <UserLayout>
            <CoachRoute>
              <MyMeetingsPage />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/live/session/:sessionId" element={
          <CoachRoute>
            <LiveClassroomPage mode="host" />
          </CoachRoute>
        } />
        {/* Student join-by-shareable-link (server checks student audience). */}
        <Route path="/join/:joinCode" element={
          <ProtectedRoute>
            <LiveClassroomPage mode="join" />
          </ProtectedRoute>
        } />
        <Route path="/coach/activities" element={
          <UserLayout>
            <CoachRoute>
              <CoachActivities />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/batches" element={
          <UserLayout>
            <CoachRoute>
              <CoachBatches />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/profile" element={
          <UserLayout>
            <CoachRoute>
              <CoachProfile />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/arena/:roomId" element={
          <UserLayout>
            <CoachRoute>
              <CoachArenaLive />
            </CoachRoute>
          </UserLayout>
        } />
        <Route path="/coach/arena-tournament/:id" element={
          <UserLayout>
            <CoachRoute>
              <CoachArenaTournamentLive />
            </CoachRoute>
          </UserLayout>
        } />

        {/* Monthly Focus Routes */}
        <Route path="/monthly-focus" element={
          <UserLayout>
            <ProtectedRoute noGuest>
              <MonthlyFocusList />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/monthly-focus/task/:dayNumber" element={
          <UserLayout>
            <ProtectedRoute noGuest>
              <FocusTaskPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/monthly-focus/leaderboard" element={
          <UserLayout>
            <MonthlyFocusLeaderboard />
          </UserLayout>
        } />
        {/* Dynamic: /monthly-focus/:focusId — MUST come after static segments above */}
        <Route path="/monthly-focus/:focusId" element={
          <UserLayout>
            <ProtectedRoute noGuest>
              <MonthlyFocusDashboard />
            </ProtectedRoute>
          </UserLayout>
        } />

        {/* Elite Monthly Focus — create & manage challenges (elite + admin only) */}
        <Route path="/elite-monthly-focus" element={
          <UserLayout>
            <ProtectedRoute requiredRole={['elite', 'admin']} allowCoach>
              <EliteMonthlyFocus />
            </ProtectedRoute>
          </UserLayout>
        } />
        
        <Route path="/game-analysis" element={
          <UserLayout>
            <GameAnalysis />
          </UserLayout>
        } />
        <Route path="/attendance" element={
          <UserLayout>
            <ProtectedRoute>
              <UserAttendancePage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/my-coach" element={
          <UserLayout>
            <ProtectedRoute>
              <MyCoachPortal />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="/chat" element={<ChatRedirect />} />
        {/* Social Hub landing (defaults to Players tab) is open to everyone —
            signed-out visitors get an auto-guest session and a read-only view. */}
        <Route path="/social" element={
          <UserLayout>
            <GuestAllowedRoute>
              <SocialHubPage />
            </GuestAllowedRoute>
          </UserLayout>
        } />
        <Route path="/social/chat" element={
          <UserLayout>
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        {/* Players tab is open to everyone (social proof). Non-signed-in
            visitors get an auto-guest session; SocialHubPage shows a read-only
            Players view + sign-up banner for guests. */}
        <Route path="/players" element={
          <UserLayout>
            <GuestAllowedRoute>
              <SocialHubPage />
            </GuestAllowedRoute>
          </UserLayout>
        } />
        <Route path="/invite" element={
          <UserLayout>
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/friends" element={
          <UserLayout>
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/clubs" element={
          <UserLayout>
            <ProtectedRoute>
              <ClubsPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/clubs/:clubId" element={
          <UserLayout>
            <ProtectedRoute>
              <ClubDetailPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/games" element={
          <UserLayout>
            <Games />
          </UserLayout>
        } />
        <Route path="/master-games" element={
          <UserLayout>
            <MasterGamesHome />
          </UserLayout>
        } />
        <Route path="/repertoire" element={
          <UserLayout>
            <ProtectedRoute>
              <OpeningRepertoire />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/master-games/browse" element={
          <UserLayout>
            <MasterGamesBrowse />
          </UserLayout>
        } />
        <Route path="/master-games/immortal" element={
          <UserLayout>
            <ImmortalGames />
          </UserLayout>
        } />
        <Route path="/master-games/players" element={
          <UserLayout>
            <AllPlayers />
          </UserLayout>
        } />
        <Route path="/master-games/player/:name" element={
          <UserLayout>
            <MasterPlayer />
          </UserLayout>
        } />
        <Route path="/arcade" element={<ArcadeHome />} />
        <Route path="/arcade/lobby" element={<ArcadeLobby />} />
        <Route path="/arcade/ttt" element={<TTTChoose />} />
        <Route path="/arcade/bingo" element={<BingoChoose />} />
        <Route path="/arcade/game" element={<ArcadeGame />} />

        {/* Play with a Friend — guest-accessible (like arcade). /friend/new = create. */}
        <Route path="/friend/new" element={<FriendGame />} />
        <Route path="/friend/:code" element={<FriendGame />} />

        <Route path="/play" element={
          <UserLayout>
            <ProtectedRoute>
              <Play />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/play/ai" element={
          <UserLayout>
            <PlayWithStockfish />
          </UserLayout>
        } />
        <Route path="/game/live/:gameId" element={
          <UserLayout>
            <ProtectedRoute>
              <LiveGame />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/puzzle-tournament" element={
          <UserLayout>
            <ProtectedRoute>
              <PuzzleTournament />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/puzzles" element={
          <UserLayout>
            <ProtectedRoute>
              <Puzzles />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/training" element={
          <UserLayout>
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/training/healthy-mix" element={
          <UserLayout>
            <ProtectedRoute>
              <HealthyMix />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/training/my-moments" element={
          <UserLayout>
            <ProtectedRoute>
              <MyMoments />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/puzzle-dashboard" element={
          <UserLayout>
            <ProtectedRoute>
              <PuzzleDashboard />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/puzzles/themes" element={
          <UserLayout>
            <ProtectedRoute>
              <ThemesPicker />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/puzzles/pieces" element={
          <UserLayout>
            <ProtectedRoute>
              <PiecesPicker />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/daily-puzzles" element={
          <UserLayout>
            <ProtectedRoute>
              <Puzzles />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/choose-topic" element={
          <UserLayout>
            <ChooseTopic />
          </UserLayout>
        } />
        <Route path="/race" element={
          <UserLayout>
            <ErrorBoundary>
              <Race />
            </ErrorBoundary>
          </UserLayout>
        } />
        <Route path="/timed-race" element={
          <UserLayout>
            <ErrorBoundary>
              <TimedRace />
            </ErrorBoundary>
          </UserLayout>
        } />
        <Route path="/racer-results" element={
          <UserLayout>
            <RaceResults />
          </UserLayout>
        } />
        <Route path="/stockfish-test" element={
          <UserLayout>
            <StockfishTest />
          </UserLayout>
        } />

        <Route path="/arena" element={
          <UserLayout>
            <GuestAllowedRoute>
              <ArenaJoin />
            </GuestAllowedRoute>
          </UserLayout>
        } />
        <Route path="/arena/join" element={
          <UserLayout>
            <GuestAllowedRoute>
              <ArenaJoin />
            </GuestAllowedRoute>
          </UserLayout>
        } />
        <Route path="/arena/create" element={
          <UserLayout>
            <ProtectedRoute>
              <ArenaCreate />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/arena/waiting/:roomId" element={
          <UserLayout>
            <GuestAllowedRoute>
              <ArenaWaiting />
            </GuestAllowedRoute>
          </UserLayout>
        } />
        <Route path="/arena/race/:roomId" element={
          <div style={styles.container}>
            
            <div style={styles.content}>
              <GuestAllowedRoute>
                <ArenaRace />
              </GuestAllowedRoute>
            </div>
            <Footer />
          </div>
        } />

        {/* Arena Tournament routes */}
        <Route path="/arenatournament" element={
          <UserLayout>
            <GuestAllowedRoute>
              <ArenaTournament />
            </GuestAllowedRoute>
          </UserLayout>
        } />
        <Route path="/arenatournament/create" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute>
                <ArenaTournamentCreate />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/arenatournament/join" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <GuestAllowedRoute>
                <ArenaTournamentJoin />
              </GuestAllowedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/arenatournament/lobby/:tournamentId" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <GuestAllowedRoute>
                <ArenaTournamentLobby />
              </GuestAllowedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/arenatournament/live/:tournamentId" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <GuestAllowedRoute>
                <ArenaTournamentLive />
              </GuestAllowedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/arenatournament/leaderboard/:tournamentId" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ArenaTournamentLeaderboard />
            </div>
            <Footer />
          </div>
        } />
        <Route path="/arenatournament/games/:tournamentId" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ArenaTournamentGames />
            </div>
            <Footer />
          </div>
        } />

        {/* Team Race routes WITH side navigator */}
        <Route path="/team-race" element={
          <GuestAllowedRoute>
            <UserLayout>
              <TeamRaceSelection />
            </UserLayout>
          </GuestAllowedRoute>
        } />
        <Route path="/team-race/:raceId/teams" element={
          <GuestAllowedRoute>
            <UserLayout>
              <TeamSelection />
            </UserLayout>
          </GuestAllowedRoute>
        } />
        <Route path="/team-race/:raceId/lobby" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <GuestAllowedRoute>
                <TeamLobby />
              </GuestAllowedRoute>
            </div>
            <Footer />
          </div>
        } />
        <Route path="/team-race/:raceId/race" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <GuestAllowedRoute>
                <TeamRacePuzzle />
              </GuestAllowedRoute>
            </div>
            <Footer />
          </div>
        } />

        {/* Study routes WITH side navigator */}
        <Route path="/study" element={
          <UserLayout>
            <StudyOverview />
          </UserLayout>
        } />
        <Route path="/study/beginners" element={
          <UserLayout>
            <ProtectedRoute>
              <BeginnersAcademyPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/endgames" element={
          <UserLayout>
            <ProtectedRoute>
              <StudyEndgamesPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/endgame-challenges" element={
          <UserLayout>
            <ProtectedRoute>
              <EndgameChallengesPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/learn" element={
          <UserLayout>
            <ProtectedRoute>
              <StudySelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/learn/:studyId" element={
          <UserLayout>
            <ProtectedRoute>
              <StudyChapterSelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/books" element={
          <UserLayout>
            <ProtectedRoute>
              <BooksList />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/books/:id" element={
          <UserLayout>
            <ProtectedRoute>
              <BookContents />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/books/:id/node/:nodeId" element={
          <UserLayout>
            <ProtectedRoute>
              <BookReader />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/chapter/:studyId/:chapterId" element={
          <ProtectedRoute>
            <StudyPuzzleView />
          </ProtectedRoute>
        } />
        <Route path="/study/test/chapters/:studyId" element={
          <UserLayout>
            <ProtectedRoute>
              <TestChapterSelectionDetail />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/test" element={
          <UserLayout>
            <ProtectedRoute>
              <TestChapterSelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/test/time" element={
          <UserLayout>
            <ProtectedRoute>
              <TestTimeSelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/study/test/start" element={
          <UserLayout>
            <ProtectedRoute>
              <TestMode />
            </ProtectedRoute>
          </UserLayout>
        } />

        {/* ===== NEW TEST PUZZLE SYSTEM ROUTES ===== */}
        {/* Admin Test Management */}
        <Route path="/admin/test-management" element={
          <div style={styles.container}>
            <div style={styles.content}>
              <ProtectedRoute requiredRole="admin">
                <AdminTestManagement />
              </ProtectedRoute>
            </div>
            <Footer />
          </div>
        } />

        {/* User Test Routes */}
        <Route path="/test" element={
          <UserLayout>
            <ProtectedRoute>
              <UserTestStudySelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/test/chapters/:studyId" element={
          <UserLayout>
            <ProtectedRoute>
              <UserTestChapterSelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/test/time/:studyId/:chapterId" element={
          <UserLayout>
            <ProtectedRoute>
              <UserTestTimeSelection />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/test/play/:studyId/:chapterId" element={
          <ProtectedRoute>
            <UserTestPlay />
          </ProtectedRoute>
        } />
        <Route path="/test/result/:resultId" element={
          <UserLayout>
            <ProtectedRoute>
              <UserTestResult />
            </ProtectedRoute>
          </UserLayout>
        } />

        {/* ===== STUDY SPARRING ROUTES ===== */}
        <Route path="/study/sparring/join" element={
          <ProtectedRoute>
            <StudySparringJoin />
          </ProtectedRoute>
        } />
        <Route path="/study/sparring/duel/create" element={
          <ProtectedRoute>
            <StudyDuelCreate />
          </ProtectedRoute>
        } />
        <Route path="/study/sparring/duel/wait/:roomCode" element={
          <ProtectedRoute>
            <StudyDuelWaiting />
          </ProtectedRoute>
        } />
        <Route path="/study/sparring/duel/:roomCode" element={
          <ProtectedRoute>
            <StudyDuelBoard />
          </ProtectedRoute>
        } />
        <Route path="/study/sparring/coaching/create" element={
          <ProtectedRoute>
            <CoachingRoomCreate />
          </ProtectedRoute>
        } />
        <Route path="/study/sparring/coaching/:roomCode" element={
          <ProtectedRoute>
            <CoachingRoomStudent />
          </ProtectedRoute>
        } />

        {/* ===== POSITION CREATOR & MY PUZZLES ===== */}
        <Route path="/create-position" element={
          <ProtectedRoute>
            <PositionCreatorPage />
          </ProtectedRoute>
        } />
        {/* /my-puzzles removed — saved positions live under My Studies now. */}
        <Route path="/my-puzzles" element={<Navigate to="/my-studies" replace />} />

        {/* ===== MY STUDIES (PRIVATE + PUBLIC) ===== */}
        <Route path="/my-studies" element={
          <UserLayout>
            <ProtectedRoute>
              <MyStudiesPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/my-studies/:id" element={
          <UserLayout>
            <ProtectedRoute>
              <UserStudyDetailPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/my-studies/:id/chapter/:chapterId" element={
          <ProtectedRoute>
            <UserStudyPuzzleView />
          </ProtectedRoute>
        } />

        {/* ===== PUBLIC USER STUDIES ===== */}
        <Route path="/public-studies" element={
          <UserLayout>
            <ProtectedRoute>
              <PublicStudiesPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/public-studies/:id" element={
          <UserLayout>
            <ProtectedRoute>
              <UserStudyDetailPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/public-studies/:id/chapter/:chapterId" element={
          <ProtectedRoute>
            <UserStudyPuzzleView />
          </ProtectedRoute>
        } />
      </Routes>
      </AppWithTheme>
      </SupporterProvider>
    </AuthProvider>
  );
}
