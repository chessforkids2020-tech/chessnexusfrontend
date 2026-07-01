import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Footer from "./components/Footer";
import UserLayout from "./components/UserLayout";
import AnalyticsTracker from "./components/AnalyticsTracker";
import UserDashboard from "./pages/UserDashboard";
import CoachOnboarding from "./pages/coach/CoachOnboarding";
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachStudentDetail from "./pages/coach/CoachStudentDetail";
import CoachAssignments from "./pages/coach/CoachAssignments";
import CoachSubscription from "./pages/coach/CoachSubscription";
import CoachAttendancePage from "./pages/coach/CoachAttendancePage";
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
import ArenaTournamentPage from "./pages/marketing/ArenaTournamentPage";
import ChessStudyPage from "./pages/marketing/ChessStudyPage";
import ChessCommunityPage from "./pages/marketing/ChessCommunityPage";

// Reports / complaints
import ReportPage from "./pages/ReportPage";
import MyReportsPage from "./pages/MyReportsPage";
import CoachRequests from "./pages/CoachRequests";
import AdminReports from "./pages/AdminReports";

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
import AdminUsersPage from './pages/AdminUsersPage';
import AdminContestPage from './pages/AdminContestPage';
import AdminMetricsPage from './pages/AdminMetricsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminMonthlyFocus from './pages/monthlyFocus/AdminMonthlyFocus';
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
import HealthyMix from './pages/HealthyMix';
import PuzzleDashboard from './pages/PuzzleDashboard';
import ThemesPicker from './pages/ThemesPicker';
import PiecesPicker from './pages/PiecesPicker';
import SignupRequestForm from './pages/SignupRequestForm';
import SignupRequests from './pages/SignupRequests';
import BestRacersPage from './pages/BestRacersPage';
import Games from './pages/game/Games';
import MasterGamesHome from './pages/masterGames/MasterGamesHome';
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
function ProtectedRoute({ children, requiredRole, noGuest }) {
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
    if (!allowed.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

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
          <UserLayout>
            <ContactPage />
          </UserLayout>
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
          <UserLayout>
            <FeaturesPage />
          </UserLayout>
        } />
        <Route path="/members" element={
          <UserLayout>
            <MembersPage />
          </UserLayout>
        } />
        <Route path="/privacy-policy" element={
          <UserLayout>
            <PrivacyPolicyPage />
          </UserLayout>
        } />
        <Route path="/terms" element={
          <UserLayout>
            <TermsPage />
          </UserLayout>
        } />
        <Route path="/refund-policy" element={
          <UserLayout>
            <RefundPolicyPage />
          </UserLayout>
        } />
        <Route path="/chess-puzzles" element={
          <UserLayout>
            <ChessPuzzlesPage />
          </UserLayout>
        } />
        <Route path="/chess-tactics-race" element={
          <UserLayout>
            <ChessTacticsRacePage />
          </UserLayout>
        } />
        <Route path="/play-chess-online" element={
          <UserLayout>
            <PlayChessOnlinePage />
          </UserLayout>
        } />
        <Route path="/play-chess-with-friends" element={
          <UserLayout>
            <PlayWithFriendsPage />
          </UserLayout>
        } />
        <Route path="/masters-chess-games" element={
          <UserLayout>
            <MastersGamesPage />
          </UserLayout>
        } />
        <Route path="/analyse-my-chess-game" element={
          <UserLayout>
            <AnalyseMyChessGamePage />
          </UserLayout>
        } />
        <Route path="/3d-chess-arena-tournament" element={
          <UserLayout>
            <ArenaTournamentPage />
          </UserLayout>
        } />
        <Route path="/chess-study" element={
          <UserLayout>
            <ChessStudyPage />
          </UserLayout>
        } />
        <Route path="/chess-community" element={
          <UserLayout>
            <ChessCommunityPage />
          </UserLayout>
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
            <ProtectedRoute>
              <CoachDashboard />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/coach/students/:studentLinkId" element={
          <UserLayout>
            <ProtectedRoute>
              <CoachStudentDetail />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/coach/assignments" element={
          <UserLayout>
            <ProtectedRoute>
              <CoachAssignments />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/coach/subscription" element={
          <UserLayout>
            <ProtectedRoute>
              <CoachSubscription />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/coach/attendance" element={
          <UserLayout>
            <ProtectedRoute>
              <CoachAttendancePage />
            </ProtectedRoute>
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
            <ProtectedRoute requiredRole={['elite', 'admin']}>
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
        <Route path="/social" element={
          <UserLayout>
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/social/chat" element={
          <UserLayout>
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
          </UserLayout>
        } />
        <Route path="/players" element={
          <UserLayout>
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
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
        <Route path="/study/endgames" element={
          <UserLayout>
            <ProtectedRoute>
              <StudyEndgamesPage />
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
