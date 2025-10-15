import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import JournalScreen from '../screens/JournalScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name='Главная' component={HomeScreen} />
      <Tab.Screen name='Журнал' component={JournalScreen} />
      <Tab.Screen name='Настройки' component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;