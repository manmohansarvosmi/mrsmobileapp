import { PixelRatio } from 'react-native';

const fontScale = PixelRatio.getFontScale();
const getFontSize = (size: number) => size / fontScale;

export const Typography = {
  fontFamily: {
    regular: 'Poppins-Regular',
    bold: 'Poppins-Bold',
    semiBold: 'Poppins-SemiBold',
  },
  size: {
    xs: getFontSize(10),
    sm: getFontSize(12),
    md: getFontSize(14),
    lg: getFontSize(16),
    xl: getFontSize(18),
    xxl: getFontSize(22),
    huge: getFontSize(28),
  },
};

export const Colors = {
  primary: '#b8001d',
  secondary: '#1e293b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#2563eb',
  background: '#fcfcfc',
  surface: '#ffffff',
  border: '#f1f5f9',
  text: {
    main: '#1e293b',
    muted: '#64748b',
    light: '#94a3b8',
    white: '#ffffff',
  },
};

export const CommonStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
};
