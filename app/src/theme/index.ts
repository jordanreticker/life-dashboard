// Theme ported from the legacy web app (index.html :root CSS variables).
// Screens read the active palette via useTheme(); never hardcode hex values in
// components. The light palette IS the legacy app; dark is a new warm-dark twin.

export const radius = { sm: 6, md: 8, lg: 13, xl: 20 } as const;

// Loaded in src/app/_layout.tsx via @expo-google-fonts.
export const fonts = {
  sansLight: 'DMSans_300Light',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const palettes = {
  light: {
    bg: '#F4F2ED',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    card2: '#F4F2ED',
    border: 'rgba(0,0,0,0.07)',
    border2: 'rgba(0,0,0,0.15)',
    text1: '#18180F',
    text2: '#6A6A62',
    text3: '#AEADA6',
    paige: '#DB2777',
    paigeBg: 'rgba(219,39,119,0.08)',
    health: '#16A34A',
    healthBg: 'rgba(22,163,74,0.08)',
    community: '#7C3AED',
    communityBg: 'rgba(124,58,237,0.08)',
    work: '#D97706',
    workBg: 'rgba(217,119,6,0.08)',
    chores: '#0891B2',
    choresBg: 'rgba(8,145,178,0.08)',
    fin: '#059669',
    finBg: 'rgba(5,150,105,0.08)',
    personal: '#6366F1',
    personalBg: 'rgba(99,102,241,0.08)',
    journal: '#EC4899',
    journalBg: 'rgba(236,72,153,0.08)',
    xp: '#F59E0B',
    xpBg: 'rgba(245,158,11,0.1)',
    pp: '#8B5CF6',
    ppBg: 'rgba(139,92,246,0.1)',
    success: '#16A34A',
    danger: '#DC2626',
    dangerBg: 'rgba(220,38,38,0.08)',
  },
  dark: {
    bg: '#131311',
    surface: '#1B1B18',
    card: '#1B1B18',
    card2: '#242421',
    border: 'rgba(255,255,255,0.08)',
    border2: 'rgba(255,255,255,0.16)',
    text1: '#F2F1EC',
    text2: '#A3A29A',
    text3: '#67665F',
    paige: '#F472B6',
    paigeBg: 'rgba(244,114,182,0.14)',
    health: '#4ADE80',
    healthBg: 'rgba(74,222,128,0.14)',
    community: '#A78BFA',
    communityBg: 'rgba(167,139,250,0.14)',
    work: '#FBBF24',
    workBg: 'rgba(251,191,36,0.14)',
    chores: '#22D3EE',
    choresBg: 'rgba(34,211,238,0.14)',
    fin: '#34D399',
    finBg: 'rgba(52,211,153,0.14)',
    personal: '#818CF8',
    personalBg: 'rgba(129,140,248,0.14)',
    journal: '#F9A8D4',
    journalBg: 'rgba(249,168,212,0.14)',
    xp: '#FBBF24',
    xpBg: 'rgba(251,191,36,0.16)',
    pp: '#A78BFA',
    ppBg: 'rgba(167,139,250,0.16)',
    success: '#4ADE80',
    danger: '#F87171',
    dangerBg: 'rgba(248,113,113,0.14)',
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)['light']]: string };

// Section accents by pane, so screens can do palette[sectionAccent.work].
export type SectionKey =
  | 'paige'
  | 'health'
  | 'community'
  | 'work'
  | 'chores'
  | 'fin'
  | 'personal'
  | 'journal';
