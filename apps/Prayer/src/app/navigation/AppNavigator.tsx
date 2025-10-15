import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import JournalScreen from '../screens/JournalScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => (
  <Tab.Navigator
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
      tabBarActiveTintColor: '#111',
      tabBarInactiveTintColor: '#999',
    })}
  >
    <Tab.Screen name="Главная" component={HomeScreen} />
    <Tab.Screen name="Журнал" component={JournalScreen} />
    <Tab.Screen name="Настройки" component={SettingsScreen} />
  </Tab.Navigator>
);

export default AppNavigator;