import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ErrorView,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { DuplicateGroup } from '@/lib/types';

export default function DuplicatesScreen() {
  const { data, error, loading, reload } = useQuery<DuplicateGroup[]>(
    () => api.get<DuplicateGroup[]>('/contacts/duplicates'),
    [],
  );

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const groups = data ?? [];
  if (groups.length === 0)
    return <Empty message="No likely duplicates — your customer list looks clean." icon="sparkles-outline" />;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The native stack header supplies "Duplicates" + back. */}
      <ThemedText type="small" themeColor="textSecondary">
        {groups.length} {groups.length === 1 ? 'group' : 'groups'} to review.
      </ThemedText>
      {groups.map((g, i) => (
        <DuplicateCard key={i} group={g} onMerged={reload} />
      ))}
    </Screen>
  );
}

function DuplicateCard({ group, onMerged }: { group: DuplicateGroup; onMerged: () => void }) {
  const theme = useTheme();
  const [primaryId, setPrimaryId] = useState(group.contacts[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doMerge = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const c of group.contacts) {
        if (c.id === primaryId) continue;
        await api.post(`/contacts/${primaryId}/merge/${c.id}`);
      }
      onMerged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Merge failed');
      setBusy(false);
    }
  };

  const confirmMerge = () =>
    Alert.alert(
      'Merge duplicates?',
      'The other record(s) are merged into the one you keep, and removed (recoverable).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Merge', style: 'destructive', onPress: () => void doMerge() },
      ],
    );

  const keeper = group.contacts.find((c) => c.id === primaryId);
  const mergeCount = group.contacts.length - (keeper ? 1 : 0);

  return (
    <Card style={{ gap: Spacing.three }}>
      <SectionTitle right={<Badge label={group.reasons.join(' · ')} tone="warning" />}>
        Possible duplicate
      </SectionTitle>

      <ThemedText type="small" themeColor="textSecondary">
        Pick the record to keep. The others merge into it.
      </ThemedText>

      {/* Each candidate is a tinted well; the keeper is filled with the accent tint. */}
      <View style={{ gap: Spacing.two }}>
        {group.contacts.map((c) => {
          const selected = c.id === primaryId;
          return (
            <Pressable
              key={c.id}
              onPress={() => setPrimaryId(c.id)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: selected ? theme.accentSoft : theme.well, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Avatar name={c.displayName} size={40} />
              <View style={{ flex: 1, gap: 1 }}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {c.displayName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {c.phone ?? '—'}
                  {c.email ? ` · ${c.email}` : ''}
                </ThemedText>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={selected ? theme.accent : theme.muted}
              />
            </Pressable>
          );
        })}
      </View>

      {keeper ? (
        <View style={[styles.summary, { backgroundColor: theme.well }]}>
          <Ionicons name="git-merge-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
            Keeping{' '}
            <ThemedText type="smallBold">{keeper.displayName}</ThemedText>
            {mergeCount > 0
              ? ` · ${mergeCount} other ${mergeCount === 1 ? 'record' : 'records'} merged in`
              : ''}
          </ThemedText>
        </View>
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      {/* Full-width and set apart from the tappable rows above — merging is not a mis-tap. */}
      <Button label="Merge into selected" icon="git-merge-outline" loading={busy} onPress={confirmMerge} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
  },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
  },
});
