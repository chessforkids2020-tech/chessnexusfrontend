import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import UserAvatar from './UserAvatar';
import { useAuth } from '../contexts/AuthContext';


function getCountryCode(country) {
  if (!country) return '';
  const trimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const nameToCode = {
    'Afghanistan':'AF','Albania':'AL','Algeria':'DZ','Angola':'AO','Argentina':'AR',
    'Armenia':'AM','Australia':'AU','Austria':'AT','Azerbaijan':'AZ','Bahrain':'BH',
    'Bangladesh':'BD','Belarus':'BY','Belgium':'BE','Bolivia':'BO','Brazil':'BR',
    'Bulgaria':'BG','Cambodia':'KH','Canada':'CA','Chile':'CL','China':'CN',
    'Colombia':'CO','Croatia':'HR','Cuba':'CU','Czechia':'CZ','Czech Republic':'CZ',
    'Denmark':'DK','Ecuador':'EC','Egypt':'EG','England':'GB','Ethiopia':'ET',
    'Finland':'FI','France':'FR','Georgia':'GE','Germany':'DE','Ghana':'GH',
    'Greece':'GR','Hungary':'HU','Iceland':'IS','India':'IN','Indonesia':'ID',
    'Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL','Italy':'IT',
    'Jamaica':'JM','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ','Kenya':'KE',
    'Kuwait':'KW','Kyrgyzstan':'KG','Latvia':'LV','Lebanon':'LB','Lithuania':'LT',
    'Malaysia':'MY','Mexico':'MX','Moldova':'MD','Mongolia':'MN','Morocco':'MA',
    'Myanmar':'MM','Nepal':'NP','Netherlands':'NL','New Zealand':'NZ','Nigeria':'NG',
    'Norway':'NO','Pakistan':'PK','Paraguay':'PY','Peru':'PE','Philippines':'PH',
    'Poland':'PL','Portugal':'PT','Qatar':'QA','Romania':'RO','Russia':'RU',
    'Saudi Arabia':'SA','Senegal':'SN','Serbia':'RS','Singapore':'SG','Slovakia':'SK',
    'Slovenia':'SI','South Africa':'ZA','South Korea':'KR','Spain':'ES',
    'Sri Lanka':'LK','Sweden':'SE','Switzerland':'CH','Syria':'SY','Taiwan':'TW',
    'Tajikistan':'TJ','Tanzania':'TZ','Thailand':'TH','Tunisia':'TN','Turkey':'TR',
    'Turkmenistan':'TM','Uganda':'UG','Ukraine':'UA','United Arab Emirates':'AE',
    'UAE':'AE','United Kingdom':'GB','UK':'GB','United States':'US','USA':'US',
    'United States of America':'US','Uruguay':'UY','Uzbekistan':'UZ',
    'Venezuela':'VE','Vietnam':'VN','Yemen':'YE','Zimbabwe':'ZW',
  };
  return nameToCode[trimmed]
    || nameToCode[trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()]
    || (() => {
         const lower = trimmed.toLowerCase();
         const key = Object.keys(nameToCode).find(k => k.toLowerCase() === lower);
         return key ? nameToCode[key] : '';
       })();
}

// Image-based flag so it renders on Windows (Segoe UI Emoji has no flag glyphs)
function CountryFlag({ country, height = 14, style }) {
  const code = getCountryCode(country);
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt={code}
      height={height}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 1px var(--color-black-a35)', ...style }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

function getCountryFlag(country) {
  const code = getCountryCode(country);
  if (!code) return '';
  return [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}


export default function Sidebar({ user, onNavigate }) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingLichess, setIsEditingLichess] = useState(false);
  const [editLichessValue, setEditLichessValue] = useState('');
  const [isSavingLichess, setIsSavingLichess] = useState(false);
  const [isEditingChessCom, setIsEditingChessCom] = useState(false);
  const [editChessComValue, setEditChessComValue] = useState('');
  const [isSavingChessCom, setIsSavingChessCom] = useState(false);
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [editCountryValue, setEditCountryValue] = useState('');
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [editCountryMsg, setEditCountryMsg] = useState(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editCurrentPw, setEditCurrentPw] = useState('');
  const [editNewPw, setEditNewPw] = useState('');
  const [editConfirmPw, setEditConfirmPw] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [editPasswordMsg, setEditPasswordMsg] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  // Auto-expand if controlled by parent (UserLayout)
  const [isExpanded, setIsExpanded] = useState(!!onNavigate);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [analysingJob, setAnalysingJob] = useState(null); // { cacheId, username }

  // Player search (all users)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchDebounceRef = React.useRef(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const quickSearchInputRef = React.useRef(null);

  // Friends online (replaces the search button for logged-in users)
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const friendsRef = React.useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, isAuthenticated, logout } = useAuth();

  // Notifications (sidebar bell)
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = React.useRef(null);
  // App-wide bell notifications now come from the backend (admin-managed) instead
  // of a hardcoded array. Read/unread is still tracked per-user by notification id.
  const [appNotifications, setAppNotifications] = useState([]);
  const [seenNotifIds, setSeenNotifIds] = useState(
    () => new Set(JSON.parse(localStorage.getItem('seenNotificationIds') || '[]'))
  );
  const appUnreadCount = appNotifications.filter(n => !seenNotifIds.has(n.id)).length;
  const markNotificationsSeen = () => {
    const all = new Set([...seenNotifIds, ...appNotifications.map(n => n.id)]);
    setSeenNotifIds(all);
    localStorage.setItem('seenNotificationIds', JSON.stringify([...all]));
  };

  const fetchAppNotifications = React.useCallback(async () => {
    if (!isAuthenticated) { setAppNotifications([]); return; }
    try {
      const res = await api.get('/api/public/notifications');
      setAppNotifications(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent — non-critical */ }
  }, [isAuthenticated]);

  // Unread messages from friends (shown in the bell alongside app notifications)
  const [friendMsgs, setFriendMsgs] = useState([]);
  const [friendMsgTotal, setFriendMsgTotal] = useState(0);
  // If the endpoint is unavailable on this backend (404), stop polling after a
  // couple of strikes so we don't flood error analytics with repeated requests.
  const friendUnread404s = React.useRef(0);
  const friendUnreadDisabled = React.useRef(false);
  const fetchFriendUnread = React.useCallback(async () => {
    if (!isAuthenticated || friendUnreadDisabled.current) {
      setFriendMsgs([]); setFriendMsgTotal(0); return;
    }
    try {
      const res = await api.get('/api/chat/friend-unread');
      friendUnread404s.current = 0;
      setFriendMsgs(res.data?.items || []);
      setFriendMsgTotal(res.data?.total || 0);
    } catch (err) {
      if (err?.response?.status === 404 && ++friendUnread404s.current >= 2) {
        friendUnreadDisabled.current = true; // give up for this session
      }
      /* otherwise silent — bell still shows app notifications */
    }
  }, [isAuthenticated]);

  // Unread COACH messages (shown in the bell alongside friend messages).
  //
  // /friend-unread excludes coach threads on purpose, so without this a coach's
  // reply was invisible unless the student opened the Messages tab. Same
  // 404-tolerance as above: this endpoint ships ahead of the backend deploy.
  const [coachMsgs, setCoachMsgs] = useState([]);
  const [coachMsgTotal, setCoachMsgTotal] = useState(0);
  const coachUnread404s = React.useRef(0);
  const coachUnreadDisabled = React.useRef(false);
  const fetchCoachUnread = React.useCallback(async () => {
    if (!isAuthenticated || coachUnreadDisabled.current) {
      setCoachMsgs([]); setCoachMsgTotal(0); return;
    }
    try {
      const res = await api.get('/api/chat/coach/unread-items');
      coachUnread404s.current = 0;
      setCoachMsgs(res.data?.items || []);
      setCoachMsgTotal(res.data?.total || 0);
    } catch (err) {
      if (err?.response?.status === 404 && ++coachUnread404s.current >= 2) {
        coachUnreadDisabled.current = true; // give up for this session
      }
      /* otherwise silent — bell still shows everything else */
    }
  }, [isAuthenticated]);

  // Per-user notifications (currently: "your practice report is ready").
  // Separate from the admin notifications above, which are a BROADCAST — one row
  // published to everyone with read state kept in localStorage. That cannot
  // target a single student, which is what a 30-minute background job needs.
  const [myNotifs, setMyNotifs] = useState({ unread: 0, notifications: [] });
  const fetchMyNotifs = React.useCallback(async () => {
    if (!isAuthenticated) { setMyNotifs({ unread: 0, notifications: [] }); return; }
    try {
      const res = await api.get('/api/notifications/mine');
      setMyNotifs({
        unread: res.data?.unread || 0,
        notifications: res.data?.notifications || [],
      });
    } catch { /* silent — non-critical */ }
  }, [isAuthenticated]);

  useEffect(() => { fetchMyNotifs(); }, [fetchMyNotifs]);

  // Live push, so a report that finishes while the user is on the page updates
  // the bell immediately instead of waiting for the next poll.
  useEffect(() => {
    if (!isAuthenticated || !socket) return;
    const onNew = () => fetchMyNotifs();
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [isAuthenticated, fetchMyNotifs]);

  // Live push when any chat message arrives for us, so a coach's reply shows in
  // the bell at once instead of up to 120s later. The server emits this to our
  // own user room; `receive_message` would not reach us here, since the sidebar
  // never joins the per-chat rooms.
  useEffect(() => {
    if (!isAuthenticated || !socket) return;
    const onUnread = () => { fetchCoachUnread(); fetchFriendUnread(); };
    socket.on('chat:unread', onUnread);
    return () => socket.off('chat:unread', onUnread);
  }, [isAuthenticated, fetchCoachUnread, fetchFriendUnread]);

  // Unread admin replies to the user's reports (shown in the bell; full text on /my-reports)
  const [reportReplies, setReportReplies] = useState([]);
  const fetchReportReplies = React.useCallback(async () => {
    if (!isAuthenticated) { setReportReplies([]); return; }
    try {
      const res = await api.get('/api/reports/mine/unread');
      setReportReplies(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent — non-critical */ }
  }, [isAuthenticated]);

  // Incoming coach requests awaiting this user's approval (shown in the bell;
  // full list + actions also on /coach-requests).
  const [coachRequests, setCoachRequests] = useState([]);
  const fetchCoachRequests = React.useCallback(async () => {
    if (!isAuthenticated) { setCoachRequests([]); return; }
    try {
      const res = await api.get('/api/coach/requests/incoming');
      setCoachRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
    } catch { /* silent — non-critical */ }
  }, [isAuthenticated]);

  // Incoming game invites (play-with-friend requests)
  const [gameInvites, setGameInvites] = useState([]);
  const fetchGameInvites = React.useCallback(async () => {
    if (!isAuthenticated) { setGameInvites([]); return; }
    try {
      const res = await api.get('/api/game-invites/incoming');
      setGameInvites(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent — non-critical */ }
  }, [isAuthenticated]);

  const respondToGameInvite = async (inviteId, action, roomCode) => {
    try {
      await api.post(`/api/game-invites/${inviteId}/respond`, { action });
      setGameInvites(prev => prev.filter(i => i._id !== inviteId));
      if (action === 'accept' && roomCode) {
        navigate(`/friend/${roomCode}`);
        setShowNotifications(false);
      }
    } catch (e) {
      console.error('game invite respond failed', e?.response?.data?.message || e.message);
    }
  };

  // Friends currently online (lastActivity within ~5 min, backend-defined)
  const onlineFriends404s = React.useRef(0);
  const onlineFriendsDisabled = React.useRef(false);
  const fetchOnlineFriends = React.useCallback(async () => {
    if (!isAuthenticated || onlineFriendsDisabled.current) {
      setOnlineFriends([]); return;
    }
    try {
      const res = await api.get('/api/social/online-friends');
      onlineFriends404s.current = 0;
      setOnlineFriends(Array.isArray(res.data?.friends) ? res.data.friends : []);
    } catch (err) {
      if (err?.response?.status === 404 && ++onlineFriends404s.current >= 2) {
        onlineFriendsDisabled.current = true; // endpoint unavailable on this backend
      }
      /* otherwise silent — non-critical */
    }
  }, [isAuthenticated]);

  const respondToCoachRequest = async (linkId, action) => {
    try {
      await api.post(`/api/coach/requests/${linkId}/${action}`);
      setCoachRequests(prev => prev.filter(r => r._id !== linkId));
    } catch (e) {
      // Surface a minimal failure; the item stays so the user can retry.
      console.error('coach request action failed', e?.response?.data?.message || e.message);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    // Fetch once, then poll. Poll quickly (30s) only while the bell is open;
    // otherwise refresh slowly (120s) just to keep the badge count fresh. This
    // cuts request volume well below the old constant 60s polling.
    const poll = () => { fetchFriendUnread(); fetchCoachUnread(); fetchReportReplies(); fetchCoachRequests(); fetchAppNotifications(); fetchOnlineFriends(); fetchGameInvites(); };
    poll();
    // Poll faster (30s) while either the bell or friends panel is open.
    const intervalMs = (showNotifications || showFriends) ? 30000 : 120000;
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchFriendUnread, fetchCoachUnread, fetchReportReplies, fetchCoachRequests, fetchAppNotifications, fetchOnlineFriends, fetchGameInvites, showNotifications, showFriends]);

  // Real-time game invite via main socket
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = (invite) => {
      setGameInvites(prev => {
        if (prev.some(i => i._id === invite.inviteId)) return prev;
        return [{
          _id: invite.inviteId,
          roomCode: invite.roomCode,
          timeControlLabel: invite.timeControlLabel,
          variant: invite.variant,
          inviterId: { displayName: invite.from?.displayName, username: invite.from?.displayName },
        }, ...prev];
      });
    };
    socket.on('game_invite', handler);
    return () => socket.off('game_invite', handler);
  }, [isAuthenticated]);

  // Total red badge = unread app notifications + friend messages + coach messages + report replies + coach requests + game invites
  const unreadNotifCount = appUnreadCount + friendMsgTotal + coachMsgTotal + reportReplies.length + coachRequests.length + gameInvites.length + myNotifs.unread;

  // Load coach status once when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setIsCoach(false); return; }
    api.get('/api/coach/status')
      .then(r => setIsCoach(r.data?.isCoach || false))
      .catch(() => {});
  }, [isAuthenticated]);

  // Detect screen size and orientation
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 1024; // Increased to include tablets
      const landscape = window.innerHeight < window.innerWidth && window.innerWidth <= 1024;
      setIsMobile(mobile);
      setIsLandscape(landscape);
      
      // Auto-collapse in landscape mode
      if (landscape) {
        setIsExpanded(false);
      }
      
      if (!mobile) {
        setIsExpanded(false); // Reset expansion on desktop
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
  }, []);

  // Check for current game in localStorage
  useEffect(() => {
    const checkCurrentGame = () => {
      const gameId = localStorage.getItem('currentGame');
      setCurrentGame(gameId);
    };

    checkCurrentGame();
    // Check more frequently in case the game ends
    const interval = setInterval(checkCurrentGame, 1000);

    // Also listen for storage changes (more immediate)
    const handleStorageChange = (e) => {
      if (e.key === 'currentGame') {
        setCurrentGame(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Check for in-progress analysis job in localStorage
  useEffect(() => {
    // Remembers the exact string last seen, so the comparison is byte-for-byte
    // rather than a re-serialisation of the parsed object (key order and
    // whitespace would not survive that round trip).
    let lastRaw = null;
    const checkAnalysisJob = () => {
      const raw = localStorage.getItem('analysisJob');
      // Bail out when the stored value has not changed. JSON.parse() returns a
      // NEW object every tick, so calling setAnalysingJob with it re-rendered
      // the whole layout — and every page inside it — once a second even when
      // no analysis was running. On the chat page that was the visible flicker
      // while typing.
      if (raw === lastRaw) return;
      lastRaw = raw;
      try {
        setAnalysingJob(raw ? JSON.parse(raw) : null);
      } catch { setAnalysingJob(null); }
    };

    checkAnalysisJob();
    const interval = setInterval(checkAnalysisJob, 1000);

    const handleStorageChange = (e) => {
      if (e.key === 'analysisJob') {
        try {
          setAnalysingJob(e.newValue ? JSON.parse(e.newValue) : null);
        } catch { setAnalysingJob(null); }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile || isLandscape) {
      setIsExpanded(false); // Collapse after navigation on mobile/landscape
    }
    if (onNavigate) onNavigate(); // Close mobile sidebar
  };

  const handleStartEdit = () => {
    setEditNameValue(user.displayName || user.username);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim()) return;
    
    setIsSavingName(true);
    try {
      await api.put('/api/auth/profile', { displayName: editNameValue });
      await refreshUser();
      setIsEditingName(false);
    } catch (error) {
      alert('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleStartEditLichess = () => {
    setEditLichessValue(user.lichessUsername || '');
    setIsEditingLichess(true);
  };

  const handleSaveLichess = async () => {
    setIsSavingLichess(true);
    try {
      await api.put('/api/auth/profile', { lichessUsername: editLichessValue });
      await refreshUser();
      setIsEditingLichess(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update Lichess username');
    } finally {
      setIsSavingLichess(false);
    }
  };

  const handleStartEditChessCom = () => {
    setEditChessComValue(user.chessComUsername || '');
    setIsEditingChessCom(true);
  };

  const COUNTRY_LIST = [
    'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria',
    'Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Brazil','Bulgaria',
    'Cambodia','Canada','Chile','China','Colombia','Croatia','Cuba','Czechia','Denmark',
    'Ecuador','Egypt','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece',
    'Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
    'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Latvia','Lebanon',
    'Lithuania','Malaysia','Mexico','Moldova','Mongolia','Morocco','Myanmar','Nepal',
    'Netherlands','New Zealand','Nigeria','Norway','Pakistan','Paraguay','Peru','Philippines',
    'Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia',
    'Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka',
    'Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Tunisia',
    'Turkey','Turkmenistan','Uganda','Ukraine','United Arab Emirates','United Kingdom',
    'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe',
  ];

  const handleStartEditCountry = () => {
    setEditCountryValue(user.country || '');
    setEditCountryMsg(null);
    setIsEditingCountry(true);
  };

  const handleSaveCountry = async () => {
    if (!editCountryValue.trim()) return;
    setIsSavingCountry(true);
    setEditCountryMsg(null);
    try {
      await api.patch('/api/user/update-country', { country: editCountryValue.trim() });
      await refreshUser();
      setIsEditingCountry(false);
      setEditCountryMsg({ type: 'ok', text: 'Country updated!' });
    } catch (error) {
      setEditCountryMsg({ type: 'err', text: error.response?.data?.message || 'Failed to update country' });
    } finally {
      setIsSavingCountry(false);
    }
  };

  const handleSavePassword = async () => {
    setEditPasswordMsg(null);
    if (!editCurrentPw || !editNewPw || !editConfirmPw) {
      return setEditPasswordMsg({ type: 'err', text: 'Fill all fields.' });
    }
    if (editNewPw.length < 6) {
      return setEditPasswordMsg({ type: 'err', text: 'New password must be at least 6 characters.' });
    }
    if (editNewPw !== editConfirmPw) {
      return setEditPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
    }
    setIsSavingPassword(true);
    try {
      await api.patch('/api/user/change-password', { currentPassword: editCurrentPw, newPassword: editNewPw });
      setEditPasswordMsg({ type: 'ok', text: 'Password changed!' });
      setEditCurrentPw(''); setEditNewPw(''); setEditConfirmPw('');
      setIsEditingPassword(false);
    } catch (error) {
      setEditPasswordMsg({ type: 'err', text: error.response?.data?.message || 'Failed to change password' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveChessCom = async () => {
    setIsSavingChessCom(true);
    try {
      await api.put('/api/auth/profile', { chessComUsername: editChessComValue });
      await refreshUser();
      setIsEditingChessCom(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update Chess.com username');
    } finally {
      setIsSavingChessCom(false);
    }
  };

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path === '/puzzles' && location.pathname === '/puzzles') return true;
    if (path === '/puzzles-hub' && location.pathname === '/puzzles-hub') return true;
    if (path === '/arena-tournament/create' && location.pathname === '/arena-tournament/create') return true;
    if (path === '/race' && location.pathname === '/race') return true;
    if (path === '/arena' && location.pathname.startsWith('/arena')) return true;
    if (path === '/team-race' && location.pathname.startsWith('/team-race')) return true;
    if (path === '/study' && location.pathname.startsWith('/study')) return true;
    if (path === '/attendance' && location.pathname.startsWith('/attendance')) return true;
    if (path === '/choose-topic' && location.pathname === '/choose-topic') return true;
    if (path === '/games' && location.pathname === '/games') return true;
    if (path === '/game-analysis' && location.pathname === '/game-analysis') return true;
    if (path === '/arenatournament' && location.pathname.startsWith('/arenatournament')) return true;
    return false;
  };

  const getShortTimeZone = (tz) => {
    const tzMap = {
      'Asia/Kolkata': 'IST',
      'America/New_York': 'EST',
      'America/Chicago': 'CST',
      'America/Denver': 'MST',
      'America/Los_Angeles': 'PST',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Asia/Tokyo': 'JST',
      'Australia/Sydney': 'AEST',
    };
    return tzMap[tz] || tz;
  };

  // Skip the inline stylesheet in the prerendered snapshot. Text extractors
  // (crawlers, AI readers) treat <style> contents as page text, so ~4.8k
  // characters of keyframes and a font @import were being served as the opening
  // text of EVERY prerendered page — 27–62% of each page's extractable text,
  // sitting ahead of the actual product copy. Browsers are unaffected.
  const skipInlineCss = typeof window !== 'undefined' && window.__PRERENDER__;

  return (
    <>
      {!skipInlineCss && (
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Oleo+Script+Swash+Caps&family=Poppins:wght@400;500;600;700&display=swap');
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
      )}

      {/* Mobile Hamburger Menu Button - Only show if not controlled by parent.
          Carries .sb-standalone-burger so pages that render this sidebar
          directly (the arcade game) can restyle it without touching the inline
          defaults every other caller relies on. */}
      {!onNavigate && (isMobile && !isLandscape) && !isExpanded && (
        <button
          className="sb-standalone-burger"
          onClick={() => setIsExpanded(true)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1002,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-accent-a30)',
            color: 'var(--color-accent)',
            fontSize: '24px',
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px var(--color-black-a35)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'var(--color-accent-a15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'var(--color-bg)';
          }}
        >
          ☰
        </button>
      )}

      {/* Left Sidebar Navigation */}
      <div style={{
        ...styles.sidebar,
        width: (isMobile || isLandscape) && !isExpanded ? (isMobile && !isLandscape ? '0px' : '60px') : '170px',
        transform: (isMobile && !isLandscape) && !isExpanded ? 'translateX(-100%)' : 'translateX(0)',
        opacity: (isMobile && !isLandscape) && !isExpanded ? 0 : 1,
        visibility: (isMobile && !isLandscape) && !isExpanded ? 'hidden' : 'visible',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: (isMobile || isLandscape) && isExpanded ? 1001 : 100,
      }}>
        <div style={styles.sidebarContent}>
          {/* Close button for mobile expanded view.
              MUST also call onNavigate(): on mobile portrait UserLayout wraps
              this sidebar in a 60px-wide .sidebar-mobile panel and only unmounts
              it when ITS own isSidebarOpen goes false. Collapsing just this
              component left that empty 60px strip on screen — a dark bar down
              the left edge with no icons or text, which is what users saw after
              pressing X. Navigation already closed the parent (see the nav
              handler's onNavigate call); the X did not. */}
          {(isMobile || isLandscape) && isExpanded && (
            <button
              onClick={() => { setIsExpanded(false); if (onNavigate) onNavigate(); }}
              style={{
                position: 'absolute',
                top: '90px',
                right: '10px',
                background: 'var(--color-accent-a15)',
                border: '1px solid var(--color-accent-a30)',
                color: 'var(--color-accent)',
                fontSize: '20px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-lg)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 101,
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-danger-a20)';
                e.currentTarget.style.borderColor = 'var(--color-danger-a30)';
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.borderColor = 'var(--color-accent-a30)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
              }}
              title="Collapse sidebar"
            >
              ✕
            </button>
          )}
          
          <nav style={styles.navMenu}>
            <div 
              style={{ ...(isActive('/') ? styles.navItemActive : styles.navItem), fontFamily: "'Oleo Script Swash Caps', cursive", fontSize: "25px" }}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Chess Nexus"
            >
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Chess Nexus</span>}
            </div>
            {currentGame && (
              <div 
                style={{
                  ...styles.navItem,
                  backgroundColor: 'var(--color-danger-a12)',
                  color: 'var(--color-danger)',
                  animation: 'pulse 2s infinite',
                  border: '1px solid var(--color-danger-a30)',
                }}
                onClick={() => {
                  if ((isMobile || isLandscape) && !isExpanded) {
                    setIsExpanded(true);
                  } else {
                    handleNavigate(`/game/live/${currentGame}`);
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-danger-a20)';
                  e.currentTarget.style.borderColor = 'var(--color-danger-a30)';
                  e.currentTarget.style.color = 'var(--color-text)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.borderLeft = '5px solid var(--color-danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-danger-a12)';
                  e.currentTarget.style.borderColor = 'var(--color-danger-a30)';
                  e.currentTarget.style.color = 'var(--color-danger)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderLeft = 'none';
                }}
                title="Resume your active game"
              >
                <span style={styles.navIcon}>🎯</span>
                {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Resume Game</span>}
              </div>
            )}
            <div 
              style={isActive('/dashboard') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/dashboard');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/dashboard') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/dashboard') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Dashboard"
            >
              <span style={styles.navIcon}>🏠</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Dashboard</span>}
            </div>
            <div 
              style={isActive('/puzzles-hub') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/puzzles-hub');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/puzzles-hub') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/puzzles-hub') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Puzzles Hub"
            >
              <span style={styles.navIcon}>🏛️</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Puzzles Hub</span>}
            </div>

            <div
              style={isActive('/race') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/race');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/race') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/race') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Race Hub"
            >
              <span style={styles.navIcon}>🏁</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Race Hub</span>}
            </div>

            <div
              style={isActive('/study') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/study');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/study') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/study') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Study"
            >
              <span style={styles.navIcon}>📚</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Study</span>}
            </div>

            
            {/* Coach — PUBLIC. Shown to everyone, logged in or not: it is a page
                ABOUT coaching on Chess Nexus, not the coach's own dashboard.
                (That one is the 🎓 shortcut further down, gated behind isCoach.) */}
            <div
              style={isActive('/coach-hub') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/coach-hub');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/coach-hub') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/coach-hub') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Coach"
            >
              <span style={styles.navIcon}>🎓</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Coach</span>}
            </div>

            <div 
              style={isActive('/games') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/games');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/games') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/games') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Play"
            >
              <span style={styles.navIcon}>🎮</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Play</span>}
            </div>

            {/* The 3D Arena nav item moved to the Games page (/games). It is a way
                to PLAY, so it belongs beside the other play options rather than in
                the global navigation, where it competed with Puzzles, Study and
                Race for a coach's and student's attention. */}

            {/* Analyse My Games nav item */}
            <div
              style={isActive('/game-analysis') ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) {
                  setIsExpanded(true);
                } else {
                  handleNavigate('/game-analysis');
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid var(--color-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/game-analysis') ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = isActive('/game-analysis') ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Analyse My Games"
            >
              <span style={styles.navIcon}>🔍</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Analysis</span>}
            </div>

            {/* Pulsing badge when analysis is running in background */}
            {analysingJob && (
              <div
                style={{
                  ...styles.navItem,
                  backgroundColor: 'var(--color-accent-a12)',
                  color: 'var(--color-accent)',
                  animation: 'pulse 2s infinite',
                  border: '1px solid var(--color-accent-a30)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if ((isMobile || isLandscape) && !isExpanded) {
                    setIsExpanded(true);
                  } else {
                    handleNavigate('/game-analysis');
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-accent-a20)';
                  e.currentTarget.style.borderColor = 'var(--color-accent-a40)';
                  e.currentTarget.style.color = 'var(--color-text)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-accent-a12)';
                  e.currentTarget.style.borderColor = 'var(--color-accent-a30)';
                  e.currentTarget.style.color = 'var(--color-accent)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                title={`Analysing ${analysingJob.username || 'games'}… tap to view progress`}
              >
                <span style={styles.navIcon}>⌛</span>
                {(!(isMobile || isLandscape) || isExpanded) && (
                  <span style={styles.navLabel}>Analysing…</span>
                )}
              </div>
            )}
            {/* Social Hub */}
            <div
              style={(isActive('/social') || isActive('/players') || isActive('/invite') || isActive('/friends') || isActive('/clubs')) ? styles.navItemActive : styles.navItem}
              onClick={() => {
                if ((isMobile || isLandscape) && !isExpanded) { setIsExpanded(true); }
                else { handleNavigate('/social'); }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-a15)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                const socialActive = isActive('/social') || isActive('/players') || isActive('/invite') || isActive('/friends') || isActive('/clubs');
                e.currentTarget.style.background = socialActive ? 'var(--color-accent-a15)' : 'transparent';
                e.currentTarget.style.color = socialActive ? 'var(--color-accent)' : 'var(--color-text)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              title="Social Hub"
            >
              <span style={styles.navIcon}>🌐</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Social Hub</span>}
            </div>
          </nav>
          
          <div style={{ marginTop: 'auto', padding: '0 10px' }}>

            {/* ── Quick player search input (all users, toggled by icon) ───── */}
            {showQuickSearch && (
              <div style={{ marginBottom: '6px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '10px', top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-faint)',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </span>
                  <input
                    ref={quickSearchInputRef}
                    autoFocus
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      setSearchOpen(true);
                      clearTimeout(searchDebounceRef.current);
                      if (val.trim().length < 2) {
                        setSearchResults([]);
                        setSearchLoading(false);
                        return;
                      }
                      setSearchLoading(true);
                      searchDebounceRef.current = setTimeout(async () => {
                        try {
                          const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
                          const res = await fetch(`${apiBase}/api/public/search/users?q=${encodeURIComponent(val.trim())}`);
                          const data = await res.json();
                          setSearchResults(Array.isArray(data) ? data : []);
                        } catch {
                          setSearchResults([]);
                        } finally {
                          setSearchLoading(false);
                        }
                      }, 300);
                    }}
                    onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      background: 'var(--color-white-a07)',
                      border: '1px solid var(--color-accent-a40)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text)',
                      fontSize: '12px',
                      fontFamily: "'Poppins', sans-serif",
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onBlurCapture={() => {
                      setTimeout(() => {
                        setSearchOpen(false);
                        setShowQuickSearch(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }, 350);
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── Bottom icon row ─────────────────────────────────────── */}
            {isAuthenticated ? (
              <>
              {/* Logged-in: Profile | Search | Logout */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-white-a04)',
                border: '1px solid var(--color-white-a10)',
                borderRadius: 'var(--radius-lg)',
                margin: '10px 0 20px 0',
                overflow: 'hidden',
              }}>
                {/* Notifications bell */}
                <button
                  ref={bellRef}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', position: 'relative',
                    background: showNotifications ? 'var(--color-accent-a15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: showNotifications ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    if ((isMobile || isLandscape) && !isExpanded) { setIsExpanded(true); return; }
                    const next = !showNotifications;
                    setShowNotifications(next);
                    if (next) {
                      markNotificationsSeen();   // clears the app-notification part of the badge
                      fetchFriendUnread();       // refresh friend messages (clears once actually read in chat)
                    }
                  }}
                  title="Notifications"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-a15)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = showNotifications ? 'var(--color-accent-a15)' : 'transparent';
                    e.currentTarget.style.color = showNotifications ? 'var(--color-accent)' : 'var(--color-text-muted)';
                  }}
                >
                  {/* Bell icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadNotifCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '6px', right: '50%', transform: 'translateX(16px)',
                      minWidth: '16px', height: '16px', padding: '0 4px',
                      background: 'var(--color-danger)', color: 'var(--color-text)', borderRadius: 'var(--radius-pill)',
                      fontSize: '10px', fontWeight: 800, lineHeight: '16px', textAlign: 'center',
                      boxShadow: '0 0 0 2px var(--color-bg)',
                    }}>
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                <div style={{ width: '1px', height: '20px', background: 'var(--color-white-a13)', flexShrink: 0 }} />

                {/* Settings (Profile now lives inside Settings → Profile tab) */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0',
                    background: location.pathname === '/settings' ? 'var(--color-accent-a15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: location.pathname === '/settings' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    if ((isMobile || isLandscape) && !isExpanded) { setIsExpanded(true); }
                    else { handleNavigate('/settings'); }
                  }}
                  title="Settings"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-a15)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = location.pathname === '/settings' ? 'var(--color-accent-a15)' : 'transparent';
                    e.currentTarget.style.color = location.pathname === '/settings' ? 'var(--color-accent)' : 'var(--color-text-muted)';
                  }}
                >
                  {/* Gear / cog icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>

                <div style={{ width: '1px', height: '20px', background: 'var(--color-white-a13)', flexShrink: 0 }} />

                {/* Friends online toggle (replaces player search for logged-in users) */}
                <button
                  ref={friendsRef}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', position: 'relative',
                    background: showFriends ? 'var(--color-success-a12)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: showFriends ? 'var(--color-success)' : 'var(--color-text-muted)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    if ((isMobile || isLandscape) && !isExpanded) { setIsExpanded(true); return; }
                    const next = !showFriends;
                    setShowFriends(next);
                    if (next) fetchOnlineFriends(); // refresh on open
                  }}
                  title={onlineFriends.length > 0 ? `${onlineFriends.length} friend${onlineFriends.length === 1 ? '' : 's'} online` : 'Friends online'}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-success-a12)'; e.currentTarget.style.color = 'var(--color-success)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = showFriends ? 'var(--color-success-a12)' : 'transparent'; e.currentTarget.style.color = showFriends ? 'var(--color-success)' : 'var(--color-text-muted)'; }}
                >
                  {/* People / friends icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {onlineFriends.length > 0 && (
                    <span style={{
                      position: 'absolute', top: '6px', right: '50%', transform: 'translateX(16px)',
                      minWidth: '16px', height: '16px', padding: '0 4px',
                      background: 'var(--color-success)', color: '#062611', borderRadius: 'var(--radius-pill)',
                      fontSize: '10px', fontWeight: 800, lineHeight: '16px', textAlign: 'center',
                      boxShadow: '0 0 0 2px var(--color-bg)',
                    }}>
                      {onlineFriends.length}
                    </span>
                  )}
                </button>

                <div style={{ width: '1px', height: '20px', background: 'var(--color-white-a13)', flexShrink: 0 }} />

                {/* Logout */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={async () => { await logout(); navigate('/', { replace: true }); }}
                  title="Logout"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-a12)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>

              {/* ── Coach dashboard shortcut (coaches only) ── */}
              {isCoach && (
                <div
                  style={{
                    ...styles.navItem,
                    background: location.pathname.startsWith('/coach') ? 'var(--color-accent-a15)' : 'var(--color-accent-a06)',
                    border: '1px solid var(--color-accent-a30)',
                    color: location.pathname.startsWith('/coach') ? 'var(--color-accent)' : 'var(--color-accent)',
                    marginTop: '4px',
                    borderRadius: 'var(--radius-md)',
                  }}
                  onClick={() => handleNavigate('/coach/dashboard')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-a20)'; e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname.startsWith('/coach') ? 'var(--color-accent-a15)' : 'var(--color-accent-a06)'; e.currentTarget.style.color = location.pathname.startsWith('/coach') ? 'var(--color-accent)' : 'var(--color-accent)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  title="Coach Dashboard"
                >
                  <span style={styles.navIcon}>🎓</span>
                  {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Coach</span>}
                </div>
              )}

              </>

            ) : (
              /* Guest: Search | Login */
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-white-a04)',
                border: '1px solid var(--color-white-a10)',
                borderRadius: 'var(--radius-lg)',
                margin: '10px 0 20px 0',
                overflow: 'hidden',
              }}>
                {/* Search toggle */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0',
                    background: showQuickSearch ? 'var(--color-accent-a15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: showQuickSearch ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    const next = !showQuickSearch;
                    setShowQuickSearch(next);
                    if (!next) { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }
                  }}
                  title="Search Players"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-a15)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = showQuickSearch ? 'var(--color-accent-a15)' : 'transparent'; e.currentTarget.style.color = showQuickSearch ? 'var(--color-accent)' : 'var(--color-text-muted)'; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>

                <div style={{ width: '1px', height: '20px', background: 'var(--color-white-a13)', flexShrink: 0 }} />

                {/* Login */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => navigate('/login')}
                  title="Login"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-success-a12)'; e.currentTarget.style.color = 'var(--color-success)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                </button>

                {/* Guest: also show Leave button */}
                {user?.role === 'guest' && (
                  <>
                    <div style={{ width: '1px', height: '20px', background: 'var(--color-white-a13)', flexShrink: 0 }} />
                    <button
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '11px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--color-text-muted)', transition: 'background 0.2s, color 0.2s',
                      }}
                      onClick={async () => { await logout(); navigate('/', { replace: true }); }}
                      title="Leave (end guest session)"
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-a12)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating player search results — portal to body so they can overflow sidebar */}
      {showQuickSearch && searchOpen &&
        (searchLoading || searchResults.length > 0 || (searchQuery.trim().length >= 2 && !searchLoading)) &&
        (() => {
          const rect = quickSearchInputRef.current?.getBoundingClientRect();
          if (!rect) return null;
          return createPortal(
            <div
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                bottom: window.innerHeight - rect.top + 6,
                left: rect.left,
                minWidth: Math.max(rect.width, 280),
                width: 'max-content',
                maxWidth: '400px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-accent-a30)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 -8px 32px var(--color-black-a65)',
                zIndex: 100002,
                backdropFilter: 'blur(16px)',
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              {searchLoading && (
                <div style={{ padding: '12px 16px', color: 'var(--color-text-faint)', fontSize: '13px', textAlign: 'center' }}>
                  Searching...
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div style={{ padding: '12px 16px', color: 'var(--color-text-faint)', fontSize: '13px', textAlign: 'center' }}>
                  No players found
                </div>
              )}
              {!searchLoading && searchResults.map((player, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchOpen(false);
                    setShowQuickSearch(false);
                    if (onNavigate) onNavigate();
                    navigate(`/player/${encodeURIComponent(player.displayName)}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid var(--color-white-a04)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-a12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <UserAvatar user={player} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
                      {player.displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '1px' }}>
                      {player.country ? `${player.country} · ` : ''}{player.liveRating} pts
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', flexShrink: 0, marginLeft: '8px' }}>→</span>
                </div>
              ))}
            </div>,
            document.body
          );
        })()
      }

      {/* ── Friends-online panel — overlay anchored to the friends button ── */}
      {/* NOTE ON z-index: these fly-out panels (friends online, notifications,
          quick search) are `position: fixed` and MUST sit above the mobile
          sidebar drawer, which is z-index 100000 (.sidebar-mobile in
          UserLayout.css). They used to be 9999/9998, so on a phone they opened
          BEHIND the drawer and looked like nothing happened. Backdrops are
          100001, panels 100002 — keep them above .sidebar-mobile if that
          changes. */}
      {showFriends && isAuthenticated &&
        (() => {
          const rect = friendsRef.current?.getBoundingClientRect();
          if (!rect) return null;
          return createPortal(
            <>
              {/* click-away backdrop */}
              <div
                onClick={() => setShowFriends(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'transparent' }}
              />
              <div
                style={{
                  position: 'fixed',
                  bottom: window.innerHeight - rect.top + 8,
                  left: rect.left,
                  width: 'max-content',
                  minWidth: '280px',
                  maxWidth: '360px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-success-a30)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 -8px 32px var(--color-black-a65)',
                  zIndex: 100002,
                  backdropFilter: 'blur(16px)',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '12px',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--color-white-a07)',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: 'var(--radius-pill)', background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)', flexShrink: 0 }} />
                    Friends online
                    <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>{onlineFriends.length}</span>
                  </span>
                  <button
                    onClick={() => setShowFriends(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '15px' }}
                    title="Close"
                  >✕</button>
                </div>

                {onlineFriends.length === 0 ? (
                  <div style={{ color: 'var(--color-text-faint)', fontSize: '13px', textAlign: 'center', padding: '20px 4px' }}>
                    None of your friends are online right now.
                    <div
                      onClick={() => { handleNavigate('/social/chat'); setShowFriends(false); }}
                      style={{ fontSize: '11.5px', color: 'var(--color-success)', fontWeight: 600, marginTop: '10px', cursor: 'pointer' }}
                    >
                      Go to Chat →
                    </div>
                  </div>
                ) : (
                  <>
                    {onlineFriends.map((f) => (
                      <div
                        key={f._id || f.username}
                        onClick={() => {
                          setShowFriends(false);
                          if (onNavigate) onNavigate();
                          navigate(`/player/${encodeURIComponent(f.displayName || f.username)}`);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a07)',
                          borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-success-a30)'; e.currentTarget.style.background = 'var(--color-success-a12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-white-a07)'; e.currentTarget.style.background = 'var(--color-white-a04)'; }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <UserAvatar user={f} size={34} />
                          <span style={{
                            position: 'absolute', bottom: '-1px', right: '-1px',
                            width: '11px', height: '11px', borderRadius: 'var(--radius-pill)',
                            background: 'var(--color-success)', border: '2px solid var(--color-bg)',
                          }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.displayName || f.username}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>
                            ● Online
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-faint)', flexShrink: 0, marginLeft: '6px' }}>→</span>
                      </div>
                    ))}
                    <div
                      onClick={() => { handleNavigate('/social/chat'); setShowFriends(false); }}
                      style={{ fontSize: '11.5px', color: 'var(--color-success)', fontWeight: 600, textAlign: 'right', cursor: 'pointer', marginTop: '2px' }}
                    >
                      Go to Chat →
                    </div>
                  </>
                )}
              </div>
            </>,
            document.body
          );
        })()
      }

      {/* ── Notifications panel — expands OUT as an overlay (doesn't stretch the sidebar) ── */}
      {showNotifications && isAuthenticated &&
        (() => {
          const rect = bellRef.current?.getBoundingClientRect();
          if (!rect) return null;
          return createPortal(
            <>
              {/* click-away backdrop */}
              <div
                onClick={() => setShowNotifications(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'transparent' }}
              />
              <div
                style={{
                  position: 'fixed',
                  bottom: window.innerHeight - rect.top + 8,
                  left: rect.left,
                  width: 'max-content',
                  minWidth: '300px',
                  maxWidth: '380px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-accent-a30)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 -8px 32px var(--color-black-a65)',
                  zIndex: 100002,
                  backdropFilter: 'blur(16px)',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '12px',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--color-white-a07)',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>🔔 Notifications</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '15px' }}
                    title="Close"
                  >✕</button>
                </div>

                {/* Per-user notifications (academy invites, streak reports…).
                    Top-level on purpose: these feed the badge count, so nesting
                    them inside another section's conditional would reproduce the
                    original bug — a bell reading "1" over an empty panel. */}
                {(myNotifs.notifications || []).filter(n => !n.read).length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent-2)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      🔔 For you
                    </div>
                    {(myNotifs.notifications || []).filter(n => !n.read).map(n => (
                      <div
                        key={n.id}
                        onClick={async () => {
                          try { await api.post('/api/notifications/read', { ids: [n.id] }); } catch { /* non-blocking */ }
                          fetchMyNotifs();
                          if (n.link) handleNavigate(n.link);
                          setShowNotifications(false);
                        }}
                        style={{
                          background: 'var(--color-accent-2-a15)', border: '1px solid var(--color-accent-2-a30)',
                          borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'; e.currentTarget.style.background = 'rgba(124,58,237,0.14)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-2-a30)'; e.currentTarget.style.background = 'var(--color-accent-2-a15)'; }}
                      >
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-accent-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n.type === 'academy_invite' ? '🏛️ ' : n.type === 'coaching_reply' ? '💡 ' : '🔔 '}{n.title}
                        </div>
                        {n.body && (
                          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {n.body}
                          </div>
                        )}
                        {n.link && (
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                            Tap to open →
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Game invites — someone invited this user to play a friend game */}
                {gameInvites.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      ♟️ Game invites
                    </div>
                    {gameInvites.map(inv => {
                      const from = inv.inviterId;
                      const fromName = from?.displayName || from?.username || 'Someone';
                      const tc = inv.timeControlLabel || '';
                      const variant = inv.variant === 'chess960' ? ' • Chess960' : '';
                      return (
                        <div
                          key={inv._id}
                          style={{
                            background: 'var(--color-success-a12)', border: '1px solid var(--color-success-a20)',
                            borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px',
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-success)' }}>
                            ♟️ <strong>{fromName}</strong> wants to play {tc}{variant}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => respondToGameInvite(inv._id, 'accept', inv.roomCode)}
                              style={{ flex: 1, background: 'var(--color-success-a20)', color: 'var(--color-success)', border: '1px solid var(--color-success-a30)', borderRadius: 'var(--radius-md)', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✓ Accept</button>
                            <button
                              onClick={() => respondToGameInvite(inv._id, 'decline', inv.roomCode)}
                              style={{ flex: 1, background: 'var(--color-danger-a12)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-a30)', borderRadius: 'var(--radius-md)', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✕ Decline</button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Coach requests — a coach wants to add this user as a student. Approve / Decline inline. */}
                {coachRequests.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent-2)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      🎓 Coach requests
                    </div>
                    {coachRequests.map(r => {
                      const coach = r.coachId || {};
                      const coachName = coach.displayName || coach.username || 'A coach';
                      return (
                        <div
                          key={r._id}
                          style={{
                            background: 'rgba(139,92,246,0.06)', border: '1px solid var(--color-accent-2-a15)',
                            borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px',
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-accent-2)' }}>
                            🎓 Coach <strong>{coachName}</strong> wants to add you as a student
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => respondToCoachRequest(r._id, 'approve')}
                              style={{ flex: 1, background: 'var(--color-success-a20)', color: 'var(--color-success)', border: '1px solid var(--color-success-a30)', borderRadius: 'var(--radius-md)', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✓ Approve</button>
                            <button
                              onClick={() => respondToCoachRequest(r._id, 'decline')}
                              style={{ flex: 1, background: 'var(--color-danger-a12)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-a30)', borderRadius: 'var(--radius-md)', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✕ Decline</button>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      onClick={() => { handleNavigate('/coach-requests'); setShowNotifications(false); }}
                      style={{ fontSize: '11px', color: 'var(--color-accent-2)', cursor: 'pointer', textAlign: 'right', marginBottom: '10px' }}
                    >
                      See all requests →
                    </div>
                  </>
                )}

                {/* Report replies — admin answered a report. Click to read the full reply. */}
                {reportReplies.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      🚩 Report replies
                    </div>
                    {reportReplies.map(r => (
                      <div
                        key={r._id}
                        onClick={() => { handleNavigate('/my-reports'); setShowNotifications(false); }}
                        style={{
                          background: 'var(--color-warning-a12)', border: '1px solid var(--color-warning-a20)',
                          borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; e.currentTarget.style.background = 'var(--color-warning-a12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-warning-a20)'; e.currentTarget.style.background = 'var(--color-warning-a12)'; }}
                      >
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-warning)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          ♟️ Team replied: {r.subject}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.reply}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                          Tap to read full reply →
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Friend messages — unread chats from friends */}
                {friendMsgs.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      💬 Messages
                    </div>
                    <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '2px' }}>
                    {friendMsgs.map(m => (
                      <div
                        key={m.chatId}
                        onClick={() => { handleNavigate('/social/chat'); setShowNotifications(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a07)',
                          borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-a40)'; e.currentTarget.style.background = 'var(--color-accent-a08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-white-a07)'; e.currentTarget.style.background = 'var(--color-white-a04)'; }}
                      >
                        <UserAvatar user={m.friend} size={32} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.friend?.displayName}
                            </span>
                            {m.unreadCount > 1 && (
                              <span style={{ background: 'var(--color-danger)', color: 'var(--color-text)', borderRadius: 'var(--radius-pill)', fontSize: '9px', fontWeight: 800, padding: '0 5px', lineHeight: '15px', height: '15px' }}>
                                {m.unreadCount}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.latestMessage}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                    {appNotifications.length > 0 && (
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '8px 0 6px' }}>
                        📢 Updates
                      </div>
                    )}
                  </>
                )}

                {/* Coach messages — replies in a coaching thread. Kept separate
                    from friend messages because they land on a different page. */}
                {coachMsgs.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      🎓 Coach messages
                    </div>
                    <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '2px' }}>
                    {coachMsgs.map(m => (
                      <div
                        key={m.chatId}
                        /* A coach reading a student's reply belongs on their own
                           dashboard (where the 💬 chat button lives), not on the
                           student-facing My Coach page. */
                        onClick={() => { handleNavigate(isCoach ? '/coach/dashboard' : '/my-coach'); setShowNotifications(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          background: 'var(--color-success-a12)', border: '1px solid var(--color-success-a20)',
                          borderRadius: 'var(--radius-md)', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-success-a30)'; e.currentTarget.style.background = 'var(--color-success-a12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-success-a20)'; e.currentTarget.style.background = 'var(--color-success-a12)'; }}
                      >
                        <UserAvatar user={m.from} size={32} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.from?.displayName}
                            </span>
                            {m.unreadCount > 1 && (
                              <span style={{ background: 'var(--color-danger)', color: 'var(--color-text)', borderRadius: 'var(--radius-pill)', fontSize: '9px', fontWeight: 800, padding: '0 5px', lineHeight: '15px', height: '15px' }}>
                                {m.unreadCount}
                              </span>
                            )}
                          </div>
                          {m.isGroup && (
                            <div style={{ fontSize: '10px', color: 'var(--color-success)', marginBottom: '1px' }}>
                              in {m.groupName}
                            </div>
                          )}
                          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.latestMessage}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </>
                )}

                {/* myNotifs must be in this test too: it feeds the badge count, so
                    leaving it out made a lone academy invite show "1" on the bell
                    above an "all caught up" panel. */}
                {appNotifications.length === 0 && friendMsgs.length === 0 && coachMsgs.length === 0 && reportReplies.length === 0 && coachRequests.length === 0 && gameInvites.length === 0 && (myNotifs.notifications || []).filter(n => !n.read).length === 0 ? (
                  <div style={{ color: 'var(--color-text-faint)', fontSize: '13px', textAlign: 'center', padding: '20px 4px' }}>
                    You're all caught up — no notifications.
                  </div>
                ) : (
                  appNotifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) { handleNavigate(n.link); setShowNotifications(false); } }}
                      style={{
                        background: 'var(--color-white-a04)',
                        border: '1px solid var(--color-white-a07)',
                        borderRadius: 'var(--radius-md)',
                        padding: '11px 12px',
                        marginBottom: '8px',
                        cursor: n.link ? 'pointer' : 'default',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-a40)'; e.currentTarget.style.background = 'var(--color-accent-a08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-white-a07)'; e.currentTarget.style.background = 'var(--color-white-a04)'; }}
                    >
                      {n.topic && <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '3px' }}>{n.topic}</div>}
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                        {n.icon && <span>{n.icon}</span>}<span>{n.title}</span>
                      </div>
                      {n.desc && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>{n.desc}</div>}
                      {n.date && <div style={{ fontSize: '10.5px', color: 'var(--color-text-faint)', marginTop: '5px' }}>{n.date}</div>}
                      {n.link && <div style={{ fontSize: '11.5px', color: 'var(--color-accent)', fontWeight: 600, marginTop: '7px' }}>{n.linkLabel || 'View →'}</div>}
                    </div>
                  ))
                )}
              </div>
            </>,
            document.body
          );
        })()
      }
    </>
  );
}

const styles = {
  sidebar: {
    width: "var(--sidebar-w)",
    // The themed rail: sidebar colour with a faint accent wash over it.
    // --color-bg (the old value) was the same near-black in every theme, so the
    // sidebar looked identical no matter what the user picked. A flat
    // --color-sidebar-bg is barely better: all six palettes are near-black, and
    // sidebar-vs-page contrast measures 1.01–1.04. The wash in --sidebar-surface
    // is what actually makes the theme visible here.
    background: "var(--sidebar-surface)",
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    boxShadow: "2px 0 20px var(--color-black-a50)",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Poppins', sans-serif",
    borderRight: "1px solid var(--sidebar-edge)",
    backdropFilter: "blur(10px)",
  },
  sidebarContent: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "20px 0",
    position: "relative",
  },
  navMenu: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "0 10px 0 3px",
    flex: 1,
    overflowY: "auto",
  },
  separator: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, var(--color-accent-a30), transparent)",
    margin: "5px 10px",
    borderRadius: "1px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "3px 12px 3px 8px",
    color: "var(--color-text)",
    cursor: "pointer",
    borderRadius: "12px",
    transition: "all 0.3s ease",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "'Poppins', sans-serif",
    justifyContent: "flex-start",
    whiteSpace: "nowrap",
    overflow: "hidden",
    background: "transparent",
    border: "1px solid transparent",
  },
  navItemActive: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "3px 12px 3px 8px",
    color: "var(--color-accent)",
    cursor: "pointer",
    borderRadius: "12px",
    transition: "all 0.3s ease",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Poppins', sans-serif",
    background: "var(--color-accent-a15)",
    border: "1px solid var(--color-accent-a30)",
    boxShadow: "0 4px 12px var(--color-accent-a20)",
    justifyContent: "flex-start",
    whiteSpace: "nowrap",
    overflow: "hidden",
    position: "relative",
  },
  navIcon: {
    fontSize: "18px",
    flexShrink: 0,
    filter: "drop-shadow(0 2px 4px var(--color-black-a35))",
  },
  navLabel: {
    flex: 1,
    fontWeight: '600',
  },
  profileButton: {
    margin: "20px",
    padding: "12px 16px",
    background: "var(--color-white-a10)",
    color: "var(--color-text)",
    border: "2px solid var(--color-white-a20)",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Poppins', sans-serif",
    cursor: "pointer",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  profileModalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "var(--color-black-a65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(10px)",
  },
  profileModal: {
    background: "var(--color-surface)",
    borderRadius: "20px",
    boxShadow: "0 20px 60px var(--color-black-a50)",
    maxWidth: "600px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
    animation: "slideIn 0.4s ease-out",
    border: "1px solid var(--color-white-a04)",
    backdropFilter: "blur(20px)",
  },
  profileModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "28px",
    borderBottom: "2px solid var(--color-accent-a20)",
    background: "linear-gradient(135deg, var(--color-accent-a12) 0%, var(--color-accent-2-a12) 100%)",
    borderRadius: "20px 20px 0 0",
    position: "relative",
    overflow: "hidden",
  },
  profileModalTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "700",
    fontFamily: "'Poppins', sans-serif",
    color: "var(--color-text)",
    background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: "0",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    transition: "all 0.3s ease",
  },
  profileModalContent: {
    padding: "28px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "20px",
  },
  infoCard: {
    background: "var(--color-surface)",
    borderRadius: "16px",
    border: "1px solid var(--color-white-a04)",
    boxShadow: "0 8px 32px var(--color-black-a50)",
    textAlign: "left",
    padding: "20px",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "default",
    color: "var(--color-text)",
    position: "relative",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    animation: "slideIn 0.5s ease-out both",
  },
  infoCardH4: {
    margin: 0,
    color: "var(--color-accent)",
    fontWeight: "600",
    fontFamily: "'Poppins', sans-serif",
    marginBottom: "10px",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
  },
  infoCardP: {
    margin: 0,
    color: "var(--color-text)",
    fontWeight: "700",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "20px",
  },
};
