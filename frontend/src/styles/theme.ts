import type { ThemeConfig } from 'antd';

const appleTheme: ThemeConfig = {
  token: {
    colorPrimary: '#007AFF',
    colorSuccess: '#34C759',
    colorError: '#FF3B30',
    colorWarning: '#FF9500',
    colorInfo: '#007AFF',
    colorTextBase: '#1D1D1F',
    colorBgBase: '#FFFFFF',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F2F2F7',
    colorBorder: 'rgba(60,60,67,0.10)',
    colorBorderSecondary: 'rgba(60,60,67,0.06)',
    colorFillQuaternary: 'rgba(60,60,67,0.04)',
    colorTextSecondary: '#86868B',
    colorTextTertiary: '#AEAEB2',

    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 17,
    fontSizeHeading5: 15,
    lineHeight: 1.5,

    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 7,

    boxShadow:
      '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    boxShadowSecondary:
      '0 4px 12px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.06)',

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
    Card: {
      borderRadiusLG: 14,
      paddingLG: 24,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#1D1D1F',
      itemHoverColor: '#007AFF',
      itemSelectedColor: '#007AFF',
      itemSelectedBg: 'rgba(0,122,255,0.08)',
      itemBorderRadius: 8,
      collapsedWidth: 72,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      controlHeightLG: 46,
      fontWeight: 500,
      primaryShadow: '0 2px 8px rgba(0,122,255,0.3)',
    },
    Input: {
      borderRadius: 8,
      paddingBlock: 8,
    },
    Table: {
      borderRadius: 10,
      headerBg: 'rgba(242,242,247,0.8)',
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Tag: {
      borderRadiusSM: 5,
    },
    Layout: {
      bodyBg: '#F2F2F7',
      headerBg: 'rgba(255,255,255,0.72)',
      siderBg: 'rgba(242,242,247,0.6)',
    },
  },
};

export default appleTheme;
