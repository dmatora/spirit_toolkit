import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import PrayerScreen from '../screens/PrayerScreen';

export type PrayerDrawerParamList = {
  'Божественная литургия': { prayerId: 'liturgy' } | undefined;
  'Вечерня': { prayerId: 'evening' } | undefined;
};

const Drawer = createDrawerNavigator<PrayerDrawerParamList>();

const PrayerNavigator = () => {
  return (
    <Drawer.Navigator
      id={undefined}
      screenOptions={{
        headerTitle: 'Молитвослов',
      }}
    >
      <Drawer.Screen
        name="Божественная литургия"
        component={PrayerScreen}
        initialParams={{ prayerId: 'liturgy' }}
      />
      <Drawer.Screen
        name="Вечерня"
        component={PrayerScreen}
        initialParams={{ prayerId: 'evening' }}
      />
    </Drawer.Navigator>
  );
};

export default PrayerNavigator;
