export const Theme = {
  colors: {
    bg: '#F8FAFC',            // Clean light slate background
    bgCard: '#FFFFFF',        // Pure white card surfaces
    bgCardSubtle: '#F1F5F9',  // Light grey inset/secondary surfaces
    bgCardHover: '#E2E8F0',   // Hover / active touch state
    border: '#E2E8F0',        // Subtle hairline border
    borderLight: '#CBD5E1',   // Medium contrast border
    borderActive: '#2563EB',  // Active selected border (Deep Blue)
    
    // Professional Accent Palette (Apple / Linear / Stripe grade)
    primary: '#1D4ED8',       // Deep Royal Blue
    primaryHover: '#1E40AF',
    primaryMuted: '#EFF6FF',  // Very soft blue tint
    primaryGlow: 'rgba(29, 78, 216, 0.12)',
    
    success: '#059669',       // Clean Emerald
    successMuted: '#ECFDF5',  // Soft green background
    successText: '#065F46',
    
    warning: '#D97706',       // Warm Amber
    warningMuted: '#FFFBEB',
    warningText: '#92400E',
    
    danger: '#DC2626',        // Clean Crimson Red
    dangerMuted: '#FEF2F2',
    
    // Crisp ink typography
    textPrimary: '#0F172A',   // Deep slate black
    textSecondary: '#475569', // Body text slate
    textMuted: '#64748B',     // Secondary captions
    textDim: '#94A3B8',       // Subtle timestamps / disabled
  },
  typography: {
    fontFamilyMono: 'Courier',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  }
};
