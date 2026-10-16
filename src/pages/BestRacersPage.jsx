import React from 'react';
import BestRacers from '../components/BestRacers';
import { t as tr } from '../i18n/LanguageContext';

export default function BestRacersPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--color-text)' }}>
        {tr("Best Racers")}
      </h1>
      <BestRacers />
    </div>
  );
}