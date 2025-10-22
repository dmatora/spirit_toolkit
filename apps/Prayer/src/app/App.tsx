import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';
import { ensureInitialized } from './services/journalDb';
import { ensureSettingsInitialized } from './services/attendanceConfig';

const App = () => {
  useEffect(() => {
    Promise.all([ensureInitialized(), ensureSettingsInitialized()])
      .then(() => console.log('[App] initial dependencies ready'))
      .catch((e) => console.error('[App] initial dependency init failed', e));
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
