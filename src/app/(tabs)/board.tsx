import { StyleSheet, View } from 'react-native';
import { JobCard, prettyState, stateTone } from '@/components/job-card';
import { ThemedText } from '@/components/themed-text';
import { Badge, Empty, ErrorView, Loading, Screen } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { BoardView } from '@/lib/types';

/** A column heading: a tone dot so the state reads at a glance, the name, and its count. */
function ColumnHeader({ state, count }: { state: string; count: number }) {
  const theme = useTheme();
  const tone = stateTone(state);
  const tint = tone === 'muted' ? theme.textSecondary : theme[tone];
  return (
    <View style={styles.colHeader}>
      <View style={[styles.dot, { backgroundColor: tint }]} />
      <ThemedText style={styles.colTitle}>{prettyState(state)}</ThemedText>
      <Badge label={String(count)} tone={count === 0 ? 'muted' : tone} />
    </View>
  );
}

export default function BoardScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<BoardView>(
    () => api.get<BoardView>('/board?type=job'),
    [],
  );

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const columns = (data?.columns ?? []).filter((c) => c.cards.length > 0 || !c.isFinal);

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {columns.length === 0 ? (
        <Empty message="No jobs on the board." icon="grid-outline" />
      ) : (
        columns.map((col) => (
          <View key={col.state} style={{ gap: Spacing.two }}>
            <ColumnHeader state={col.state} count={col.cards.length} />
            {col.cards.length === 0 ? (
              <View style={[styles.emptyCol, { backgroundColor: theme.well }]}>
                <ThemedText type="small" themeColor="muted">
                  Nothing here
                </ThemedText>
              </View>
            ) : (
              col.cards.map((card) => <JobCard key={card.id} card={card} />)
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  colTitle: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 16, letterSpacing: -0.2 },
  emptyCol: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
