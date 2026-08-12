// src/pages/InvitePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const TIER_LABELS = {
  none: { label: 'No tier yet', color: 'var(--color-text-faint)', bg: 'rgba(100,116,139,0.15)' },
  mentor: { label: '⭐ Mentor', color: 'var(--color-warning)', bg: 'var(--color-warning-a12)' },
  ambassador: { label: '🌟 Ambassador', color: 'var(--color-accent-2)', bg: 'var(--color-accent-2-a15)' }
};

const AVATAR_LABELS = {
  none: { label: 'No avatar unlock yet', color: 'var(--color-text-faint)' },
  basic: { label: '🖼️ Basic Avatars (5 invites)', color: 'var(--color-accent)' },
  custom: { label: '📷 Custom Photo (15 invites)', color: 'var(--color-success)' },
  '3d': { label: '🎭 3D Models (45 invites)', color: 'var(--color-accent-2)' }
};

export default function InvitePage() {
  const { user } = useAuth();
  const [myData, setMyData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [invites, setInvites] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [me, lb, inv] = await Promise.all([
        api.get('/api/referral/me'),
        api.get('/api/referral/leaderboard'),
        api.get('/api/referral/invites')
      ]);
      setMyData(me.data);
      setLeaderboard(lb.data);
      setInvites(inv.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyLink = async () => {
    if (!myData?.referralLink) return;
    await navigator.clipboard.writeText(myData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return (
    <div style={s.page}><div style={s.spinner} /></div>
  );

  const tier = TIER_LABELS[myData?.mentorTier || 'none'];
  const avatarUnlock = AVATAR_LABELS[myData?.unlockedAvatarTier || 'none'];

  return (
    <div style={s.page}>
      <div style={s.layout}>

        {/* ── LEFT: Leaderboard ──────────────────────────────────── */}
        <aside style={s.sidebar}>
          <h3 style={s.sidebarTitle}>🏆 Top Inviters</h3>
          <div style={s.lbList}>
            {leaderboard.slice(0, 25).map((u, i) => (
              <div key={u._id} style={{
                ...s.lbRow,
                background: String(u._id) === String(user?._id || user?.id)
                  ? 'var(--color-accent-2-a15)' : 'transparent',
                borderLeft: String(u._id) === String(user?._id || user?.id)
                  ? '3px solid var(--color-accent-2)' : '3px solid transparent'
              }}>
                <span style={s.lbRank}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div style={s.lbInfo}>
                  <span style={s.lbName}>{u.displayName || u.username}</span>
                  {u.mentorTier !== 'none' && (
                    <span style={{ fontSize: 10, color: TIER_LABELS[u.mentorTier]?.color }}>
                      {TIER_LABELS[u.mentorTier]?.label}
                    </span>
                  )}
                </div>
                <span style={s.lbCount}>{u.activeReferrals}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p style={{ color: 'var(--color-text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Be the first to invite friends!
              </p>
            )}
          </div>
        </aside>

        {/* ── MAIN: Invite Content ───────────────────────────────── */}
        <main style={s.main}>
          <h1 style={s.pageTitle}>🎁 Invite Friends</h1>
          <p style={s.pageSub}>Grow the Chess Nexus community and unlock rewards for bringing in active players.</p>

          {/* My referral link */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Your Invite Link</h2>
            <div style={s.linkRow}>
              <input
                readOnly
                value={myData?.referralLink || ''}
                style={s.linkInput}
                onFocus={(e) => e.target.select()}
              />
              <button style={{ ...s.btn, ...(copied ? s.btnCopied : {}) }} onClick={copyLink}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p style={s.hint}>
              Your referral code: <strong style={{ color: 'var(--color-accent-2)', fontFamily: 'monospace' }}>{myData?.referralCode}</strong>
            </p>
          </div>

          {/* Stats */}
          <div style={s.statsRow}>
            <div style={s.stat}>
              <div style={s.statNum}>{myData?.totalReferrals ?? 0}</div>
              <div style={s.statLabel}>Total Invites Sent</div>
            </div>
            <div style={s.stat}>
              <div style={{ ...s.statNum, color: '#4ade80' }}>{myData?.activeReferrals ?? 0}</div>
              <div style={s.statLabel}>Active Friends</div>
            </div>
            <div style={s.stat}>
              <div style={{ ...s.statNum, color: 'var(--color-warning)' }}>{myData?.inviteQualityScore ?? 0}</div>
              <div style={s.statLabel}>Quality Score</div>
            </div>
          </div>

          {/* Mentor tier */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Your Status</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ ...s.badge, background: tier.bg, color: tier.color }}>
                {tier.label}
              </span>
              <span style={{ ...s.badge, background: 'rgba(30,30,50,0.5)', color: avatarUnlock.color }}>
                {avatarUnlock.label}
              </span>
            </div>
            <div style={s.milestoneBar}>
              {[
                { need: 5, label: 'Basic Avatars', tier: 'basic' },
                { need: 15, label: 'Custom Photo', tier: 'custom' },
                { need: 45, label: '3D Models + Ambassador', tier: '3d' }
              ].map(({ need, label }) => {
                const done = (myData?.totalReferrals || 0) >= need;
                return (
                  <div key={need} style={{ ...s.milestone, opacity: done ? 1 : 0.5 }}>
                    <div style={{ ...s.mileDot, background: done ? 'var(--color-accent-2)' : '#334155' }} />
                    <div>
                      <div style={{ color: done ? 'var(--color-text)' : 'var(--color-text-faint)', fontSize: 13, fontWeight: 600 }}>
                        {done ? '✓ ' : ''}{label}
                      </div>
                      <div style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>{need} verified invites</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Invites */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>People You Invited ({invites.length})</h2>
            {invites.length === 0 ? (
              <p style={{ color: 'var(--color-text-faint)', fontSize: 14 }}>
                No invites yet. Share your link above to get started!
              </p>
            ) : (
              <div style={s.inviteList}>
                {invites.map(inv => (
                  <div key={inv.id} style={s.inviteRow}>
                    <div>
                      <div style={s.inviteName}>{inv.user?.displayName || inv.user?.username || 'Unknown'}</div>
                      <div style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>Joined {new Date(inv.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <span style={{
                      ...s.badge,
                      background: inv.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(100,116,139,0.15)',
                      color: inv.status === 'active' ? '#4ade80' : 'var(--color-text-muted)',
                      fontSize: 12
                    }}>
                      {inv.status === 'active' ? '✓ Active' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>How It Works</h2>
            <ol style={{ paddingLeft: 20, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 2, margin: 0 }}>
              <li>Share your invite link with friends.</li>
              <li>They sign up and verify their email.</li>
              <li>Once they play games or solve puzzles (earning 10 activity points), they become <strong style={{ color: '#4ade80' }}>Active</strong>.</li>
              <li>Unlock avatar tiers, mentor status, and climb the leaderboard!</li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-surface)',
    padding: '24px 16px',
    color: 'var(--color-text)'
  },
  layout: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start'
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-white-a07)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px 16px',
    position: 'sticky',
    top: 80
  },
  sidebarTitle: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--color-text)'
  },
  lbList: { display: 'flex', flexDirection: 'column', gap: 4 },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 'var(--radius-md)',
    cursor: 'default',
    transition: 'background 0.2s'
  },
  lbRank: { fontSize: 13, minWidth: 28, color: 'var(--color-text-muted)' },
  lbInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  lbName: { fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  lbCount: { fontSize: 13, fontWeight: 700, color: 'var(--color-accent-2)', minWidth: 20, textAlign: 'right' },
  main: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text)' },
  pageSub: { color: 'var(--color-text-faint)', fontSize: 14, margin: '0 0 24px' },
  card: {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid var(--color-white-a07)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px 24px',
    marginBottom: 20
  },
  cardTitle: { margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' },
  linkRow: { display: 'flex', gap: 10, marginBottom: 8 },
  linkInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'var(--color-black-a35)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-muted)',
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none'
  },
  btn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg,var(--color-accent-2),#6d28d9)',
    color: 'var(--color-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
  },
  btnCopied: { background: 'linear-gradient(135deg,var(--color-accent-2),#047857)' },
  hint: { color: 'var(--color-text-faint)', fontSize: 13, margin: 0 },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  stat: {
    flex: 1,
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid var(--color-white-a07)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 20px',
    textAlign: 'center'
  },
  statNum: { fontSize: 28, fontWeight: 800, color: 'var(--color-accent-2)' },
  statLabel: { fontSize: 12, color: 'var(--color-text-faint)', marginTop: 4 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 'var(--radius-2xl)',
    fontSize: 13,
    fontWeight: 600
  },
  milestoneBar: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 },
  milestone: { display: 'flex', alignItems: 'center', gap: 12 },
  mileDot: { width: 10, height: 10, borderRadius: 'var(--radius-circle)', flexShrink: 0 },
  inviteList: { display: 'flex', flexDirection: 'column', gap: 8 },
  inviteRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--color-white-a04)'
  },
  inviteName: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)' },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid var(--color-accent-2-a15)',
    borderTopColor: 'var(--color-accent-2)',
    borderRadius: 'var(--radius-circle)',
    animation: 'spin 0.8s linear infinite',
    margin: '200px auto'
  }
};
