import React from 'react';
import BestRacers from '../components/BestRacers';

export default function BestRacersPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Best Racers
      </h1>
      <BestRacers />
    </div>
  );
}