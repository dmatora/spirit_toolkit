import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CommonActions,
  NavigatorScreenParams,
  type EventArg,
} from '@react-navigation/native';
import { Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette } from '@spirit/prayer-feature/theme';
import HomeScreen from '../screens/HomeScreen';
import JournalScreen from '../screens/JournalScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrayerNavigator, { type PrayerStackParamList } from './PrayerNavigator';

export type TabParamList = {
  Главная: undefined;
  Журнал: undefined;
  Настройки: undefined;
  Молитвослов: NavigatorScreenParams<PrayerStackParamList> | undefined;
};

export const TAB_NAVIGATOR_ID = 'PrayerTabNavigator';

type TabNavigatorId = typeof TAB_NAVIGATOR_ID;
type TabPressEvent = EventArg<'tabPress', true, undefined>;

const Tab = createBottomTabNavigator<TabParamList, TabNavigatorId>();

const AppNavigator = () => (
  <Tab.Navigator
    id={TAB_NAVIGATOR_ID}
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
      tabBarStyle: {
        backgroundColor: palette.paper,
        borderTopColor: palette.divider,
      },
      headerStyle: { backgroundColor: palette.paper },
      headerTintColor: palette.ink,
    })}
  >
    <Tab.Screen name="Главная" component={HomeScreen} />
    <Tab.Screen
      name="Журнал"
      component={JournalScreen}
      options={{
        headerShown: Platform.OS !== 'web',
        headerTitle: 'Журнал',
      }}
    />
    <Tab.Screen
      name="Молитвослов"
      component={PrayerNavigator}
      listeners={({ navigation, route }) => ({
        tabPress: (event: TabPressEvent) => {
          const state = navigation.getState();
          const focusedRouteKey = state.routes[state.index]?.key;
          const isFocusedTab = focusedRouteKey === route.key;
          const focusedRoute = state.routes.find(
            (candidate) => candidate.key === route.key
          ) as
            | ((typeof state.routes)[number] & {
                state?: {
                  index?: number;
                  key?: string;
                  routes?: Array<{ name?: string }>;
                };
              })
            | undefined;
          const nestedState = focusedRoute?.state;
          const nestedIndex = nestedState?.index ?? 0;
          const activeNestedRouteName =
            nestedState?.routes?.[nestedIndex]?.name;

          if (
            !isFocusedTab ||
            !nestedState?.key ||
            activeNestedRouteName === 'Список молитв'
          ) {
            return;
          }

          event.preventDefault();
          navigation.dispatch({
            ...CommonActions.reset({
              index: 0,
              routes: [{ name: 'Список молитв' }],
            }),
            target: nestedState.key,
          });
        },
      })}
    />
    <Tab.Screen name="Настройки" component={SettingsScreen} />
  </Tab.Navigator>
);

export default AppNavigator;
