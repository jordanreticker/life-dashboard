import { type ReactNode, type RefObject, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';

// Shared primitives ported from the legacy web app's visual language
// (index.html): white cards with hairline borders, DM Mono eyebrow labels,
// pill badges, the light-weight/bold split in headings.

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  scrollRef,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const inner = <View style={styles.pageInner}>{children}</View>;
  return scroll ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + 14 }]}
      // Without this a tap on a list row while the keyboard is up is swallowed
      // to dismiss the keyboard instead of registering.
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      alwaysBounceVertical={!!onRefresh}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.text3} />
        ) : undefined
      }
    >
      {inner}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, backgroundColor: palette.bg },
        styles.pageContent,
        { paddingTop: insets.top + 14 },
      ]}
    >
      {inner}
    </View>
  );
}

// The legacy topbar: light-weight first line, medium second ("JrDr's / Office"),
// or a single bold title with emoji for section panes.
export function PaneTitle({
  title,
  onLongPress,
  right,
}: {
  title: string;
  onLongPress?: () => void;
  right?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.topbar}>
      <Pressable onLongPress={onLongPress} delayLongPress={1200}>
        <Text style={[styles.paneTitle, { color: palette.text1 }]}>{title}</Text>
      </Pressable>
      {right ? <View style={styles.topbarRight}>{right}</View> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { palette } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }, style]}
    >
      {children}
    </View>
  );
}

// Mono uppercase eyebrow label, tinted with the section accent.
export function Label({ children, color }: { children: ReactNode; color?: string }) {
  const { palette } = useTheme();
  return <Text style={[styles.label, { color: color ?? palette.text3 }]}>{children}</Text>;
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'accent';

export function Button({
  title,
  onPress,
  variant = 'primary',
  accentColor,
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  // For variant 'accent': the section color (e.g. palette.paige).
  accentColor?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  const colors: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    // The legacy primary button: ink background, white text.
    primary: { bg: palette.text1, fg: palette.bg },
    ghost: { bg: 'transparent', fg: palette.text2, border: palette.border2 },
    danger: { bg: palette.dangerBg, fg: palette.danger, border: palette.danger },
    accent: { bg: accentColor ?? palette.text1, fg: '#fff' },
  };
  const c = colors[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: c.bg,
          borderColor: c.border ?? 'transparent',
          borderWidth: c.border ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.fg} />
      ) : (
        <Text style={[styles.btnText, { color: c.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextField(props: TextInputProps & { style?: TextStyle }) {
  const { palette } = useTheme();
  const [revealed, setRevealed] = useState(false);

  const secure = !!props.secureTextEntry;
  const field = (
    <TextInput
      placeholderTextColor={palette.text3}
      {...props}
      secureTextEntry={secure && !revealed}
      style={[
        styles.input,
        {
          backgroundColor: palette.card2,
          borderColor: palette.border,
          color: palette.text1,
        },
        secure && { paddingRight: 58 },
        props.style,
      ]}
    />
  );

  if (!secure) return field;
  return (
    <View>
      {field}
      <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={8} style={styles.revealToggle}>
        <Text style={[styles.revealText, { color: palette.text2 }]}>
          {revealed ? 'Hide' : 'Show'}
        </Text>
      </Pressable>
    </View>
  );
}

export function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function InlineNote({
  text,
  tone = 'muted',
}: {
  text: string;
  tone?: 'muted' | 'error' | 'success';
}) {
  const { palette } = useTheme();
  const color =
    tone === 'error' ? palette.danger : tone === 'success' ? palette.success : palette.text3;
  return <Text style={[styles.note, { color }]}>{text}</Text>;
}

// Full-width loading state for screens while data is in flight.
export function Loading({ label }: { label?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 14 }}>
      <ActivityIndicator color={palette.text3} />
      {label ? <Text style={[styles.note, { color: palette.text3 }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</Text>
      <Text
        style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: palette.text1, marginBottom: 4 }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            lineHeight: 19,
            color: palette.text2,
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}

// A bottom-anchored modal sheet with a dimmed, tap-to-dismiss backdrop.
// The RN replacement for the legacy .mback/.modal overlays.
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        {/* Inner Pressable absorbs taps so they don't dismiss the sheet. */}
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.sheetGrabber, { backgroundColor: palette.border2 }]} />
          <ScrollView
            style={{ maxHeight: 560 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Segmented control — the legacy .tier-tab row (community tiers, "who did it").
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accentColor,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accentColor?: string;
}) {
  const { palette } = useTheme();
  const accent = accentColor ?? palette.text1;
  return (
    <View style={[styles.segRow, { borderColor: palette.border2 }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segTab, active && { backgroundColor: accent }]}
          >
            <Text
              style={[
                styles.segText,
                { color: active ? palette.bg : palette.text2 },
                active && { fontFamily: fonts.sansMedium },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    paddingHorizontal: 12,
    paddingBottom: 60,
  },
  pageInner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paneTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 13,
    fontSize: 14,
    fontFamily: fonts.sans,
  },
  revealToggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  revealText: { fontFamily: fonts.sansMedium, fontSize: 12 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  note: {
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: 8,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  segRow: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segText: {
    fontFamily: fonts.sans,
    fontSize: 12,
  },
});
