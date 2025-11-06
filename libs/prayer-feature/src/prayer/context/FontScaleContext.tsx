import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'ui/fontScale/v1';
const DEFAULT_FONT_SCALE = 1;
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.8;

type FontScaleContextValue = {
  fontScale: number;
  setFontScale: (next: number) => void;
  isReady: boolean;
};

const FontScaleContext = createContext<FontScaleContextValue | undefined>(undefined);

const clamp = (value: number) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));

export const FontScaleProvider = ({ children }: { children: ReactNode }) => {
  const isMountedRef = useRef(true);
  const [fontScale, setFontScaleState] = useState(DEFAULT_FONT_SCALE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadScale = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isMountedRef.current) {
          const parsed = Number(stored);
          if (!Number.isNaN(parsed)) {
            setFontScaleState(clamp(parsed));
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsReady(true);
        }
      }
    };

    loadScale();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setFontScale = useCallback((next: number) => {
    const normalized = clamp(Number.isFinite(next) ? next : DEFAULT_FONT_SCALE);
    setFontScaleState(normalized);
    AsyncStorage.setItem(STORAGE_KEY, String(normalized)).catch(() => {
      // Persisting the preference is best-effort; surface errors via logging if needed later.
    });
  }, []);

  const value = useMemo<FontScaleContextValue>(
    () => ({
      fontScale,
      setFontScale,
      isReady,
    }),
    [fontScale, setFontScale, isReady],
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
};

export const useFontScale = () => {
  const context = useContext(FontScaleContext);
  if (!context) {
    throw new Error('useFontScale must be used within a FontScaleProvider');
  }

  return context;
};
