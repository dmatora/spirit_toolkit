import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import JournalScreen from '../screens/JournalScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { palette } from '@spirit/prayer-feature/theme';

type TabParamList = {
  Главная: undefined;
  Журнал: undefined;
  Настройки: undefined;
};

type TabNavigatorId = 'PrayerTabNavigator';

const Tab = createBottomTabNavigator<TabParamList, TabNavigatorId>();

const AppNavigator = () => (
  <Tab.Navigator
    id="PrayerTabNavigator"
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string;
        if (route.name === 'Главная') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Журнал') {
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
    <Tab.Screen name="Настройки" component={SettingsScreen} />
  </Tab.Navigator>
);

export default AppNavigator;
