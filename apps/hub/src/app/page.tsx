'use client';

import React from 'react';
import { FeastCountdownCard } from '@spirit/dashboard-feature';
import LiturgyAttendanceCard from '../../../Prayer/src/app/components/LiturgyAttendanceCard.web';
import styled from 'styled-components';

const Column = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  /* iOS 12 Safari: flex-gap fallback */
  & > * + * {
    margin-top: 24px;
  }
`;

export default function Page() {
  return (
    <Column>
      <FeastCountdownCard />
      <LiturgyAttendanceCard />
    </Column>
  );
}
