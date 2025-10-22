import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PrayerId } from '@spirit/prayer-feature';

import PrayerIndexScreen from '../screens/PrayerIndexScreen';
import PrayerScreen from '../screens/PrayerScreen';

export type PrayerStackParamList = {
  'Список молитв': undefined;
  'Молитва': { prayerId: PrayerId };
};

const Stack = createNativeStackNavigator<PrayerStackParamList>();

const PrayerNavigator = () => {
  return (
    <Stack.Navigator
      id={undefined}
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
