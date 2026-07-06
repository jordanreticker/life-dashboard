// Shared bits for the Paige pane components: the legacy .sec-hd section header,
// star-rating rows, a date-picker field, freshness tone→palette mapping and the
// confirm() replacement. Visual language mirrors the legacy pane (index.html
// rPaige) with palette tokens only.

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts, radius, type Palette } from '@/theme';
import type { FreshTone } from '@/utils/compute';
import { fmtLong, localIso, noon } from '@/utils/dates';

/** Legacy freshObj color bands mapped to palette tokens. */
export function freshColor(palette: Palette, tone: FreshTone): string {
  switch (tone) {
    case 'fresh':
      return palette.success;
    case 'mid':
      return palette.xp;
    case 'low':
      return palette.work;
    default:
      // 'overdue' | 'critical' | 'never'
      return palette.danger;
  }
}

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

/** The legacy .sec-hd row: emoji, section name, count badge, chevron. */
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

/** Interactive 1–5 star row (date-idea excitement / final rating). */
export function Stars({
  rating,
  onChange,
  size = 18,
}: {
  rating: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={6}>
          <Text style={{ fontSize: size, color: i <= rating ? palette.xp : palette.border2 }}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Date input backed by the native picker; value is a local ISO string. */
export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  allowClear = false,
  style,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  style?: ViewStyle;
}) {
  const { palette, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          style={[
            styles.dateBtn,
            { backgroundColor: palette.card2, borderColor: palette.border },
          ]}
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
        {allowClear && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Text style={{ color: palette.text3, fontSize: 13 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>
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

/** The legacy .add-wrap input + Add button, with optional extras row below. */
export function AddRow({
  placeholder,
  onAdd,
  extras,
}: {
  placeholder: string;
  onAdd: (text: string) => void;
  extras?: ReactNode;
}) {
  const { palette } = useTheme();
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
  };
  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextField
          placeholder={placeholder}
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          returnKeyType="done"
          style={{ flex: 1 }}
        />
        <Pressable
          onPress={add}
          style={[styles.addBtn, { backgroundColor: palette.text1 }]}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
            Add
          </Text>
        </Pressable>
      </View>
      {extras}
    </View>
  );
}

/** Small pill button (legacy .abtn / .bsm / filter chips). */
export function Chip({
  label,
  color,
  bg,
  onPress,
  style,
}: {
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color }}>{label}</Text>
    </Pressable>
  );
}

/** Legacy task/chore checkbox circle. */
export function Check({
  checked,
  color,
  onPress,
}: {
  checked: boolean;
  color: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <View
        style={[
          styles.check,
          { borderColor: checked ? color : palette.border2 },
          checked && { backgroundColor: color },
        ]}
      >
        {checked ? <Text style={{ color: '#fff', fontSize: 12, lineHeight: 14 }}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

/** Sheet heading (legacy modal h3 + .modal-sub). */
export function SheetTitle({ title, sub, subColor }: { title: string; sub?: string; subColor?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 17, color: palette.text1 }}>
        {title}
      </Text>
      {sub ? (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: subColor ?? palette.text2,
            marginTop: 3,
          }}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Legacy advanceDate() — next due date for a recurring task. */
export function advanceDate(iso: string, rec: string): string {
  const d = noon(iso);
  if (rec === 'daily') d.setDate(d.getDate() + 1);
  else if (rec === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec === 'monthly') d.setMonth(d.getMonth() + 1);
  return localIso(d);
}

const styles = StyleSheet.create({
  secHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
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
  dateBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 13,
    alignSelf: 'flex-start',
  },
  addBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  chip: {
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  check: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
