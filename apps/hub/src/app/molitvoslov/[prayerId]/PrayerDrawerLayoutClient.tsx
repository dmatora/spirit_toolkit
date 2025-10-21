'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette } from '@spirit/prayer-feature/theme/palette';
import type { PrayerLink } from '../prayers';

type PrayerDrawerLayoutClientProps = {
  currentPrayer: PrayerLink;
  prayers: PrayerLink[];
  children: React.ReactNode;
};

const Shell = styled.div`
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  background: ${palette.paper};
  border-bottom: 1px solid ${palette.divider};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h1`
  margin: 0;
  font-weight: 700;
  font-size: 1rem;
  color: ${palette.ink};
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${palette.card};
  border: 1px solid ${palette.divider};
  padding: 0;
  margin: 0;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:active {
    opacity: 0.85;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  transition: opacity 0.24s ease;
  pointer-events: none;
  z-index: 35;
`;

const Drawer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: min(86vw, 360px);
  background: ${palette.card};
  border-right: 1px solid ${palette.divider};
  transform: translateX(-100%);
  transition: transform 240ms ease;
  z-index: 40;
  display: flex;
  flex-direction: column;
`;

const DrawerHeader = styled.div`
  padding: 16px 18px;
  font-weight: 700;
  border-bottom: 1px solid ${palette.divider};
  color: ${palette.ink};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
`;

const ItemLink = styled(Link)`
  display: block;
  padding: 12px 18px;
  text-decoration: none;
  color: ${palette.ink};
  border-left: 4px solid transparent;

  &:hover {
    opacity: 0.9;
  }

  &.active {
    background: ${palette.chipBg};
    border-left-color: ${palette.accent};
    color: ${palette.ink};
    font-weight: 600;
  }
`;

const Main = styled.main`
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 12px 16px 24px;
`;

const PrayerDrawerLayoutClient = ({
  currentPrayer,
  prayers,
  children,
}: PrayerDrawerLayoutClientProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const closeDrawer = useCallback(() => setIsOpen(false), []);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Shell>
      <TopBar id="prayer-topbar">
        <IconButton
          type="button"
          onClick={toggleDrawer}
          aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          <Ionicons name={isOpen ? 'close' : 'menu'} size={18} />
        </IconButton>
        <Title>{currentPrayer.title}</Title>
      </TopBar>

      {isOpen && (
        <Overlay
          role="button"
          aria-label="Закрыть меню"
          onClick={closeDrawer}
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        />
      )}

      <Drawer
        data-open={isOpen}
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <DrawerHeader>Молитвы</DrawerHeader>
        <List>
          {prayers.map((prayer) => {
            const isActive = pathname === prayer.href;
            return (
              <li key={prayer.id}>
                <ItemLink
                  href={prayer.href}
                  className={isActive ? 'active' : ''}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={closeDrawer}
                >
                  {prayer.title}
                </ItemLink>
              </li>
            );
          })}
        </List>
      </Drawer>

      <Main>{children}</Main>
    </Shell>
  );
};

export default PrayerDrawerLayoutClient;
