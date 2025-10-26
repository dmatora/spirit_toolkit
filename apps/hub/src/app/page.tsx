'use client';

import React from 'react';
import { FeastCountdownCard } from '@spirit/dashboard-feature';
import LiturgyAttendanceCard from '../../../Prayer/src/app/components/LiturgyAttendanceCard.web';

export default function Page() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <FeastCountdownCard />
      <LiturgyAttendanceCard />
    </div>
  );
}
