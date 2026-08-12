// CoffeeCta — compact "Support ChessNexus" pill button. Drop it anywhere a
// supporter prompt fits (homepage, dashboard, games, analysis). Clicking it
// navigates to the support page.
//
// Keeps its filename: renaming it would touch four importers for no visible
// gain, and the label is what users actually read.
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CoffeeCta({
  variant = 'pill',          // 'pill' | 'floating' | 'inline'
  label = 'Support ChessNexus',
  subLabel,                   // optional small line under the label
  style = {}
}) {
  const navigate = useNavigate();

  const base = {
    cursor: 'pointer',
    border: '1px solid var(--color-accent-a30)',
    background: 'linear-gradient(135deg, var(--color-accent-a20), var(--color-accent-a12))',
    color: 'var(--color-accent)',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    boxShadow: '0 8px 20px var(--color-warning-a12)',
    transition: 'transform .15s ease, box-shadow .15s ease, background .15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  };

  const variants = {
    pill: {
      padding: '10px 18px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 14
    },
    floating: {
      position: 'fixed',
      bottom: 22,
      right: 22,
      padding: '12px 18px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 14,
      zIndex: 60
    },
    inline: {
      padding: '8px 14px',
      borderRadius: 'var(--radius-md)',
      fontSize: 13
    }
  };

  return (
    <button
      type="button"
      onClick={() => navigate('/buy-coffee')}
      style={{ ...base, ...(variants[variant] || variants.pill), ...style }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 10px 24px var(--color-warning-a30)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 20px var(--color-warning-a12)';
      }}
    >
      <span aria-hidden style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px var(--color-accent-a40))' }}>♞</span>
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
        <span>{label}</span>
        {subLabel && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>{subLabel}</span>}
      </span>
    </button>
  );
}
