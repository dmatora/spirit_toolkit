'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { palette } from '@spirit/prayer-feature/theme/palette';
import { PrayerRenderer } from '@spirit/prayer-feature';
import type { PrayerBlock } from '@spirit/prayer-feature';
import type { PrayerLink } from '../prayers';

const Container = styled.main`
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
  background: inherit;
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: 16px;
  color: ${palette.mutedInk};
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.15s ease-in-out;

  &:hover,
  &:active {
    opacity: 0.8;
  }
`;

const Card = styled.section`
  padding: 24px;
  border-radius: 20px;
  background: ${palette.card};
  border: 1px solid ${palette.divider};
  color: ${palette.ink};
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
`;

const Title = styled.h1`
  margin: 0 0 12px;
  font-size: 1.8rem;
`;

type PrayerContentProps = { prayer: PrayerLink; blocks: PrayerBlock[] };

const PrayerContent = ({ prayer, blocks }: PrayerContentProps) => (
  <Container>
    <BackLink href="/molitvoslov">← Ко списку молитв</BackLink>
    <Card>
      <Title>{prayer.title}</Title>
      <PrayerRenderer blocks={blocks} prayerId={prayer.id} />
    </Card>
  </Container>
);

export default PrayerContent;
