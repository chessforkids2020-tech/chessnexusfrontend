// CoffeeCta — compact "Buy us a coffee" pill button. Drop it anywhere a
// supporter prompt fits (homepage, dashboard, games, analysis). Clicking it
// navigates to the dedicated /buy-coffee page.
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CoffeeCta({
  variant = 'pill',          // 'pill' | 'floating' | 'inline'
  label = 'Buy us a coffee',
  subLabel,                   // optional small line under the label
  style = {}
}) {
  const navigate = useNavigate();

  const base = {
    cursor: 'pointer',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.18))',
    color: '#fde68a',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.15)',
    transition: 'transform .15s ease, box-shadow .15s ease, background .15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  };

  const variants = {
    pill: {
      padding: '10px 18px',
      borderRadius: 999,
      fontSize: 14
    },
    floating: {
      position: 'fixed',
      bottom: 22,
      right: 22,
      padding: '12px 18px',
      borderRadius: 999,
      fontSize: 14,
      zIndex: 60
    },
    inline: {
      padding: '8px 14px',
      borderRadius: 10,
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
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(245, 158, 11, 0.28)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.15)';
      }}
    >
      <span aria-hidden style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.55))' }}>☕</span>
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
        <span>{label}</span>
        {subLabel && <span style={{ fontSize: 11, color: 'rgba(253, 230, 138, 0.75)', fontWeight: 500 }}>{subLabel}</span>}
      </span>
    </button>
  );
}
