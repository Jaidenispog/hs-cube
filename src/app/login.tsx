import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, Input, Screen } from '@/components/kit';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Font } from '@/lib/fonts';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';
import type { DemoAccount } from '@/lib/types';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    api
      .get<{ accounts: DemoAccount[] }>('/auth/demo-credentials')
      .then((r) => setAccounts(r.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.centre}>
      {/* Accent mark + wordmark, floating on the page. */}
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: theme.accent }, Shadow.lifted]}>
          <Ionicons name="construct" size={28} color={theme.accentText} />
        </View>
        <ThemedText type="subtitle" style={styles.wordmark}>
          OneStack
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Field &amp; front-desk app for the workshop.
        </ThemedText>
      </View>

      <Card style={{ gap: Spacing.two + 2 }}>
        <ThemedText style={styles.cardTitle}>Sign in</ThemedText>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="username"
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        {error ? (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>
              {error}
            </ThemedText>
          </View>
        ) : null}
        <Button
          label="Sign in"
          icon="log-in-outline"
          chevron
          onPress={submit}
          loading={busy}
          disabled={!email || !password}
        />
      </Card>

      {accounts.length ? (
        <Card style={{ gap: Spacing.two }}>
          <ThemedText style={styles.cardTitle}>Test accounts</ThemedText>
          {accounts.map((a) => (
            <Pressable
              key={a.email}
              onPress={() => {
                setEmail(a.email);
                setPassword(a.password);
              }}
              style={({ pressed }) => [
                styles.acct,
                { backgroundColor: theme.well, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Avatar name={a.label} size={34} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.acctLabel} numberOfLines={1}>
                  {a.label}
                </ThemedText>
                <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                  {a.email}
                </ThemedText>
              </View>
              <ThemedText type="code" themeColor="textSecondary">
                {a.password}
              </ThemedText>
            </Pressable>
          ))}
          <ThemedText type="small" themeColor="muted">
            Tap to fill, then Sign in.
          </ThemedText>
        </Card>
      ) : null}

      <ThemedText type="code" themeColor="muted" style={{ textAlign: 'center' }}>
        API: {API_BASE_URL}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  mark: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  wordmark: { letterSpacing: -0.8 },
  cardTitle: { fontFamily: Font.semibold, fontSize: 16, letterSpacing: -0.2 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
  },
  acct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
  },
  acctLabel: { fontFamily: Font.semibold, fontSize: 14 },
});
