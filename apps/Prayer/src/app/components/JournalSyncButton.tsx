import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Path } from 'react-native-svg';

import { palette } from '@spirit/prayer-feature/theme';

type Props = {
  isSyncing: boolean;
  onPress: () => void;
  unsyncedCount: number;
};

const SPIN_DURATION_MS = 900;

const WebSyncIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 512 512" fill="none">
    <Path
      d="M434.67 285.59v-29.8C434.67 157.06 354.43 77 255.47 77a179 179 0 0 0-140.14 67.36m-38.53 82v29.8C76.8 355 157 435 256 435a180.45 180.45 0 0 0 140-66.92"
      stroke={color}
      strokeWidth={32}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M32 256l44-44 46 44"
      stroke={color}
      strokeWidth={32}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M480 256l-44 44-46-44"
      stroke={color}
      strokeWidth={32}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const JournalSyncButton: React.FC<Props> = ({
  isSyncing,
  onPress,
  unsyncedCount,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isSyncing) {
      spinValue.setValue(0);
      const animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: SPIN_DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        }),
      );
      animationRef.current = animation;
      animation.start();

      return () => {
        animation.stop();
        spinValue.stopAnimation();
        animationRef.current = null;
      };
    }

    animationRef.current?.stop();
    animationRef.current = null;
    spinValue.stopAnimation();
    spinValue.setValue(0);

    return undefined;
  }, [isSyncing, spinValue]);

  const rotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const iconColor = unsyncedCount > 0 ? palette.accent : palette.ink;

  return (
    <Pressable
      accessibilityLabel={`Синхронизировать журнал (${unsyncedCount} несинхронизированных записей)`}
      accessibilityRole="button"
      disabled={isSyncing}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isSyncing && styles.buttonDisabled,
        pressed && !isSyncing && styles.buttonPressed,
      ]}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ rotate: rotation }] }]}>
        {Platform.OS === 'web' ? (
          <WebSyncIcon color={iconColor} />
        ) : (
          <Ionicons
            color={iconColor}
            name="sync-outline"
            size={20}
          />
        )}
      </Animated.View>
      <View style={styles.countWrap}>
        <Text
          style={[
            styles.count,
            unsyncedCount > 0 ? styles.countPending : styles.countIdle,
          ]}
        >
          ({unsyncedCount})
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  buttonDisabled: {
    opacity: 0.9,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countWrap: {
    marginLeft: 4,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
  countIdle: {
    color: palette.mutedInk,
  },
  countPending: {
    color: palette.accent,
  },
});

export default JournalSyncButton;
