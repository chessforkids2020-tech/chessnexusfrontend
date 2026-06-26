// src/components/AvatarStudio.jsx
// Avatar Studio — pick a basic avatar, upload a custom picture, or choose a 3D
// model. Extracted from the profile panel so it can live on the Settings page.
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api, { resolveApiAssetUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';

const AVATAR_TIER_RANK = { none: 0, basic: 1, customPhoto: 2, '3d': 3 };
const tierUnlocked = (userTier, requiredTier) =>
  (AVATAR_TIER_RANK[userTier] || 0) >= (AVATAR_TIER_RANK[requiredTier] || 0);

const cardStyle = {
  background: 'rgba(23, 23, 23, 0.7)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  textAlign: 'left',
  padding: '20px',
  color: '#ffffff',
  position: 'relative',
  overflow: 'hidden',
  backdropFilter: 'blur(10px)',
};
const h4Style = {
  margin: 0,
  color: '#67e8f9',
  fontWeight: '600',
  fontFamily: "'Poppins', sans-serif",
  marginBottom: '10px',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
};

export default function AvatarStudio() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [avatarOptions, setAvatarOptions] = useState({ basicOptions: [], model3dOptions: [] });
  const [, setAvatarLoading] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarPickerType, setAvatarPickerType] = useState(null);
  // XP unlock state (alternative to invites).
  const [walletXp, setWalletXp] = useState(0);
  const [xpPrices, setXpPrices] = useState({ customPhoto: 0, '3d': 0 });
  const [unlockTier, setUnlockTier] = useState(null);   // tier currently being purchased

  const loadAvatarOptions = async () => {
    setAvatarLoading(true);
    setAvatarError('');
    try {
      const res = await api.get('/api/auth/avatar-options');
      setAvatarOptions({
        basicOptions: res.data?.basicOptions || [],
        model3dOptions: res.data?.model3dOptions || [],
      });
      setWalletXp(res.data?.walletXp || 0);
      setXpPrices(res.data?.xpPrices || { customPhoto: 0, '3d': 0 });
    } catch {
      setAvatarError('Failed to load avatar gallery');
    } finally {
      setAvatarLoading(false);
    }
  };

  useEffect(() => {
    loadAvatarOptions();
  }, []);

  // Spend wallet XP to unlock a customization tier (customPhoto | 3d).
  const unlockWithXp = async (tier) => {
    if (unlockTier) return;
    setUnlockTier(tier);
    setAvatarError('');
    try {
      await api.post('/api/auth/avatar/unlock', { tier });
      await refreshUser();        // user.unlockedAvatarTier now raised
      await loadAvatarOptions();  // refresh wallet + prices
    } catch (error) {
      const d = error.response?.data;
      if (d?.shortfall) setAvatarError(`Not enough XP — you need ${d.shortfall} more.`);
      else setAvatarError(d?.message || 'Could not unlock this.');
    } finally {
      setUnlockTier(null);
    }
  };

  const saveAvatarChoice = async (payload) => {
    setAvatarSaving(true);
    setAvatarError('');
    try {
      await api.put('/api/auth/profile/avatar', payload);
      await refreshUser();
      return true;
    } catch (error) {
      setAvatarError(error.response?.data?.message || 'Failed to save avatar choice');
      return false;
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleCustomPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image too large. Please use an image up to 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await saveAvatarChoice({ type: 'customPhoto', imageDataUrl: reader.result });
    };
    reader.onerror = () => setAvatarError('Could not read image file');
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  const selectedBasicAvatar = avatarOptions.basicOptions.find(opt => opt.key === user?.activeAvatar);
  const selected3dModel = avatarOptions.model3dOptions.find(opt => opt.key === user?.active3dModel);
  const currentAvatarTier = user?.unlockedAvatarTier || 'none';

  const isTierUnlocked = (type) => {
    if (type === 'basic') return true;
    if (type === 'customPhoto') return tierUnlocked(currentAvatarTier, 'customPhoto');
    if (type === '3d') return tierUnlocked(currentAvatarTier, '3d');
    return false;
  };

  const openAvatarPicker = (type) => {
    setAvatarError('');
    setAvatarPickerType(type);
    setAvatarPickerOpen(true);
  };

  const closeAvatarPicker = () => {
    if (avatarSaving) return;
    setAvatarPickerOpen(false);
    setAvatarPickerType(null);
  };

  const chooseFromGrid = async (type, key) => {
    const ok = await saveAvatarChoice({ type, key });
    if (ok) closeAvatarPicker();
  };

  const getPickerTitle = () => {
    if (avatarPickerType === 'basic') return 'Choose Basic Avatar';
    if (avatarPickerType === 'customPhoto') return 'Upload Custom Picture';
    if (avatarPickerType === '3d') return 'Choose 3D Avatar';
    return 'Choose Avatar';
  };

  const getAvatarPickerGridColumns = () => {
    const w = window.innerWidth;
    if (w <= 520) return 2;
    if (w <= 760) return 3;
    if (w <= 1050) return 4;
    return 5;
  };

  const getAvatarTypeCardColumns = () => {
    const w = window.innerWidth;
    if (w <= 520) return 1;
    if (w <= 900) return 2;
    return 4;
  };

  const pickerGridCols = getAvatarPickerGridColumns();
  const pickerMinTile = pickerGridCols <= 2 ? 116 : pickerGridCols === 3 ? 110 : 102;
  const cardGridCols = getAvatarTypeCardColumns();

  const renderImageGrid = (items, type, activeKey, accentColor) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${pickerGridCols}, minmax(${pickerMinTile}px, 1fr))`,
      gap: 12,
      marginTop: 10,
    }}>
      {items.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => chooseFromGrid(type, opt.key)}
          disabled={avatarSaving}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 12,
            border: activeKey === opt.key ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(0,0,0,0.35)',
            cursor: avatarSaving ? 'not-allowed' : 'pointer',
            overflow: 'hidden',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 24,
          }}
        >
          {opt.imageUrl ? (
            <img src={resolveApiAssetUrl(opt.imageUrl)} alt="avatar option" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{opt.emoji || '🧩'}</span>
          )}
        </button>
      ))}
    </div>
  );

  const avatarPickerModal = avatarPickerOpen ? createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(2,6,23,0.8)',
      zIndex: 20000,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '20px 12px',
      overflowY: 'auto',
    }} onClick={closeAvatarPicker}>
      <div style={{
        width: 'min(1100px, 98vw)',
        maxHeight: '94vh',
        overflowY: 'auto',
        background: 'linear-gradient(180deg, #0f172a, #111827)',
        border: '1px solid rgba(148,163,184,0.35)',
        borderRadius: 16,
        padding: 18,
        scrollbarGutter: 'stable',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 20 }}>{getPickerTitle()}</h3>
          <button type="button" onClick={closeAvatarPicker} style={{
            background: 'transparent',
            color: '#cbd5e1',
            border: '1px solid rgba(148,163,184,0.45)',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
          }}>Close</button>
        </div>

        {avatarPickerType === 'basic' && (
          <>
            <p style={{ color: '#93c5fd', fontSize: 13, marginTop: 0 }}>Choose any picture. Selection is applied immediately.</p>
            {renderImageGrid(avatarOptions.basicOptions, 'basic', user.activeAvatar, '#06b6d4')}
          </>
        )}

        {avatarPickerType === 'customPhoto' && (
          isTierUnlocked('customPhoto') ? (
            <>
              <p style={{ color: '#fcd34d', fontSize: 13, marginTop: 0 }}>Upload from your device. Image is applied immediately.</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomPhotoUpload}
                disabled={avatarSaving}
                style={{ width: '100%' }}
              />
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 8 }}>Max size: 2MB</div>
            </>
          ) : (
            <div style={{
              border: '1px dashed rgba(245,158,11,0.5)',
              background: 'rgba(245,158,11,0.12)',
              borderRadius: 12,
              padding: 14,
              color: '#fde68a',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Unlock Custom Picture</div>
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                Spend <strong>{xpPrices.customPhoto} XP</strong> from your wallet
                {' '}(you have <strong style={{ color: walletXp >= xpPrices.customPhoto ? '#86efac' : '#fca5a5' }}>{walletXp} XP</strong>),
                {' '}or invite 5 friends to unlock it free.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={walletXp < xpPrices.customPhoto || unlockTier === 'customPhoto'}
                  onClick={() => unlockWithXp('customPhoto')}
                  style={{
                    border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 800, cursor: walletXp < xpPrices.customPhoto ? 'not-allowed' : 'pointer',
                    background: walletXp < xpPrices.customPhoto ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    color: walletXp < xpPrices.customPhoto ? '#94a3b8' : '#fff',
                  }}
                >
                  {unlockTier === 'customPhoto' ? 'Unlocking…' : (walletXp < xpPrices.customPhoto ? `Need ${xpPrices.customPhoto - walletXp} more XP` : `👛 Unlock for ${xpPrices.customPhoto} XP`)}
                </button>
                <button type="button" onClick={() => { closeAvatarPicker(); navigate('/social'); }} style={{
                  border: 'none', borderRadius: 8, padding: '8px 12px', background: '#f59e0b', color: '#111827', fontWeight: 700, cursor: 'pointer',
                }}>Invite Friends</button>
              </div>
            </div>
          )
        )}

        {avatarPickerType === '3d' && (
          isTierUnlocked('3d') ? (
            <>
              <p style={{ color: '#c4b5fd', fontSize: 13, marginTop: 0 }}>Choose any 3D avatar. Selection is applied immediately.</p>
              {renderImageGrid(avatarOptions.model3dOptions, '3d', user.active3dModel, '#a855f7')}
            </>
          ) : (
            <div style={{
              border: '1px dashed rgba(168,85,247,0.5)',
              background: 'rgba(168,85,247,0.12)',
              borderRadius: 12,
              padding: 14,
              color: '#ddd6fe',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Unlock 3D avatars</div>
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                Spend <strong>{xpPrices['3d']} XP</strong> from your wallet
                {' '}(you have <strong style={{ color: walletXp >= xpPrices['3d'] ? '#86efac' : '#fca5a5' }}>{walletXp} XP</strong>),
                {' '}or invite 45 friends to unlock it free.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={walletXp < xpPrices['3d'] || unlockTier === '3d'}
                  onClick={() => unlockWithXp('3d')}
                  style={{
                    border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 800, cursor: walletXp < xpPrices['3d'] ? 'not-allowed' : 'pointer',
                    background: walletXp < xpPrices['3d'] ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    color: walletXp < xpPrices['3d'] ? '#94a3b8' : '#fff',
                  }}
                >
                  {unlockTier === '3d' ? 'Unlocking…' : (walletXp < xpPrices['3d'] ? `Need ${xpPrices['3d'] - walletXp} more XP` : `👛 Unlock for ${xpPrices['3d']} XP`)}
                </button>
                <button type="button" onClick={() => { closeAvatarPicker(); navigate('/social'); }} style={{
                  border: 'none', borderRadius: 8, padding: '8px 12px', background: '#a855f7', color: '#f5f3ff', fontWeight: 700, cursor: 'pointer',
                }}>Invite Friends</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={cardStyle}>
      <h4 style={h4Style}>🖼️ Avatar Studio</h4>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.16)',
          overflow: 'hidden',
        }}>
          <UserAvatar user={user} size={56} live />
        </div>
        <div style={{ color: '#cbd5e1', fontSize: 13 }}>
          {user.profilePhotoUrl ? 'Current: Custom Picture' : selectedBasicAvatar ? 'Current: Basic Avatar' : selected3dModel ? 'Current: 3D Avatar' : 'Current: Initials Avatar'}
        </div>
      </div>

      {avatarError && (
        <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 12 }}>{avatarError}</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cardGridCols}, minmax(0, 1fr))`,
        gap: 10,
      }}>
        {[
          { key: 'basic', title: 'Basic Avatar', color: '#06b6d4', icon: '🎨' },
          { key: 'customPhoto', title: 'Custom Picture', color: '#f59e0b', icon: '📸' },
          { key: '3d', title: '3D Model', color: '#a855f7', icon: '🌌' },
        ].map((card) => (
          <div key={card.key} style={{ position: 'relative' }}>
            {card.comingSoon && (
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 6,
                letterSpacing: '0.05em',
                zIndex: 1,
                pointerEvents: 'none',
                textTransform: 'uppercase',
              }}>
                Coming Soon
              </div>
            )}
            <button
              type="button"
              onClick={() => !card.comingSoon && openAvatarPicker(card.key)}
              style={{
                width: '100%',
                border: card.comingSoon ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '12px 8px',
                background: card.comingSoon ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.25)',
                color: card.comingSoon ? 'rgba(255,255,255,0.45)' : '#fff',
                cursor: card.comingSoon ? 'not-allowed' : 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4, opacity: card.comingSoon ? 0.5 : 1 }}>{card.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{card.title}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: card.comingSoon ? '#f59e0b' : isTierUnlocked(card.key) ? '#86efac' : '#fca5a5' }}>
                {card.comingSoon ? '🚧 Soon' : isTierUnlocked(card.key) ? 'Ready' : 'Locked'}
              </div>
            </button>
          </div>
        ))}
      </div>

      {avatarPickerModal}
    </div>
  );
}
