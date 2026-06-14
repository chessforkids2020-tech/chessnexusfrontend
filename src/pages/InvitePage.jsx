// src/pages/InvitePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const TIER_LABELS = {
  none: { label: 'No tier yet', color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  mentor: { label: '⭐ Mentor', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  ambassador: { label: '🌟 Ambassador', color: '#8b5cf6', bg: 'rgba(139,92,246,0.2)' }
};

const AVATAR_LABELS = {
  none: { label: 'No avatar unlock yet', color: '#64748b' },
  basic: { label: '🖼️ Basic Avatars (5 invites)', color: '#06b6d4' },
  custom: { label: '📷 Custom Photo (15 invites)', color: '#10b981' },
  '3d': { label: '🎭 3D Models (45 invites)', color: '#8b5cf6' }
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
                  ? 'rgba(139,92,246,0.15)' : 'transparent',
                borderLeft: String(u._id) === String(user?._id || user?.id)
                  ? '3px solid #8b5cf6' : '3px solid transparent'
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
              <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
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
              Your referral code: <strong style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{myData?.referralCode}</strong>
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
              <div style={{ ...s.statNum, color: '#fbbf24' }}>{myData?.inviteQualityScore ?? 0}</div>
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
                    <div style={{ ...s.mileDot, background: done ? '#8b5cf6' : '#334155' }} />
                    <div>
                      <div style={{ color: done ? '#e2e8f0' : '#64748b', fontSize: 13, fontWeight: 600 }}>
                        {done ? '✓ ' : ''}{label}
                      </div>
                      <div style={{ color: '#475569', fontSize: 12 }}>{need} verified invites</div>
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
              <p style={{ color: '#64748b', fontSize: 14 }}>
                No invites yet. Share your link above to get started!
              </p>
            ) : (
              <div style={s.inviteList}>
                {invites.map(inv => (
                  <div key={inv.id} style={s.inviteRow}>
                    <div>
                      <div style={s.inviteName}>{inv.user?.displayName || inv.user?.username || 'Unknown'}</div>
                      <div style={{ color: '#475569', fontSize: 12 }}>Joined {new Date(inv.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <span style={{
                      ...s.badge,
                      background: inv.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(100,116,139,0.15)',
                      color: inv.status === 'active' ? '#4ade80' : '#94a3b8',
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
            <ol style={{ paddingLeft: 20, color: '#94a3b8', fontSize: 14, lineHeight: 2, margin: 0 }}>
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
    background: '#0f172a',
    padding: '24px 16px',
    color: '#e2e8f0'
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
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '20px 16px',
    position: 'sticky',
    top: 80
  },
  sidebarTitle: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 700,
    color: '#e2e8f0'
  },
  lbList: { display: 'flex', flexDirection: 'column', gap: 4 },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 8,
    cursor: 'default',
    transition: 'background 0.2s'
  },
  lbRank: { fontSize: 13, minWidth: 28, color: '#94a3b8' },
  lbInfo: { flex: 1, display: 'flex', flexDirection: 'column' },
  lbName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  lbCount: { fontSize: 13, fontWeight: 700, color: '#8b5cf6', minWidth: 20, textAlign: 'right' },
  main: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: '#f1f5f9' },
  pageSub: { color: '#64748b', fontSize: 14, margin: '0 0 24px' },
  card: {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '20px 24px',
    marginBottom: 20
  },
  cardTitle: { margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#f1f5f9' },
  linkRow: { display: 'flex', gap: 10, marginBottom: 8 },
  linkInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#cbd5e1',
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none'
  },
  btn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
  },
  btnCopied: { background: 'linear-gradient(135deg,#059669,#047857)' },
  hint: { color: '#64748b', fontSize: 13, margin: 0 },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  stat: {
    flex: 1,
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: '16px 20px',
    textAlign: 'center'
  },
  statNum: { fontSize: 28, fontWeight: 800, color: '#a78bfa' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600
  },
  milestoneBar: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 },
  milestone: { display: 'flex', alignItems: 'center', gap: 12 },
  mileDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  inviteList: { display: 'flex', flexDirection: 'column', gap: 8 },
  inviteRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  inviteName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(139,92,246,0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '200px auto'
  }
};
