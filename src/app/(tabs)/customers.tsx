import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  CardButton,
  Empty,
  ErrorView,
  Loading,
  Screen,
  SearchBar,
} from '@/components/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Contact } from '@/lib/types';

export default function CustomersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<Contact[]>(
    () => api.get<Contact[]>('/contacts'),
    [],
  );
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((c) =>
      [c.displayName, c.phone, c.email].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [data, q]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <SearchBar
        placeholder="Search customers…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {filtered.length === 0 ? (
        <Empty message={q ? `Nothing matches “${q.trim()}”.` : 'No customers yet.'} icon="people-outline" />
      ) : (
        filtered.map((c) => (
          <CardButton key={c.id} onPress={() => router.push(`/customers/${c.id}`)} style={styles.card}>
            <View style={styles.row}>
              <Avatar name={c.displayName} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {c.displayName}
                </ThemedText>
                {c.phone ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {c.phone}
                  </ThemedText>
                ) : null}
                {c.email ? (
                  <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                    {c.email}
                  </ThemedText>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </View>
          </CardButton>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three - 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
