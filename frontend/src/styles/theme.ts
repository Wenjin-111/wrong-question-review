import type { ThemeConfig } from 'antd';

export type ThemeId = 'paper' | 'light' | 'dark';

// 与主题色无关的组件配置（三套主题共享）
const sharedComponents: ThemeConfig['components'] = {
  Card: { borderRadiusLG: 10, paddingLG: 24 },
  Menu: { itemBg: 'transparent', itemBorderRadius: 6, collapsedWidth: 72 },
  Button: { borderRadius: 6, controlHeight: 38, controlHeightLG: 46, fontWeight: 500 },
  Input: { borderRadius: 6, paddingBlock: 8 },
  Modal: { borderRadiusLG: 12 },
  Tag: { borderRadiusSM: 4 },
};

const paperTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3B5BA5',
    colorSuccess: '#E34A3E',
    colorError: '#B3261E',
    colorWarning: '#E8A33D',
    colorInfo: '#3B5BA5',
    colorTextBase: '#2C2B2A',
    colorBgBase: '#FAF6EF',
    colorBgContainer: '#FFFDF8',
    colorBgLayout: '#FAF6EF',
    colorBorder: 'rgba(44,43,42,0.12)',
    colorBorderSecondary: 'rgba(44,43,42,0.08)',
    colorFillQuaternary: 'rgba(44,43,42,0.04)',
    colorTextSecondary: '#6B6863',
    colorTextTertiary: '#98958E',

    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 30,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    lineHeight: 1.6,

    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,

    boxShadow: '0 1px 2px rgba(90,60,20,0.06), 0 1px 1px rgba(90,60,20,0.04)',
    boxShadowSecondary: '0 2px 8px rgba(90,60,20,0.08), 0 1px 3px rgba(90,60,20,0.06)',

    controlHeight: 38,
    controlHeightLG: 46,
    controlHeightSM: 30,
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    motionDurationMid: '0.25s',
    motionEaseInOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',

    wireframe: false,
  },
  components: {
    ...sharedComponents,
    Card: { ...sharedComponents!.Card, headerBg: '#FFFDF8' },
    Table: { ...sharedComponents!.Table, borderRadius: 8, headerBg: 'rgba(250,246,239,0.9)', headerColor: '#6B6863' },
    Layout: { ...sharedComponents!.Layout, bodyBg: 'transparent', headerBg: 'rgba(250,246,239,0.9)', siderBg: 'rgba(250,246,239,0.85)' },
    Menu: {
      ...sharedComponents!.Menu,
      itemHoverColor: '#3B5BA5',
      itemSelectedColor: '#3B5BA5',
      itemSelectedBg: 'rgba(59,91,165,0.08)',
    },
    Tabs: { itemSelectedColor: '#3B5BA5', itemHoverColor: '#3B5BA5', inkBarColor: '#3B5BA5' },
    Progress: { defaultColor: '#3B5BA5' },
  },
};

const lightTheme: ThemeConfig = {
  token: {
    ...paperTheme.token,
    colorTextBase: '#1A1A1A',
    colorBgBase: '#FFFFFF',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#FFFFFF',
    colorBorder: 'rgba(20,20,25,0.12)',
    colorBorderSecondary: 'rgba(20,20,25,0.08)',
    colorFillQuaternary: 'rgba(20,20,25,0.04)',
    colorTextSecondary: '#6B7280',
    colorTextTertiary: '#9CA3AF',
    boxShadow: '0 1px 2px rgba(20,20,25,0.05), 0 1px 1px rgba(20,20,25,0.03)',
    boxShadowSecondary: '0 2px 8px rgba(20,20,25,0.06), 0 1px 3px rgba(20,20,25,0.05)',
  },
  components: {
    ...sharedComponents,
    Card: { ...sharedComponents!.Card, headerBg: '#FFFFFF' },
    Table: { ...sharedComponents!.Table, borderRadius: 8, headerBg: 'rgba(255,255,255,0.9)', headerColor: '#6B7280' },
    Layout: { ...sharedComponents!.Layout, bodyBg: 'transparent', headerBg: 'rgba(255,255,255,0.9)', siderBg: 'rgba(255,255,255,0.85)' },
    Menu: {
      ...sharedComponents!.Menu,
      itemHoverColor: '#3B5BA5',
      itemSelectedColor: '#3B5BA5',
      itemSelectedBg: 'rgba(59,91,165,0.08)',
    },
    Tabs: { itemSelectedColor: '#3B5BA5', itemHoverColor: '#3B5BA5', inkBarColor: '#3B5BA5' },
    Progress: { defaultColor: '#3B5BA5' },
  },
};

const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#5B8DEF',
    colorSuccess: '#F0604F',
    colorError: '#FF6B5E',
    colorWarning: '#E8B04D',
    colorInfo: '#5B8DEF',
    colorTextBase: '#E6E8EB',
    colorBgBase: '#121417',
    colorBgContainer: '#1C1F24',
    colorBgLayout: '#121417',
    colorBorder: 'rgba(255,255,255,0.12)',
    colorBorderSecondary: 'rgba(255,255,255,0.08)',
    colorFillQuaternary: 'rgba(255,255,255,0.05)',
    colorTextSecondary: '#9AA0A6',
    colorTextTertiary: '#6E747C',

    fontFamily: paperTheme.token!.fontFamily,
    fontSize: 14,
    fontSizeHeading1: 30,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    lineHeight: 1.6,

    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,

    boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 1px rgba(0,0,0,0.2)',
    boxShadowSecondary: '0 2px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',

    controlHeight: 38,
    controlHeightLG: 46,
    controlHeightSM: 30,
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    motionDurationMid: '0.25s',
    motionEaseInOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',

    wireframe: false,
  },
  components: {
    ...sharedComponents,
    Card: { ...sharedComponents!.Card, headerBg: '#1C1F24' },
    Table: { ...sharedComponents!.Table, borderRadius: 8, headerBg: 'rgba(28,31,36,0.9)', headerColor: '#9AA0A6' },
    Layout: { ...sharedComponents!.Layout, bodyBg: 'transparent', headerBg: 'rgba(18,20,23,0.9)', siderBg: 'rgba(18,20,23,0.85)' },
    Button: { ...sharedComponents!.Button, primaryShadow: '0 1px 4px rgba(91,141,239,0.3)' },
    Menu: {
      ...sharedComponents!.Menu,
      itemHoverColor: '#5B8DEF',
      itemSelectedColor: '#5B8DEF',
      itemSelectedBg: 'rgba(91,141,239,0.16)',
    },
    Tabs: { itemSelectedColor: '#5B8DEF', itemHoverColor: '#5B8DEF', inkBarColor: '#5B8DEF' },
    Progress: { defaultColor: '#5B8DEF' },
  },
};

export const themes: Record<ThemeId, ThemeConfig> = {
  paper: paperTheme,
  light: lightTheme,
  dark: darkTheme,
};

export default themes.paper;
