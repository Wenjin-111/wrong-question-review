import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { settingsApi } from '../api/settings';
import type { ThemeId } from '../styles/theme';

interface ThemeContextValue {
  theme: ThemeId;
  bgImage: string;
  bgOverlay: number;
  loading: boolean;
  setTheme: (theme: ThemeId) => Promise<boolean>;
  setBgImage: (bgImage: string) => Promise<boolean>;
  setBgOverlay: (overlay: number) => Promise<boolean>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'theme_id';
const BG_KEY = 'bg_image';
const BG_OVERLAY_KEY = 'bg_overlay';

function readLocalTheme(): ThemeId {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'paper' || t === 'light' || t === 'dark') return t;
  } catch {}
  return 'paper';
}

function readLocalBg(): string {
  try {
    return localStorage.getItem(BG_KEY) || '';
  } catch {
    return '';
  }
}

function readLocalOverlay(): number {
  try {
    const v = parseFloat(localStorage.getItem(BG_OVERLAY_KEY) || '');
    if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
  } catch {}
  return 0.68;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readLocalTheme);
  const [bgImage, setBgImageState] = useState<string>(readLocalBg);
  const [bgOverlay, setBgOverlayState] = useState<number>(readLocalOverlay);
  const [loading, setLoading] = useState(true);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const bgRef = useRef(bgImage);
  bgRef.current = bgImage;
  const overlayRef = useRef(bgOverlay);
  overlayRef.current = bgOverlay;

  // 应用遮罩强度（--bg-overlay-alpha 供 body 背景渐变引用）
  useEffect(() => {
    document.documentElement.style.setProperty('--bg-overlay-alpha', String(bgOverlay));
    try { localStorage.setItem(BG_OVERLAY_KEY, String(bgOverlay)); } catch {}
  }, [bgOverlay]);

  // 应用 data-theme 属性（驱动 CSS 变量三套化）
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  // 应用自定义背景图（半透明遮罩层 + 照片；遮罩颜色跟随主题 --bg-overlay-rgb，强度由 --bg-overlay-alpha 控制）
  useEffect(() => {
    if (bgImage) {
      document.body.style.backgroundImage =
        `linear-gradient(rgb(var(--bg-overlay-rgb) / var(--bg-overlay-alpha, 0.68)), rgb(var(--bg-overlay-rgb) / var(--bg-overlay-alpha, 0.68))), url('${bgImage}')`;
      document.body.style.backgroundSize = 'cover, cover';
      document.body.style.backgroundPosition = 'center, center';
      document.body.style.backgroundAttachment = 'fixed, fixed';
      document.body.style.backgroundRepeat = 'no-repeat, no-repeat';
      document.documentElement.setAttribute('data-custom-bg', 'true');
    } else {
      document.body.style.backgroundImage = '';
      document.documentElement.removeAttribute('data-custom-bg');
    }
    try { localStorage.setItem(BG_KEY, bgImage); } catch {}
  }, [bgImage]);

  // 后端同步（localStorage 先行避免闪屏，登录后以后端为准）
  useEffect(() => {
    let cancelled = false;
    Promise.all([settingsApi.getTheme(), settingsApi.getBackgroundImage(), settingsApi.getBgOverlay()])
      .then(([t, b, o]) => {
        if (cancelled) return;
        const tv = (t.data as any).theme ?? (t.data as any).data?.theme;
        const bv = (b.data as any).bg_image ?? (b.data as any).data?.bg_image;
        const ov = (o.data as any).overlay ?? (o.data as any).data?.overlay;
        if (tv === 'paper' || tv === 'light' || tv === 'dark') setThemeState(tv);
        if (typeof bv === 'string') setBgImageState(bv);
        if (typeof ov === 'number' && Number.isFinite(ov)) setBgOverlayState(Math.max(0, Math.min(1, ov)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback(async (value: ThemeId) => {
    const prev = themeRef.current;
    setThemeState(value);
    try {
      await settingsApi.updateTheme(value);
      return true;
    } catch {
      setThemeState(prev);
      return false;
    }
  }, []);

  const setBgImage = useCallback(async (value: string) => {
    const prev = bgRef.current;
    setBgImageState(value);
    try {
      await settingsApi.updateBackgroundImage(value);
      return true;
    } catch {
      setBgImageState(prev);
      return false;
    }
  }, []);

  const setBgOverlay = useCallback(async (value: number) => {
    if (!Number.isFinite(value)) return false;
    const v = Math.max(0, Math.min(1, value));
    const prev = overlayRef.current;
    setBgOverlayState(v);
    try {
      await settingsApi.updateBgOverlay(v);
      return true;
    } catch {
      setBgOverlayState(prev);
      return false;
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, bgImage, bgOverlay, loading, setTheme, setBgImage, setBgOverlay }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
