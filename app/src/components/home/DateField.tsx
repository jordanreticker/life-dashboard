// Date input used by the completion/backdate sheets — the RN stand-in for the
// legacy <input type="date"> (.dtp). iOS renders the compact inline picker;
// Android shows the dialog on tap.

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import { fmtLong, localIso, noon } from '@/utils/dates';

export function DateField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
}) {
  const { palette, isDark } = useTheme();
  const [androidOpen, setAndroidOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setAndroidOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(localIso(date));
  };

  return (
    <View style={styles.row}>
      {label ? (
        <Text style={[styles.label, { color: palette.text2 }]}>{label}</Text>
      ) : null}
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={noon(value)}
          mode="date"
          display="compact"
          themeVariant={isDark ? 'dark' : 'light'}
          onChange={handleChange}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setAndroidOpen(true)}
            style={[
              styles.androidBtn,
              { backgroundColor: palette.card2, borderColor: palette.border },
            ]}
          >
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
              {fmtLong(value)}
            </Text>
          </Pressable>
          {androidOpen ? (
            <DateTimePicker value={noon(value)} mode="date" onChange={handleChange} />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  androidBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
