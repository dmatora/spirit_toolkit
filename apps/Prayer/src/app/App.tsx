import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';
import { ensureInitialized } from './services/journalDb';
import { ensureSettingsInitialized } from './services/attendanceConfig';
import { startBackgroundSync, syncNow } from './services/journalSync';

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
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
