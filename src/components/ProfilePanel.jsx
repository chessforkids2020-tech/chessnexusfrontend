// src/components/ProfilePanel.jsx
// Your Profile — rendered inline inside the Settings page (no longer a sidebar popup).
// Reuses the auth context (user + refreshUser) and the same API endpoints the sidebar used.
import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import CoachPromptCard from './CoachPromptCard';

// ── Country helpers (image flags render on Windows; Unicode flags don't) ──────
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
    'Denmark':'DK','Ecuador':'EC','Egypt':'EG','Ethiopia':'ET','Finland':'FI',
    'France':'FR','Georgia':'GE','Germany':'DE','Ghana':'GH','Greece':'GR',
    'Hungary':'HU','Iceland':'IS','India':'IN','Indonesia':'ID','Iran':'IR',
    'Iraq':'IQ','Ireland':'IE','Israel':'IL','Italy':'IT','Jamaica':'JM',
    'Japan':'JP','Jordan':'JO','Kazakhstan':'KZ','Kenya':'KE','Kuwait':'KW',
    'Kyrgyzstan':'KG','Latvia':'LV','Lebanon':'LB','Lithuania':'LT','Malaysia':'MY',
    'Mexico':'MX','Moldova':'MD','Mongolia':'MN','Morocco':'MA','Myanmar':'MM',
    'Nepal':'NP','Netherlands':'NL','New Zealand':'NZ','Nigeria':'NG','Norway':'NO',
    'Pakistan':'PK','Paraguay':'PY','Peru':'PE','Philippines':'PH','Poland':'PL',
    'Portugal':'PT','Qatar':'QA','Romania':'RO','Russia':'RU','Saudi Arabia':'SA',
    'Senegal':'SN','Serbia':'RS','Singapore':'SG','Slovakia':'SK','Slovenia':'SI',
    'South Africa':'ZA','South Korea':'KR','Spain':'ES','Sri Lanka':'LK','Sweden':'SE',
    'Switzerland':'CH','Syria':'SY','Taiwan':'TW','Tajikistan':'TJ','Tanzania':'TZ',
    'Thailand':'TH','Tunisia':'TN','Turkey':'TR','Turkmenistan':'TM','Uganda':'UG',
    'Ukraine':'UA','United Arab Emirates':'AE','United Kingdom':'GB','United States':'US',
    'Uruguay':'UY','Uzbekistan':'UZ','Venezuela':'VE','Vietnam':'VN','Yemen':'YE','Zimbabwe':'ZW',
  };
  return nameToCode[trimmed]
    || nameToCode[trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()]
    || (() => {
         const lower = trimmed.toLowerCase();
         const key = Object.keys(nameToCode).find(k => k.toLowerCase() === lower);
         return key ? nameToCode[key] : '';
       })();
}

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

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  infoCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'left',
    padding: '18px 20px',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  infoCardH4: {
    margin: 0,
    color: '#67e8f9',
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
    marginBottom: '10px',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
  },
  infoCardP: {
    margin: 0,
    color: '#ffffff',
    fontWeight: 700,
    fontFamily: "'Poppins', sans-serif",
    fontSize: '18px',
  },
  editIcon: {
    marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '14px', color: '#06b6d4', transition: 'all 0.3s ease',
  },
  input: {
    padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(6,182,212,0.3)',
    width: '100%', fontFamily: "'Poppins', sans-serif", background: 'rgba(0,0,0,0.3)',
    color: '#ffffff', boxSizing: 'border-box',
  },
  saveBtn: {
    cursor: 'pointer', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    color: 'white', border: 'none', borderRadius: '12px', padding: '8px 12px', fontWeight: 600,
  },
  cancelBtn: {
    cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '8px 12px', fontWeight: 600,
  },
};

export default function ProfilePanel() {
  const { user, refreshUser } = useAuth();

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
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioValue, setEditBioValue] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editCurrentPw, setEditCurrentPw] = useState('');
  const [editNewPw, setEditNewPw] = useState('');
  const [editConfirmPw, setEditConfirmPw] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [editPasswordMsg, setEditPasswordMsg] = useState(null);

  if (!user) {
    return <p style={{ color: '#64748b', fontSize: 14 }}>Loading your profile…</p>;
  }

  if (user.role === 'guest') {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 24px',
        background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: '16px',
      }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
        <div style={{ color: '#c4b5fd', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Guest Account</div>
        <div style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>
          Profile settings are not available for guest users.<br />
          <strong style={{ color: '#a78bfa' }}>Create a free account</strong> to personalise your profile, save progress, and access all features.
        </div>
      </div>
    );
  }

  // ── Handlers (same endpoints as the old sidebar modal) ─────────────────────
  const handleStartEdit = () => { setEditNameValue(user.displayName || user.username); setIsEditingName(true); };
  const handleSaveName = async () => {
    if (!editNameValue.trim()) return;
    setIsSavingName(true);
    try { await api.put('/api/auth/profile', { displayName: editNameValue }); await refreshUser(); setIsEditingName(false); }
    catch { alert('Failed to update name'); }
    finally { setIsSavingName(false); }
  };

  const handleStartEditLichess = () => { setEditLichessValue(user.lichessUsername || ''); setIsEditingLichess(true); };
  const handleSaveLichess = async () => {
    setIsSavingLichess(true);
    try { await api.put('/api/auth/profile', { lichessUsername: editLichessValue }); await refreshUser(); setIsEditingLichess(false); }
    catch (e) { alert(e.response?.data?.message || 'Failed to update Lichess username'); }
    finally { setIsSavingLichess(false); }
  };

  const handleStartEditChessCom = () => { setEditChessComValue(user.chessComUsername || ''); setIsEditingChessCom(true); };
  const handleSaveChessCom = async () => {
    setIsSavingChessCom(true);
    try { await api.put('/api/auth/profile', { chessComUsername: editChessComValue }); await refreshUser(); setIsEditingChessCom(false); }
    catch (e) { alert(e.response?.data?.message || 'Failed to update Chess.com username'); }
    finally { setIsSavingChessCom(false); }
  };

  const handleStartEditCountry = () => { setEditCountryValue(user.country || ''); setEditCountryMsg(null); setIsEditingCountry(true); };
  const handleSaveCountry = async () => {
    if (!editCountryValue.trim()) return;
    setIsSavingCountry(true); setEditCountryMsg(null);
    try {
      await api.patch('/api/user/update-country', { country: editCountryValue.trim() });
      await refreshUser(); setIsEditingCountry(false); setEditCountryMsg({ type: 'ok', text: 'Country updated!' });
    } catch (e) { setEditCountryMsg({ type: 'err', text: e.response?.data?.message || 'Failed to update country' }); }
    finally { setIsSavingCountry(false); }
  };

  const handleStartEditBio = () => { setEditBioValue(user.biography || ''); setIsEditingBio(true); };
  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try { await api.put('/api/auth/profile', { biography: editBioValue }); await refreshUser(); setIsEditingBio(false); }
    catch (e) { alert(e.response?.data?.message || 'Failed to update biography'); }
    finally { setIsSavingBio(false); }
  };

  const handleSavePassword = async () => {
    setEditPasswordMsg(null);
    if (!editCurrentPw || !editNewPw || !editConfirmPw) return setEditPasswordMsg({ type: 'err', text: 'Fill all fields.' });
    if (editNewPw.length < 6) return setEditPasswordMsg({ type: 'err', text: 'New password must be at least 6 characters.' });
    if (editNewPw !== editConfirmPw) return setEditPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
    setIsSavingPassword(true);
    try {
      await api.patch('/api/user/change-password', { currentPassword: editCurrentPw, newPassword: editNewPw });
      setEditPasswordMsg({ type: 'ok', text: 'Password changed!' });
      setEditCurrentPw(''); setEditNewPw(''); setEditConfirmPw(''); setIsEditingPassword(false);
    } catch (e) { setEditPasswordMsg({ type: 'err', text: e.response?.data?.message || 'Failed to change password' }); }
    finally { setIsSavingPassword(false); }
  };

  return (
    <>
    <section style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '28px 24px',
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>👤 Your Profile</h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        Manage your account details. Changes are saved to your account and apply everywhere.
      </p>

      <div style={styles.grid}>
        {/* Display Name */}
        <div style={styles.infoCard}>
          <h4 style={styles.infoCardH4}>
            👤 Display Name
            {!isEditingName && <button onClick={handleStartEdit} style={styles.editIcon} title="Edit Display Name">✏️</button>}
          </h4>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} style={styles.input} autoFocus />
              <button onClick={handleSaveName} disabled={isSavingName} style={styles.saveBtn} title="Save">✓</button>
              <button onClick={() => setIsEditingName(false)} style={styles.cancelBtn} title="Cancel">✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <p style={{ ...styles.infoCardP, margin: 0 }}>{user.displayName}</p>
              {user.role === 'elite' && (
                <span style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))',
                  border: '1px solid rgba(251,191,36,0.55)', color: '#fbbf24',
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                  whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(251,191,36,0.4)',
                }}>💎 Elite</span>
              )}
              <span style={{
                background: user.isCoach ? 'rgba(6,182,212,0.18)' : 'rgba(16,185,129,0.12)',
                border: `1px solid ${user.isCoach ? 'rgba(6,182,212,0.4)' : 'rgba(16,185,129,0.35)'}`,
                color: user.isCoach ? '#67e8f9' : '#6ee7b7',
                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap',
              }}>{user.isCoach ? '🎓 Coach' : '♟ Player'}</span>
            </div>
          )}
        </div>

        {/* Email (read-only) */}
        <div style={styles.infoCard}>
          <h4 style={styles.infoCardH4}>📧 Email</h4>
          <p style={styles.infoCardP}>{user.email || 'N/A'}</p>
        </div>

        {/* Lichess */}
        <div style={styles.infoCard}>
          <h4 style={styles.infoCardH4}>
            ♟️ Lichess Username
            {!isEditingLichess && <button onClick={handleStartEditLichess} style={styles.editIcon} title="Edit Lichess Username">✏️</button>}
          </h4>
          {isEditingLichess ? (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input type="text" value={editLichessValue} onChange={(e) => setEditLichessValue(e.target.value)} placeholder="e.g. my_lichess_id" style={styles.input} autoFocus />
              <button onClick={handleSaveLichess} disabled={isSavingLichess} style={styles.saveBtn} title="Save">✓</button>
              <button onClick={() => setIsEditingLichess(false)} style={styles.cancelBtn} title="Cancel">✕</button>
            </div>
          ) : (
            <p style={styles.infoCardP}>{user.lichessUsername || 'Not linked'}</p>
          )}
        </div>

        {/* Chess.com */}
        <div style={styles.infoCard}>
          <h4 style={styles.infoCardH4}>
            ♟️ Chess.com Username
            {!isEditingChessCom && <button onClick={handleStartEditChessCom} style={styles.editIcon} title="Edit Chess.com Username">✏️</button>}
          </h4>
          {isEditingChessCom ? (
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input type="text" value={editChessComValue} onChange={(e) => setEditChessComValue(e.target.value)} placeholder="e.g. my_chesscom_id" style={styles.input} autoFocus />
              <button onClick={handleSaveChessCom} disabled={isSavingChessCom} style={styles.saveBtn} title="Save">✓</button>
              <button onClick={() => setIsEditingChessCom(false)} style={styles.cancelBtn} title="Cancel">✕</button>
            </div>
          ) : (
            <p style={styles.infoCardP}>{user.chessComUsername || 'Not linked'}</p>
          )}
        </div>

        {/* Password */}
        <div style={styles.infoCard}>
          <h4 style={styles.infoCardH4}>
            🔒 Password
            {!isEditingPassword && (
              <button
                onClick={() => { setIsEditingPassword(true); setEditPasswordMsg(null); setEditCurrentPw(''); setEditNewPw(''); setEditConfirmPw(''); }}
                style={styles.editIcon} title="Change Password"
              >✏️</button>
            )}
          </h4>
          {isEditingPassword ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Current password', val: editCurrentPw, set: setEditCurrentPw },
                { label: 'New password', val: editNewPw, set: setEditNewPw },
                { label: 'Confirm new password', val: editConfirmPw, set: setEditConfirmPw },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '3px' }}>{label}</div>
                  <input type="password" value={val} onChange={(e) => set(e.target.value)} autoComplete="off" style={styles.input} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={handleSavePassword} disabled={isSavingPassword} style={{ ...styles.saveBtn, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', flex: 1 }}>
                  {isSavingPassword ? '...' : 'Change'}
                </button>
                <button onClick={() => { setIsEditingPassword(false); setEditPasswordMsg(null); }} style={styles.cancelBtn}>✕</button>
              </div>
              {editPasswordMsg && (
                <p style={{ margin: 0, fontSize: '12px', color: editPasswordMsg.type === 'ok' ? '#2dd4bf' : '#f87171' }}>{editPasswordMsg.text}</p>
              )}
            </div>
          ) : (
            <>
              <p style={styles.infoCardP}>••••••••</p>
              {editPasswordMsg && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: editPasswordMsg.type === 'ok' ? '#2dd4bf' : '#f87171' }}>{editPasswordMsg.text}</p>
              )}
            </>
          )}
        </div>

        {/* Country */}
        <div style={styles.infoCard}>
          <h4 style={styles.infoCardH4}>
            🌍 Country
            {!isEditingCountry && <button onClick={handleStartEditCountry} style={styles.editIcon} title="Edit Country">✏️</button>}
          </h4>
          {isEditingCountry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select value={editCountryValue} onChange={(e) => setEditCountryValue(e.target.value)} style={{ ...styles.input, fontSize: '13px' }} autoFocus>
                <option value="">— Select country —</option>
                {COUNTRY_LIST.map(c => <option key={c} value={c}>{getCountryFlag(c) ? `${getCountryFlag(c)} ${c}` : c}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={handleSaveCountry} disabled={isSavingCountry} style={styles.saveBtn} title="Save">✓</button>
                <button onClick={() => { setIsEditingCountry(false); setEditCountryMsg(null); }} style={styles.cancelBtn} title="Cancel">✕</button>
              </div>
              {editCountryMsg && (
                <p style={{ margin: 0, fontSize: '12px', color: editCountryMsg.type === 'ok' ? '#2dd4bf' : '#f87171' }}>{editCountryMsg.text}</p>
              )}
            </div>
          ) : (
            <>
              <p style={styles.infoCardP}>
                {user.country ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CountryFlag country={user.country} height={16} />
                    {user.country}
                  </span>
                ) : 'Not set'}
              </p>
              {editCountryMsg && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: editCountryMsg.type === 'ok' ? '#2dd4bf' : '#f87171' }}>{editCountryMsg.text}</p>
              )}
            </>
          )}
        </div>

        {/* Biography — full width */}
        <div style={{ ...styles.infoCard, gridColumn: '1 / -1' }}>
          <h4 style={styles.infoCardH4}>
            📝 Talk about yourself
            {!isEditingBio && <button onClick={handleStartEditBio} style={styles.editIcon} title="Edit Biography">✏️</button>}
          </h4>
          {isEditingBio ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={editBioValue}
                onChange={(e) => setEditBioValue(e.target.value.slice(0, 150))}
                placeholder="Share a little about yourself — your favourite opening, goals, or anything you'd like others to know."
                rows={4}
                style={{ ...styles.input, resize: 'vertical', minHeight: '90px', lineHeight: 1.5 }}
                autoFocus
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginRight: 'auto' }}>{editBioValue.length}/150</span>
                <button onClick={handleSaveBio} disabled={isSavingBio} style={styles.saveBtn} title="Save">{isSavingBio ? '...' : '✓ Save'}</button>
                <button onClick={() => setIsEditingBio(false)} style={styles.cancelBtn} title="Cancel">✕</button>
              </div>
            </div>
          ) : (
            <p style={{
              ...styles.infoCardP,
              fontWeight: user.biography ? 500 : 400,
              fontSize: '15px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              color: user.biography ? '#ffffff' : 'rgba(255,255,255,0.45)',
            }}>
              {user.biography || 'Not set — tell others about yourself!'}
            </p>
          )}
        </div>
      </div>
    </section>

    {/* "Are you a chess coach?" prompt — at the very bottom of the Profile tab */}
    <CoachPromptCard />
    </>
  );
}
