import api from '../api';

/**
 * Launch the live 3D Chess Arena — an extension of Chess Nexus that shares the
 * same login. Fetches a short-lived SSO token and sends the user into the 3D app.
 *
 * Guests / logged-out users are redirected to login first.
 *
 * @param {object}   opts
 * @param {object}   opts.user      current user from useAuth()
 * @param {boolean}  opts.loading   auth loading flag from useAuth()
 * @param {function} opts.navigate  react-router navigate()
 * @param {boolean} [opts.sameTab]  redirect the current tab instead of opening a new one
 */
export function launch3DArena({ user, loading, navigate, sameTab = false }) {
  if (loading || !user || user.role === 'guest') {
    navigate('/login', { state: { message: 'Please log in to access the 3D Arena.' } });
    return;
  }

  const base = import.meta.env.VITE_3D_ARENA_URL || 'https://3darena.chessnexus.in';

  // For a new tab we must open it synchronously (before the async token call)
  // so the browser doesn't block it as a popup. Same-tab can redirect after.
  const newTab = sameTab ? null : window.open('', '_blank');
  const go = (url) => {
    if (sameTab) window.location.href = url;
    else if (newTab) newTab.location.href = url;
  };

  api
    .get('/api/auth/arena-token')
    .then((res) => go(`${base}?token=${encodeURIComponent(res.data.token)}`))
    .catch(() => {
      const token = localStorage.getItem('authToken');
      go(token ? `${base}?token=${encodeURIComponent(token)}` : base);
    });
}
