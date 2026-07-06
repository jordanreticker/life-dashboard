import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Card, InlineNote, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';
import { fonts } from '@/theme';

// Single-owner sign-in, same model as the web app's auth overlay: the username
// field defaults to the 'jrdr' shorthand (mapped to the owner email in the
// auth store); sign in once per device and supabase-js persists the session.
export default function SignIn() {
  const { palette } = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const [user, setUser] = useState('jrdr');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password) return;
    setBusy(true);
    setError(null);
    const { error: err } = await signIn(user, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.wrap, { backgroundColor: palette.bg }]}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: palette.text1 }]}>
          JrDr's{'\n'}
          <Text style={styles.titleBold}>Office</Text>
        </Text>
        <Card>
          <View style={{ gap: 10 }}>
            <TextField
              value={user}
              onChangeText={setUser}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Username"
            />
            <TextField
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Password"
              onSubmitEditing={submit}
            />
            <Button title="Sign in" onPress={submit} loading={busy} disabled={!password} />
            {error ? <InlineNote text={error} tone="error" /> : null}
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 380, alignSelf: 'center', paddingHorizontal: 16 },
  title: {
    fontFamily: fonts.sansLight,
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  titleBold: { fontFamily: fonts.sansMedium },
});
