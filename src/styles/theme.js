export const theme = {
  colors: {
    bg: {
      primary: '#0B1120',
      secondary: '#151E32',
      tertiary: '#1E293B',
      elevated: '#243447',
    },
    primary: {
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#64748B',
      disabled: '#475569',
    },
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#8B5CF6',
    border: {
      default: '#334155',
      hover: '#475569',
      focus: '#0EA5E9',
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(14, 165, 233, 0.15)',
    glowLg: '0 0 30px rgba(14, 165, 233, 0.2)',
  }
};

export const lightTheme = {
  colors: {
    bg: {
      primary: '#F4F8FC',
      secondary: '#EAF2F9',
      tertiary: '#DFE9F3',
      elevated: '#D3DFF0',
    },
    primary: {
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
    },
    text: {
      primary: '#0B1120',
      secondary: '#243447',
      muted: '#475569',
      disabled: '#64748B',
    },
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#7C3AED',
    border: {
      default: '#CDD5E0',
      hover: '#A6B5C5',
      focus: '#0EA5E9',
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
    glow: '0 0 20px rgba(14, 165, 233, 0.1)',
    glowLg: '0 0 30px rgba(14, 165, 233, 0.15)',
  }
};

export const ROLE_COLORS = {
  admin: 'bg-venus-info/20 text-venus-info border-venus-info/30',
  doctor: 'bg-venus-success/20 text-venus-success border-venus-success/30',
  receptionist: 'bg-venus-warning/20 text-venus-warning border-venus-warning/30',
  nurse: 'bg-venus-primary-500/20 text-venus-primary-400 border-venus-primary-500/30',
};