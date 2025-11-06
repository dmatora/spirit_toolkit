import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontScaleProvider } from '@spirit/prayer-feature/prayer/context/FontScaleContext';

import AppNavigator from './navigation/AppNavigator';
import { ensureInitialized } from './services/journalDb';
import { ensureSettingsInitialized } from './services/attendanceConfig';
import { startBackgroundSync, syncNow } from './services/journalSync';
import {
  SYNC_SECRET_STORAGE_KEY,
  setRuntimeSyncToken,
} from './services/syncConfig';

const App = () => {
  useEffect(() => {
    let stopBackground: (() => void) | null = null;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await Promise.all([ensureInitialized(), ensureSettingsInitialized()]);
        console.log('[App] initial dependencies ready');
      } catch (e) {
        console.error('[App] initial dependency init failed', e);
      }

      if (cancelled) {
        return;
      }

      try {
        const storedSecret = await AsyncStorage.getItem(SYNC_SECRET_STORAGE_KEY);
        if (!cancelled) {
          const trimmed = storedSecret?.trim() ?? '';
          setRuntimeSyncToken(trimmed.length > 0 ? trimmed : undefined);
        }
      } catch (error) {
        console.warn('[App] failed to hydrate sync secret', error);
      }

      if (cancelled) {
        return;
      }

      try {
        await syncNow();
      } catch (error) {
        console.warn('[App] initial sync failed', error);
      }

      if (cancelled) {
        return;
      }

      stopBackground = startBackgroundSync();
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (stopBackground) {
        stopBackground();
        stopBackground = null;
      }
    };
  }, []);

  return (
    <FontScaleProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </FontScaleProvider>
  );
};

export default App;
