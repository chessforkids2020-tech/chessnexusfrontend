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
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: '2px', boxShadow: '0 0 1px rgba(0,0,0,0.4)', ...style }}
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
    const poll = () => { fetchFriendUnread(); fetchReportReplies(); fetchCoachRequests(); fetchAppNotifications(); fetchOnlineFriends(); fetchGameInvites(); };
    poll();
    // Poll faster (30s) while either the bell or friends panel is open.
    const intervalMs = (showNotifications || showFriends) ? 30000 : 120000;
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchFriendUnread, fetchReportReplies, fetchCoachRequests, fetchAppNotifications, fetchOnlineFriends, fetchGameInvites, showNotifications, showFriends]);

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

  // Total red badge = unread app notifications + friend messages + report replies + coach requests + game invites
  const unreadNotifCount = appUnreadCount + friendMsgTotal + reportReplies.length + coachRequests.length + gameInvites.length;

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
    const checkAnalysisJob = () => {
      try {
        const raw = localStorage.getItem('analysisJob');
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

  return (
    <>
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

      {/* Mobile Hamburger Menu Button - Only show if not controlled by parent */}
      {!onNavigate && (isMobile && !isLandscape) && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1002,
            background: 'rgba(10, 10, 10, 0.8)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#67e8f9',
            fontSize: '24px',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(10, 10, 10, 0.8)';
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
          {/* Close button for mobile expanded view */}
          {(isMobile || isLandscape) && isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                position: 'absolute',
                top: '90px',
                right: '10px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#67e8f9',
                fontSize: '20px',
                cursor: 'pointer',
                borderRadius: '12px',
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
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.color = '#67e8f9';
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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/') ? '#06b6d4' : '#ffffff';
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
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  animation: 'pulse 2s infinite',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
                onClick={() => {
                  if ((isMobile || isLandscape) && !isExpanded) {
                    setIsExpanded(true);
                  } else {
                    handleNavigate(`/game/live/${currentGame}`);
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.borderLeft = '5px solid #ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.color = '#ef4444';
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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/dashboard') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/dashboard') ? '#06b6d4' : '#ffffff';
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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/puzzles-hub') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/puzzles-hub') ? '#06b6d4' : '#ffffff';
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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/race') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/race') ? '#06b6d4' : '#ffffff';
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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/study') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/study') ? '#06b6d4' : '#ffffff';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Study"
            >
              <span style={styles.navIcon}>📚</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Study</span>}
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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/games') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/games') ? '#06b6d4' : '#ffffff';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="Play"
            >
              <span style={styles.navIcon}>🎮</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>Play</span>}
            </div>

            {/* 3D Arena nav item — visible to all; guests are redirected to login */}
            <div 
              style={styles.navItem}
              onClick={() => {
                if (!user || user.role === 'guest') {
                  navigate('/login', { state: { message: 'Please log in to access the 3D Arena.' } });
                  return;
                }
                const base = import.meta.env.VITE_3D_ARENA_URL || 'https://3darena.chessnexus.in';
                // Open blank tab synchronously so browsers don't block it as a popup.
                // Do NOT use noopener/noreferrer — they prevent navigating the new tab.
                const newTab = window.open('', '_blank');
                api.get('/api/auth/arena-token')
                  .then(res => {
                    if (newTab) newTab.location.href = `${base}?token=${encodeURIComponent(res.data.token)}`;
                  })
                  .catch(() => {
                    const token = localStorage.getItem('authToken');
                    if (newTab) newTab.location.href = token ? `${base}?token=${encodeURIComponent(token)}` : base;
                  });
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                e.currentTarget.style.color = '#a78bfa';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #8b5cf6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderLeft = 'none';
              }}
              title="3D Arena"
            >
              <span style={styles.navIcon}>🎮</span>
              {(!(isMobile || isLandscape) || isExpanded) && <span style={styles.navLabel}>3D Arena</span>}
            </div>

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
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.borderLeft = '5px solid #10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive('/game-analysis') ? 'rgba(6, 182, 212, 0.15)' : 'transparent';
                e.currentTarget.style.color = isActive('/game-analysis') ? '#06b6d4' : '#ffffff';
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
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: '#06b6d4',
                  animation: 'pulse 2s infinite',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
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
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.22)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                  e.currentTarget.style.color = '#06b6d4';
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
                e.currentTarget.style.background = 'rgba(6,182,212,0.15)';
                e.currentTarget.style.color = '#06b6d4';
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                const socialActive = isActive('/social') || isActive('/players') || isActive('/invite') || isActive('/friends') || isActive('/clubs');
                e.currentTarget.style.background = socialActive ? 'rgba(6,182,212,0.15)' : 'transparent';
                e.currentTarget.style.color = socialActive ? '#06b6d4' : '#ffffff';
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
                    transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b',
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
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(6,182,212,0.4)',
                      borderRadius: '10px',
                      color: '#f1f5f9',
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                margin: '10px 0 20px 0',
                overflow: 'hidden',
              }}>
                {/* Notifications bell */}
                <button
                  ref={bellRef}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', position: 'relative',
                    background: showNotifications ? 'rgba(6,182,212,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: showNotifications ? '#06b6d4' : '#94a3b8',
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; e.currentTarget.style.color = '#06b6d4'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = showNotifications ? 'rgba(6,182,212,0.15)' : 'transparent';
                    e.currentTarget.style.color = showNotifications ? '#06b6d4' : '#94a3b8';
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
                      background: '#ef4444', color: '#fff', borderRadius: '999px',
                      fontSize: '10px', fontWeight: 800, lineHeight: '16px', textAlign: 'center',
                      boxShadow: '0 0 0 2px rgba(10,10,10,0.95)',
                    }}>
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />

                {/* Settings (Profile now lives inside Settings → Profile tab) */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0',
                    background: location.pathname === '/settings' ? 'rgba(6,182,212,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: location.pathname === '/settings' ? '#06b6d4' : '#94a3b8',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    if ((isMobile || isLandscape) && !isExpanded) { setIsExpanded(true); }
                    else { handleNavigate('/settings'); }
                  }}
                  title="Settings"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; e.currentTarget.style.color = '#06b6d4'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = location.pathname === '/settings' ? 'rgba(6,182,212,0.15)' : 'transparent';
                    e.currentTarget.style.color = location.pathname === '/settings' ? '#06b6d4' : '#94a3b8';
                  }}
                >
                  {/* Gear / cog icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />

                {/* Friends online toggle (replaces player search for logged-in users) */}
                <button
                  ref={friendsRef}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', position: 'relative',
                    background: showFriends ? 'rgba(16,185,129,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: showFriends ? '#34d399' : '#94a3b8',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    if ((isMobile || isLandscape) && !isExpanded) { setIsExpanded(true); return; }
                    const next = !showFriends;
                    setShowFriends(next);
                    if (next) fetchOnlineFriends(); // refresh on open
                  }}
                  title={onlineFriends.length > 0 ? `${onlineFriends.length} friend${onlineFriends.length === 1 ? '' : 's'} online` : 'Friends online'}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.color = '#34d399'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = showFriends ? 'rgba(16,185,129,0.15)' : 'transparent'; e.currentTarget.style.color = showFriends ? '#34d399' : '#94a3b8'; }}
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
                      background: '#22c55e', color: '#062611', borderRadius: '999px',
                      fontSize: '10px', fontWeight: 800, lineHeight: '16px', textAlign: 'center',
                      boxShadow: '0 0 0 2px rgba(10,10,10,0.95)',
                    }}>
                      {onlineFriends.length}
                    </span>
                  )}
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />

                {/* Logout */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={async () => { await logout(); navigate('/', { replace: true }); }}
                  title="Logout"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
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
                    background: location.pathname.startsWith('/coach') ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.07)',
                    border: '1px solid rgba(6,182,212,0.28)',
                    color: location.pathname.startsWith('/coach') ? '#06b6d4' : '#a5f3fc',
                    marginTop: '4px',
                    borderRadius: '10px',
                  }}
                  onClick={() => handleNavigate('/coach/dashboard')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.2)'; e.currentTarget.style.color = '#06b6d4'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = location.pathname.startsWith('/coach') ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.07)'; e.currentTarget.style.color = location.pathname.startsWith('/coach') ? '#06b6d4' : '#a5f3fc'; e.currentTarget.style.transform = 'translateX(0)'; }}
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                margin: '10px 0 20px 0',
                overflow: 'hidden',
              }}>
                {/* Search toggle */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0',
                    background: showQuickSearch ? 'rgba(6,182,212,0.15)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: showQuickSearch ? '#06b6d4' : '#94a3b8',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => {
                    const next = !showQuickSearch;
                    setShowQuickSearch(next);
                    if (!next) { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }
                  }}
                  title="Search Players"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.15)'; e.currentTarget.style.color = '#06b6d4'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = showQuickSearch ? 'rgba(6,182,212,0.15)' : 'transparent'; e.currentTarget.style.color = showQuickSearch ? '#06b6d4' : '#94a3b8'; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />

                {/* Login */}
                <button
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '11px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', transition: 'background 0.2s, color 0.2s',
                  }}
                  onClick={() => navigate('/login')}
                  title="Login"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.color = '#10b981'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                </button>

                {/* Guest: also show Leave button */}
                {user?.role === 'guest' && (
                  <>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />
                    <button
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '11px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', transition: 'background 0.2s, color 0.2s',
                      }}
                      onClick={async () => { await logout(); navigate('/', { replace: true }); }}
                      title="Leave (end guest session)"
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
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
                background: 'rgba(10,15,30,0.98)',
                border: '1px solid rgba(6,182,212,0.3)',
                borderRadius: '12px',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.65)',
                zIndex: 9999,
                backdropFilter: 'blur(16px)',
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              {searchLoading && (
                <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                  Searching...
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
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
                    borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <UserAvatar user={player} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
                      {player.displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      {player.country ? `${player.country} · ` : ''}{player.liveRating} pts
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#475569', flexShrink: 0, marginLeft: '8px' }}>→</span>
                </div>
              ))}
            </div>,
            document.body
          );
        })()
      }

      {/* ── Friends-online panel — overlay anchored to the friends button ── */}
      {showFriends && isAuthenticated &&
        (() => {
          const rect = friendsRef.current?.getBoundingClientRect();
          if (!rect) return null;
          return createPortal(
            <>
              {/* click-away backdrop */}
              <div
                onClick={() => setShowFriends(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }}
              />
              <div
                style={{
                  position: 'fixed',
                  bottom: window.innerHeight - rect.top + 8,
                  left: rect.left,
                  width: 'max-content',
                  minWidth: '280px',
                  maxWidth: '360px',
                  background: 'rgba(10,15,30,0.98)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: '14px',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.65)',
                  zIndex: 9999,
                  backdropFilter: 'blur(16px)',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '12px',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0 }} />
                    Friends online
                    <span style={{ color: '#34d399', fontWeight: 800 }}>{onlineFriends.length}</span>
                  </span>
                  <button
                    onClick={() => setShowFriends(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '15px' }}
                    title="Close"
                  >✕</button>
                </div>

                {onlineFriends.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 4px' }}>
                    None of your friends are online right now.
                    <div
                      onClick={() => { handleNavigate('/social'); setShowFriends(false); }}
                      style={{ fontSize: '11.5px', color: '#34d399', fontWeight: 600, marginTop: '10px', cursor: 'pointer' }}
                    >
                      Go to Social Hub →
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
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '10px', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      >
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <UserAvatar user={f} size={34} />
                          <span style={{
                            position: 'absolute', bottom: '-1px', right: '-1px',
                            width: '11px', height: '11px', borderRadius: '999px',
                            background: '#22c55e', border: '2px solid rgba(10,15,30,0.98)',
                          }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.displayName || f.username}
                          </div>
                          <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                            ● Online
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#475569', flexShrink: 0, marginLeft: '6px' }}>→</span>
                      </div>
                    ))}
                    <div
                      onClick={() => { handleNavigate('/social'); setShowFriends(false); }}
                      style={{ fontSize: '11.5px', color: '#34d399', fontWeight: 600, textAlign: 'right', cursor: 'pointer', marginTop: '2px' }}
                    >
                      Open Social Hub →
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
                style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }}
              />
              <div
                style={{
                  position: 'fixed',
                  bottom: window.innerHeight - rect.top + 8,
                  left: rect.left,
                  width: 'max-content',
                  minWidth: '300px',
                  maxWidth: '380px',
                  background: 'rgba(10,15,30,0.98)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  borderRadius: '14px',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.65)',
                  zIndex: 9999,
                  backdropFilter: 'blur(16px)',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '12px',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>🔔 Notifications</span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '15px' }}
                    title="Close"
                  >✕</button>
                </div>

                {/* Game invites — someone invited this user to play a friend game */}
                {gameInvites.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
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
                            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: '10px', padding: '9px 11px', marginBottom: '8px',
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#6ee7b7' }}>
                            ♟️ <strong>{fromName}</strong> wants to play {tc}{variant}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => respondToGameInvite(inv._id, 'accept', inv.roomCode)}
                              style={{ flex: 1, background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '8px', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✓ Accept</button>
                            <button
                              onClick={() => respondToGameInvite(inv._id, 'decline', inv.roomCode)}
                              style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
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
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      🎓 Coach requests
                    </div>
                    {coachRequests.map(r => {
                      const coach = r.coachId || {};
                      const coachName = coach.displayName || coach.username || 'A coach';
                      return (
                        <div
                          key={r._id}
                          style={{
                            background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)',
                            borderRadius: '10px', padding: '9px 11px', marginBottom: '8px',
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#c4b5fd' }}>
                            🎓 Coach <strong>{coachName}</strong> wants to add you as a student
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => respondToCoachRequest(r._id, 'approve')}
                              style={{ flex: 1, background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '8px', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✓ Approve</button>
                            <button
                              onClick={() => respondToCoachRequest(r._id, 'decline')}
                              style={{ flex: 1, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >✕ Decline</button>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      onClick={() => { handleNavigate('/coach-requests'); setShowNotifications(false); }}
                      style={{ fontSize: '11px', color: '#a78bfa', cursor: 'pointer', textAlign: 'right', marginBottom: '10px' }}
                    >
                      See all requests →
                    </div>
                  </>
                )}

                {/* Report replies — admin answered a report. Click to read the full reply. */}
                {reportReplies.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      🚩 Report replies
                    </div>
                    {reportReplies.map(r => (
                      <div
                        key={r._id}
                        onClick={() => { handleNavigate('/my-reports'); setShowNotifications(false); }}
                        style={{
                          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
                          borderRadius: '10px', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; e.currentTarget.style.background = 'rgba(245,158,11,0.06)'; }}
                      >
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fcd34d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          ♟️ Team replied: {r.subject}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#cbd5e1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.reply}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>
                          Tap to read full reply →
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Friend messages — unread chats from friends */}
                {friendMsgs.length > 0 && (
                  <>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '2px 0 6px' }}>
                      💬 Messages
                    </div>
                    <div style={{ maxHeight: '210px', overflowY: 'auto', paddingRight: '2px' }}>
                    {friendMsgs.map(m => (
                      <div
                        key={m.chatId}
                        onClick={() => { handleNavigate('/social/chat'); setShowNotifications(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '10px', padding: '9px 11px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      >
                        <UserAvatar user={m.friend} size={32} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.friend?.displayName}
                            </span>
                            {m.unreadCount > 1 && (
                              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '9px', fontWeight: 800, padding: '0 5px', lineHeight: '15px', height: '15px' }}>
                                {m.unreadCount}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.latestMessage}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                    {appNotifications.length > 0 && (
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '8px 0 6px' }}>
                        📢 Updates
                      </div>
                    )}
                  </>
                )}

                {appNotifications.length === 0 && friendMsgs.length === 0 && reportReplies.length === 0 && coachRequests.length === 0 && gameInvites.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 4px' }}>
                    You're all caught up — no notifications.
                  </div>
                ) : (
                  appNotifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) { handleNavigate(n.link); setShowNotifications(false); } }}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px',
                        padding: '11px 12px',
                        marginBottom: '8px',
                        cursor: n.link ? 'pointer' : 'default',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.background = 'rgba(6,182,212,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    >
                      {n.topic && <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#67e8f9', marginBottom: '3px' }}>{n.topic}</div>}
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                        {n.icon && <span>{n.icon}</span>}<span>{n.title}</span>
                      </div>
                      {n.desc && <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.55 }}>{n.desc}</div>}
                      {n.date && <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '5px' }}>{n.date}</div>}
                      {n.link && <div style={{ fontSize: '11.5px', color: '#06b6d4', fontWeight: 600, marginTop: '7px' }}>{n.linkLabel || 'View →'}</div>}
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
    width: "170px",
    background: "rgba(10, 10, 10, 0.95)",
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    boxShadow: "2px 0 20px rgba(0,0,0,0.5)",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Poppins', sans-serif",
    borderRight: "1px solid rgba(255, 255, 255, 0.05)",
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
    background: "linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent)",
    margin: "5px 10px",
    borderRadius: "1px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "3px 12px 3px 8px",
    color: "#ffffff",
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
    color: "#06b6d4",
    cursor: "pointer",
    borderRadius: "12px",
    transition: "all 0.3s ease",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Poppins', sans-serif",
    background: "rgba(6, 182, 212, 0.15)",
    border: "1px solid rgba(6, 182, 212, 0.3)",
    boxShadow: "0 4px 12px rgba(6, 182, 212, 0.2)",
    justifyContent: "flex-start",
    whiteSpace: "nowrap",
    overflow: "hidden",
    position: "relative",
  },
  navIcon: {
    fontSize: "18px",
    flexShrink: 0,
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  },
  navLabel: {
    flex: 1,
    fontWeight: '600',
  },
  profileButton: {
    margin: "20px",
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    border: "2px solid rgba(255, 255, 255, 0.2)",
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
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(10px)",
  },
  profileModal: {
    background: "rgba(23, 23, 23, 0.95)",
    borderRadius: "20px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    maxWidth: "600px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
    animation: "slideIn 0.4s ease-out",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(20px)",
  },
  profileModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "28px",
    borderBottom: "2px solid rgba(6, 182, 212, 0.2)",
    background: "linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
    borderRadius: "20px 20px 0 0",
    position: "relative",
    overflow: "hidden",
  },
  profileModalTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "700",
    fontFamily: "'Poppins', sans-serif",
    color: "#ffffff",
    background: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    color: "#9ca3af",
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
    background: "rgba(23, 23, 23, 0.7)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
    textAlign: "left",
    padding: "20px",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "default",
    color: "#ffffff",
    position: "relative",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    animation: "slideIn 0.5s ease-out both",
  },
  infoCardH4: {
    margin: 0,
    color: "#67e8f9",
    fontWeight: "600",
    fontFamily: "'Poppins', sans-serif",
    marginBottom: "10px",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
  },
  infoCardP: {
    margin: 0,
    color: "#ffffff",
    fontWeight: "700",
    fontFamily: "'Poppins', sans-serif",
    fontSize: "20px",
  },
};
