import { Text } from 'react-native';
import type { TextProps, StyleProp, TextStyle } from 'react-native';

type IoniconsProps = TextProps & {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

const ICON_MAP: Record<string, string> = {
  'calendar-outline': '📅',
  'time-outline': '⏰',
  add: '＋',
  'trash-outline': '🗑️',
  menu: '☰',
  close: '✕',
};

const Ionicons = ({ name, size = 16, color, style, children, ...rest }: IoniconsProps) => {
  const glyph = ICON_MAP[name] ?? '•';
  const normalizedStyle = Array.isArray(style) ? style : style ? [style] : [];

  return (
    <Text
      {...rest}
      selectable={false}
      style={[{ fontSize: size, color, lineHeight: size * 1.1 }, ...normalizedStyle]}
      accessibilityRole={rest.accessibilityRole ?? 'image'}
      accessibilityLabel={rest.accessibilityLabel ?? name}
    >
      {glyph}
      {children}
    </Text>
  );
};

export default Ionicons;
