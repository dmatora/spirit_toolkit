'use client';

import Link from 'next/link';
import styled from 'styled-components';

import { palette } from '@spirit/prayer-feature/theme/palette';

import { PRAYERS } from './prayers';

const Container = styled.main`
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
  background: inherit;
`;

const Title = styled.h1`
  margin: 0 0 16px;
  color: ${palette.ink};
`;

const Intro = styled.p`
  margin: 0 0 24px;
  color: ${palette.mutedInk};
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
`;

const ListItem = styled.li``;

const CardLink = styled(Link)`
  display: block;
  padding: 16px 18px;
  border-radius: 16px;
  background: ${palette.card};
  border: 1px solid ${palette.divider};
  color: ${palette.ink};
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.15s ease-in-out;

  &:hover,
  &:active {
    opacity: 0.9;
  }
`;

const MolitvoslovPage = () => (
  <Container>
    <Title>Молитвослов</Title>
    <Intro>Выберите молитву:</Intro>
    <List>
      {PRAYERS.map((prayer) => (
        <ListItem key={prayer.id}>
          <CardLink href={prayer.href}>{prayer.title}</CardLink>
        </ListItem>
      ))}
    </List>
  </Container>
);

export default MolitvoslovPage;
