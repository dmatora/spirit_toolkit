import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PrayerIndexScreen from '../screens/PrayerIndexScreen';
import PrayerScreen from '../screens/PrayerScreen';
import type { PrayerStackParamList } from './types';

const Stack = createNativeStackNavigator<PrayerStackParamList>();

const PrayerNavigator = () => {
  if (__DEV__) {
    console.log('[PrayerNavigator] rendering; screen types', {
      PrayerIndexScreen: typeof PrayerIndexScreen,
      PrayerScreen: typeof PrayerScreen,
    });
  }
  if (!PrayerIndexScreen) {
    throw new Error('PrayerIndexScreen component is undefined');
  }
  if (!PrayerScreen) {
    throw new Error('PrayerScreen component is undefined');
  }
  if (!Stack?.Navigator || !Stack?.Screen) {
    throw new Error('Stack navigator component is unavailable');
  }
  return (
    <Stack.Navigator
      initialRouteName="Список молитв"
      screenOptions={{
        headerTitle: 'Молитвослов',
      }}
    >
      <Stack.Screen
        name="Список молитв"
        component={PrayerIndexScreen}
        options={{ headerTitle: 'Молитвослов' }}
      />
      <Stack.Screen
        name="Молитва"
        component={PrayerScreen}
        options={{ headerTitle: 'Молитвослов' }}
      />
    </Stack.Navigator>
  );
};

export default PrayerNavigator;
