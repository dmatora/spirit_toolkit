import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette } from '@spirit/prayer-feature/theme';
import HomeScreen from '../screens/HomeScreen';
import JournalScreen from '../screens/JournalScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrayerNavigator from './PrayerNavigator';

if (__DEV__) {
  // Helps reveal when Metro returns an undefined navigator component.
  console.log('[AppNavigator] PrayerNavigator type', typeof PrayerNavigator);
}

type TabParamList = {
  Главная: undefined;
  Журнал: undefined;
  Настройки: undefined;
  Молитвослов: undefined;
};

type TabNavigatorId = 'PrayerTabNavigator';

const Tab = createBottomTabNavigator<TabParamList, TabNavigatorId>();

const AppNavigator = () => (
  <Tab.Navigator
    id="PrayerTabNavigator"
    initialRouteName="Главная"
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string;
        if (route.name === 'Главная') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Журнал') {
          iconName = focused ? 'book' : 'book-outline';
        } else if (route.name === 'Молитвослов') {
          iconName = focused ? 'book' : 'book-outline';
        } else if (route.name === 'Настройки') {
          iconName = focused ? 'settings' : 'settings-outline';
        } else {
          iconName = 'ellipse';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: palette.ink,
      tabBarInactiveTintColor: palette.mutedInk,
      tabBarStyle: { backgroundColor: palette.paper, borderTopColor: palette.divider },
      headerStyle: { backgroundColor: palette.paper },
      headerTintColor: palette.ink,
    })}
  >
    <Tab.Screen name="Главная" component={HomeScreen} />
    <Tab.Screen name="Журнал" component={JournalScreen} />
    <Tab.Screen
      name="Молитвослов"
      children={() => {
        if (typeof PrayerNavigator !== 'function') {
          throw new Error('PrayerNavigator component is unavailable');
        }
        return <PrayerNavigator />;
      }}
    />
    <Tab.Screen name="Настройки" component={SettingsScreen} />
  </Tab.Navigator>
);

export default AppNavigator;
