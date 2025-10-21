import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';
import { ensureInitialized } from './services/journalDb';

const App = () => {
  useEffect(() => {
    ensureInitialized()
      .then(() => console.log('[App] journalDb initialized'))
      .catch((e) => console.error('[App] journalDb init failed', e));
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
