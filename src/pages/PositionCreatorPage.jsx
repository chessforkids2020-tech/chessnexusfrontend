import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PositionEditor from '../components/PositionEditor';
import api from '../api';

export default function PositionCreatorPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const shareCode = params.get('shareCode');
  const [initialFen, setInitialFen] = useState(state?.customFen || params.get('fen') || undefined);
  const [puzzleTitle, setPuzzleTitle] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!shareCode) return;
    api.get(`/api/user-puzzles/share/${shareCode}`)
      .then(res => {
        if (res.data?.fen) {
          setInitialFen(res.data.fen);
          setPuzzleTitle(res.data.title || '');
        } else {
          setLoadError('Position not found or is private.');
        }
      })
      .catch(() => setLoadError('Position not found or is private.'));
  }, [shareCode]);

  if (shareCode && !initialFen && !loadError) {
    return <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>Loading position...</div>;
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ color: 'var(--color-danger)', fontSize: 16, marginBottom: 12 }}>{loadError}</div>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a10)', borderRadius: 8, color: 'var(--color-text)', cursor: 'pointer' }}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '16px 20px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ marginBottom: 14, padding: '7px 16px', background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a10)', borderRadius: 8, color: 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
      >
        ← Back
      </button>
      {puzzleTitle && (
        <div style={{ color: 'var(--color-accent-2)', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
          📌 {puzzleTitle}
        </div>
      )}
      <PositionEditor initialFen={initialFen} />
    </div>
  );
}
