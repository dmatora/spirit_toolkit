import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './navigation/AppNavigator';

const App = () => (
  <SafeAreaProvider>
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  </SafeAreaProvider>
);

export default App;
