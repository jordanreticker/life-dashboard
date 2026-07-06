// Field primitives for the task components: priority pill colors + picker,
// recurrence picker, and a due-date field wrapping the native date picker.
// All colors come from theme tokens (legacy .pu/.ph/.pm/.pl pills mapped to
// danger/work/xp/success accents).

import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts, radius, type Palette } from '@/theme';
import { fmtDate, localIso, noon, todayIso } from '@/utils/dates';

import { PRIORITIES, RECURRENCES, type Priority, type Recurrence } from './taskActions';

/** Legacy priority pill palette (.pu/.ph/.pm/.pl), token-mapped. */
export function priorityColors(palette: Palette): Record<string, { fg: string; bg: string }> {
  return {
    urgent: { fg: palette.danger, bg: palette.dangerBg },
    high: { fg: palette.work, bg: palette.workBg },
    medium: { fg: palette.xp, bg: palette.xpBg },
    low: { fg: palette.success, bg: palette.healthBg },
  };
}

/** Priority pills — tap to select, tap again to clear (the select's '' option). */
export function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  const { palette } = useTheme();
  const colors = priorityColors(palette);
  return (
    <View style={styles.priRow}>
      {PRIORITIES.map((p) => {
        const active = value === p;
        const c = colors[p];
        return (
          <Pressable
            key={p}
            onPress={() => onChange(active ? '' : p)}
            style={[
              styles.priPill,
              { backgroundColor: c.bg, borderColor: active ? c.fg : 'transparent' },
            ]}
          >
            <Text style={[styles.priText, { color: c.fg }]}>{p}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Recurrence — none / daily / weekly / monthly (legacy edit-recur select). */
export function RecurrencePicker({
  value,
  onChange,
  accentColor,
}: {
  value: Recurrence;
  onChange: (r: Recurrence) => void;
  accentColor?: string;
}) {
  return (
    <Segmented<Recurrence>
      options={[
        { value: '', label: 'none' },
        ...RECURRENCES.map((r) => ({ value: r, label: `🔁 ${r}` })),
      ]}
      value={value}
      onChange={onChange}
      accentColor={accentColor}
    />
  );
}

/**
 * Date field: a pill showing the picked date (or placeholder) that opens the
 * native picker; ✕ clears. Value is a local YYYY-MM-DD string, '' = unset.
 */
export function DateField({
  value,
  onChange,
  placeholder = 'due date',
  accentColor,
  style,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  accentColor?: string;
  style?: object;
}) {
  const { palette, isDark } = useTheme();
  const [show, setShow] = useState(false);

  const handleChange = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (e.type === 'set' && d) {
      onChange(localIso(d));
      setShow(false);
    }
  };

  return (
    <View style={style}>
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => setShow((s) => !s)}
          style={[
            styles.datePill,
            { backgroundColor: palette.card2, borderColor: palette.border },
          ]}
        >
          <Text
            style={[styles.dateText, { color: value ? palette.text1 : palette.text3 }]}
            numberOfLines={1}
          >
            {value ? fmtDate(value) : placeholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable onPress={() => onChange('')} hitSlop={8} style={styles.clearBtn}>
            <Text style={{ fontSize: 12, color: palette.text3 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <DateTimePicker
          value={noon(value || todayIso())}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={accentColor}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  priRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  priPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  priText: { fontFamily: fonts.monoMedium, fontSize: 11 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  datePill: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  dateText: { fontFamily: fonts.mono, fontSize: 12 },
  clearBtn: { paddingHorizontal: 4 },
});
