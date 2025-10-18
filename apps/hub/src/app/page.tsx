'use client';

import React from 'react';
import { FeastCountdownCard } from '@spirit/prayer-feature';

export default function Page() {
  return (
    <main style={{ padding: 20 }}>
      <h1>Hub</h1>
      <div style={{ maxWidth: 520, margin: '20px auto' }}>
        <FeastCountdownCard />
      </div>
    </main>
  );
}
