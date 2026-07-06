// Shared bits for the ✦ Life pane components: legacy constants (ACT_TYPES,
// MOODS, MOOD_PROMPTS), the .sec-divider / .sec-hd building blocks, a native
// date field and the confirm() replacement. Palette tokens only — the legacy
// hex accents map to palette.health / .journal / .fin / .personal.

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import { fmtLong, localIso, noon } from '@/utils/dates';

// ── Legacy constants (index.html) ─────────────────────────────────────────────

export const ACT_TYPES = [
  '🎳 bowling',
  '🏐 volleyball',
  '💪 workout',
  '🧘 yoga',
  '🏃 run',
  '🚶 walk',
  '⚽ other',
] as const;

export const MOODS = [
  '😊', '😐', '😔', '😤', '😴', '🤩', '😍', '🥲',
  '😎', '🤯', '😌', '🥹', '🙏', '💪', '🌱', '🔥',
] as const;

/** The 8 moods shown as buttons (legacy MOODS.slice(0,8)). */
export const MOOD_BUTTONS = MOODS.slice(0, 8);

export const MOOD_PROMPTS: Record<string, string[]> = {
  '😊': [
    'What made you smile today?',
    'Who contributed most to your good mood?',
    'How can you carry this into tomorrow?',
  ],
  '😐': [
    'What felt flat today?',
    'Is there something small that could shift your energy?',
    'What would make tomorrow feel more alive?',
  ],
  '😔': [
    'What is weighing on you?',
    'Is there something you need that you are not getting?',
    'What is one small thing that could help?',
  ],
  '😤': [
    'What triggered the frustration?',
    'What would a fair resolution look like?',
    'Is there something you need to say to someone?',
  ],
  '😴': [
    'What is draining your energy?',
    'Are you taking care of sleep, food, movement?',
    'What would help you recharge?',
  ],
  '🤩': [
    'What got you fired up today?',
    'How can you build on this momentum?',
    'Who deserves credit for today?',
  ],
};

// ── Small primitives ──────────────────────────────────────────────────────────

/** Legacy confirm(): destructive two-button alert. */
export function confirmAction(
  title: string,
  message: string | undefined,
  onConfirm: () => void,
  confirmLabel = 'Delete',
): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/** The legacy .sec-divider: mono uppercase rule between page sections. */
export function SecDivider({ label }: { label: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.divider, { borderTopColor: palette.border }]}>
      <Mono size={11} color={palette.text3} style={styles.dividerText}>
        {label}
      </Mono>
    </View>
  );
}

/** The legacy .sec-hd row: emoji, section name, count badge, optional chevron. */
export function SecHeader({
  emoji,
  name,
  count,
  open,
  onPress,
  right,
}: {
  emoji: string;
  name: string;
  count?: number | string;
  open?: boolean; // renders ▲/▼ when provided
  onPress?: () => void;
  right?: ReactNode;
}) {
  const { palette } = useTheme();
  const inner = (
    <View style={styles.secHd}>
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text style={[styles.secName, { color: palette.text1 }]}>{name}</Text>
      {count !== undefined ? (
        <View style={[styles.countBadge, { backgroundColor: palette.card2 }]}>
          <Mono size={10} color={palette.text2}>
            {count}
          </Mono>
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      {right}
      {open !== undefined ? (
        <Mono size={10} color={palette.text3}>
          {open ? '▲' : '▼'}
        </Mono>
      ) : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

/** Small mono pill (legacy .atbtn / .encyc-filter / .abtn). */
export function Chip({
  label,
  onPress,
  active = false,
  activeColor,
  style,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  const accent = activeColor ?? palette.text1;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? accent : palette.card2,
          borderColor: active ? accent : palette.border2,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : palette.text2 }]}>{label}</Text>
    </Pressable>
  );
}

/** Date input backed by the native picker; value is a local ISO string. */
export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  style,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}) {
  const { palette, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={style}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.dateBtn, { backgroundColor: palette.card2, borderColor: palette.border }]}
      >
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            color: value ? palette.text1 : palette.text3,
          }}
        >
          {value ? fmtLong(value) : placeholder}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ? noon(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={isDark ? 'dark' : 'light'}
          onChange={(e: DateTimePickerEvent, d?: Date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (e.type === 'set' && d) onChange(localIso(d));
          }}
        />
      ) : null}
    </View>
  );
}

/** Sheet heading (legacy modal h3 + .modal-sub). */
export function SheetTitle({ title, sub }: { title: string; sub?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 17, color: palette.text1 }}>
        {title}
      </Text>
      {sub ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: palette.text2, marginTop: 3 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 6,
    marginTop: 4,
  },
  dividerText: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  secHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  secName: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chip: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  dateBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 13,
    alignSelf: 'flex-start',
  },
});
