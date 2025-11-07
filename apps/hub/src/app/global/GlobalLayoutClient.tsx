'use client';

import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled, { css } from 'styled-components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette } from '@spirit/prayer-feature/theme/palette';
import { FontScaleProvider } from '@spirit/prayer-feature/prayer/context/FontScaleContext';
import TopBarPortalContext, {
  type TopBarPortalContextValue,
} from '@spirit/prayer-feature/prayer/context/TopBarPortalContext';
import { ensureInitialized } from '../../../../Prayer/src/app/services/journalDb.web';
import { ensureSettingsInitialized } from '../../../../Prayer/src/app/services/attendanceConfig.web';
import {
  startBackgroundSync,
  syncNow,
} from '../../../../Prayer/src/app/services/journalSync.web';
import {
  SYNC_SECRET_STORAGE_KEY,
  setRuntimeSyncToken,
} from '../../../../Prayer/src/app/services/syncConfig';
import { PRAYERS } from '../molitvoslov/prayers';

type GlobalLayoutClientProps = {
  children: React.ReactNode;
};

const DESKTOP_MEDIA = '(min-width: 1024px)';

const TopBar = styled.header<{ $isSticky: boolean; $hasSlot: boolean }>`
  background: ${palette.paper};
  border-bottom: 1px solid ${palette.divider};
  padding: ${({ $hasSlot }) => ($hasSlot ? '7px 16px 0' : '12px 16px')};

  ${({ $isSticky }) =>
    $isSticky
      ? css`
          position: sticky;
          top: 0;
          z-index: 60;
        `
      : null};

  @media ${DESKTOP_MEDIA} {
    padding: ${({ $hasSlot }) =>
      $hasSlot ? '9px 48px 0 calc(280px + 32px)' : '16px 48px 16px calc(280px + 32px)'};
  }
`;

const TopBarRow = styled.div`
  display: flex;
  align-items: center;
  & > * + * {
    margin-left: 12px;
  }
`;

const TopBarMainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const TopBarDynamicSlot = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.span`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${palette.ink};
  flex: 1;
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
  transition: opacity 0.18s ease;

  &:active {
    opacity: 0.85;
  }

  @media ${DESKTOP_MEDIA} {
    display: none;
  }
`;

const Sidebar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: min(86vw, 360px);
  background: ${palette.card};
  border-right: 1px solid ${palette.divider};
  transform: translateX(-100%);
  transition: transform 240ms ease;
  z-index: 55;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;

  &[data-open='true'] {
    transform: translateX(0);
  }

  @media ${DESKTOP_MEDIA} {
    transform: none;
    width: 280px;
    background: ${palette.card};
    border-right: 1px solid ${palette.divider};
  }
`;

const NavSectionTitle = styled.div`
  font-weight: 700;
  color: ${palette.ink};
  font-size: 0.95rem;
`;

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NavItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const linkBaseStyles = css`
  display: block;
  padding: 12px 16px;
  text-decoration: none;
  color: ${palette.ink};
  border-left: 4px solid transparent;
  border-radius: 12px;
  background: transparent;
  transition: background-color 0.18s ease, border-left-color 0.18s ease;

  &:hover {
    background: ${palette.chipBg};
  }

  &.active {
    background: ${palette.chipBg};
    border-left-color: ${palette.accent};
    font-weight: 600;
  }
`;

const NavLink = styled(Link)`
  ${linkBaseStyles}
`;

const NestedList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 0 0 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NestedLink = styled(Link)`
  ${linkBaseStyles};
  padding: 10px 14px;
  font-size: 0.95rem;
`;

const Overlay = styled.button`
  position: fixed;
  inset: 0;
  border: none;
  margin: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
  transition: opacity 0.24s ease;
  z-index: 50;
  opacity: 0;
  pointer-events: none;

  &[data-visible='true'] {
    opacity: 1;
    pointer-events: auto;
  }

  @media ${DESKTOP_MEDIA} {
    display: none;
  }
`;

const Main = styled.main`
  padding: 16px 16px 32px;
  transition: margin-left 240ms ease;

  @media ${DESKTOP_MEDIA} {
    margin-left: 280px;
    padding: 32px 48px 48px;
  }
`;

const Content = styled.div`
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
`;

const Shell = styled.div`
  min-height: 100vh;
  background: ${palette.paper};
`;

const GlobalLayoutClient: React.FC<GlobalLayoutClientProps> = ({ children }) => {
  const pathname = usePathname() ?? '/';
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [topBarContent, setTopBarContent] = useState<ReactNode | null>(null);
  const disableStickyForPath =
    pathname === '/molitvoslov/liturgy' || pathname === '/molitvoslov/vespers';
  const shouldUseStickyTopBar = !disableStickyForPath;
  const setTopBarContentValue = useCallback<TopBarPortalContextValue['setTopBarContent']>(
    (content) => {
      setTopBarContent(content);
    },
    [],
  );

  const topBarPortalValue = useMemo<TopBarPortalContextValue>(
    () => ({
      setTopBarContent: setTopBarContentValue,
    }),
    [setTopBarContentValue],
  );

  useEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | null = null;

    const bootstrap = async () => {
      try {
        await Promise.all([ensureInitialized(), ensureSettingsInitialized()]);
        if (cancelled) {
          return;
        }
        try {
          const storedSecret = await AsyncStorage.getItem(SYNC_SECRET_STORAGE_KEY);
          if (!cancelled) {
            const trimmed = storedSecret?.trim() ?? '';
            setRuntimeSyncToken(trimmed.length > 0 ? trimmed : undefined);
          }
        } catch (secretError) {
          console.warn('[hub:init] failed to hydrate sync secret', secretError);
        }
        if (cancelled) {
          return;
        }
        await syncNow();
        if (cancelled) {
          return;
        }
        stopSync = startBackgroundSync();
      } catch (error) {
        if (!cancelled) {
          console.warn('[hub:init] sync bootstrap failed', error);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (stopSync) {
        stopSync();
        stopSync = null;
      }
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA);

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(event.matches);
    };

    handleChange(mediaQuery);

    const listener = (event: MediaQueryListEvent) => handleChange(event);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => {
        mediaQuery.removeEventListener('change', listener);
      };
    }

    mediaQuery.addListener(listener);
    return () => {
      mediaQuery.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    if (isDesktop && isOpen) {
      setIsOpen(false);
    }
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [pathname, isDesktop]);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleLinkClick = useCallback(() => {
    if (!isDesktop) {
      closeDrawer();
    }
  }, [closeDrawer, isDesktop]);

  const isHomeActive = pathname === '/';
  const isMolitvoslovActive = pathname === '/molitvoslov' || pathname.startsWith('/molitvoslov/');
  const isJournalActive = pathname === '/journal' || pathname.startsWith('/journal/');
  const isSettingsActive = pathname === '/settings' || pathname.startsWith('/settings/');
  const sectionTitle = useMemo(() => {
    const matchedPrayer = PRAYERS.find((prayer) => prayer.href === pathname);
    if (matchedPrayer) {
      return matchedPrayer.title;
    }

    if (pathname === '/') {
      return 'Главная';
    }

    if (pathname.startsWith('/molitvoslov')) {
      return 'Молитвослов';
    }

    if (pathname.startsWith('/settings')) {
      return 'Настройки';
    }

    if (pathname.startsWith('/journal')) {
      return 'Журнал';
    }

    return 'SpiritToolkit';
  }, [pathname]);

  const isPrayerDetailRoute = useMemo(
    () => PRAYERS.some((prayer) => prayer.href === pathname),
    [pathname],
  );

  const hasTopBarContent = Boolean(topBarContent);
  const shouldShowSectionTitle = !isPrayerDetailRoute || !hasTopBarContent;

  return (
    <TopBarPortalContext.Provider value={topBarPortalValue}>
      <FontScaleProvider>
        <SafeAreaProvider>
          <Shell>
            <TopBar
              id="prayer-topbar"
              $isSticky={shouldUseStickyTopBar}
              $hasSlot={hasTopBarContent}
            >
              <TopBarRow>
                <IconButton
                  type="button"
                  onClick={toggleDrawer}
                  aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
                >
                  <Ionicons name={isOpen ? 'close' : 'menu'} size={18} />
                </IconButton>
                <TopBarMainContent>
                  {shouldShowSectionTitle && <Title>{sectionTitle}</Title>}
                  {hasTopBarContent && <TopBarDynamicSlot>{topBarContent}</TopBarDynamicSlot>}
                </TopBarMainContent>
              </TopBarRow>
            </TopBar>

            <Sidebar data-open={isDesktop || isOpen ? 'true' : 'false'}>
              <NavSectionTitle>Навигация</NavSectionTitle>
              <NavList>
                <NavItem>
                  <NavLink
                    href="/"
                    className={isHomeActive ? 'active' : ''}
                    aria-current={isHomeActive ? 'page' : undefined}
                    onClick={handleLinkClick}
                  >
                    Главная
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    href="/molitvoslov"
                    className={isMolitvoslovActive ? 'active' : ''}
                    aria-current={isMolitvoslovActive ? 'page' : undefined}
                    onClick={handleLinkClick}
                  >
                    Молитвослов
                  </NavLink>
                  <NestedList>
                    {PRAYERS.map((prayer) => {
                      const isActive = pathname === prayer.href;
                      return (
                        <li key={prayer.id}>
                          <NestedLink
                            href={prayer.href}
                            className={isActive ? 'active' : ''}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={handleLinkClick}
                          >
                            {prayer.title}
                          </NestedLink>
                        </li>
                      );
                    })}
                  </NestedList>
                </NavItem>
                <NavItem>
                  <NavLink
                    href="/journal"
                    className={isJournalActive ? 'active' : ''}
                    aria-current={isJournalActive ? 'page' : undefined}
                    onClick={handleLinkClick}
                  >
                    Журнал
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    href="/settings"
                    className={isSettingsActive ? 'active' : ''}
                    aria-current={isSettingsActive ? 'page' : undefined}
                    onClick={handleLinkClick}
                  >
                    Настройки
                  </NavLink>
                </NavItem>
              </NavList>
            </Sidebar>

            {!isDesktop && (
              <Overlay
                type="button"
                aria-label="Закрыть меню"
                onClick={closeDrawer}
                data-visible={isOpen ? 'true' : 'false'}
              />
            )}

            <Main>
              <Content>{children}</Content>
            </Main>
          </Shell>
        </SafeAreaProvider>
      </FontScaleProvider>
    </TopBarPortalContext.Provider>
  );
};

export default GlobalLayoutClient;
