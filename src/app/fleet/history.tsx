import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  BigStat,
  Card,
  Empty,
  ErrorView,
  Loading,
  Screen,
  ScreenHeader,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { RentalPeriod, formatDateTime, purposeLabel } from '@/lib/fleet';
import { Font } from '@/lib/fonts';
import { useQuery } from '@/lib/use-query';

export default function FleetHistoryScreen() {
  const theme = useTheme();
  const { rego = '' } = useLocalSearchParams<{ rego: string }>();
  const clean = String(rego).toUpperCase();
  const { data, loading, error, reload } = useQuery<RentalPeriod[]>(
    () => api.get(`/fleet/vehicles/history?rego=${encodeURIComponent(clean)}`),
    [clean],
  );

  /** Presentational roll-up of the list we already have — no extra fetches. */
  const periods = data ?? [];
  const outNow = useMemo(() => periods.some((p) => p.ongoing), [periods]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <ScreenHeader title={`Chain of custody`} subtitle={clean} />

      {/* Who's had this car, and how many times it's been out. */}
      <Card>
        <BigStat
          label={clean || 'This car'}
          value={String(periods.length)}
          icon="car-sport"
          iconTone={outNow ? 'danger' : 'accent'}
          delta={outNow ? 'Out now' : undefined}
          deltaTone="danger"
          caption={periods.length === 1 ? 'Rental period on record' : 'Rental periods on record'}
        />
      </Card>

      {periods.length === 0 ? (
        <Empty message="No history for this car." icon="time-outline" />
      ) : (
        <>
          <SectionTitle>Rental periods</SectionTitle>
          <Card style={styles.timelineCard}>
            {periods.map((p, i) => {
              const last = i === periods.length - 1;
              const notes = [p.notes, p.returnNotes].filter(Boolean).join(' · ');
              return (
                <View key={p.id} style={styles.row}>
                  {/* Rail: a dot per period, joined by a soft line. Decorative, not a divider. */}
                  <View style={styles.rail}>
                    {!last ? (
                      <View style={[styles.railLine, { backgroundColor: theme.well }]} />
                    ) : null}
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: p.ongoing ? theme.danger : theme.accentSoft },
                      ]}
                    />
                  </View>

                  <View style={[styles.body, last && styles.bodyLast]}>
                    <View style={styles.head}>
                      <ThemedText style={styles.driver} numberOfLines={1}>
                        {p.driverName || 'Unknown driver'}
                      </ThemedText>
                      {p.ongoing ? (
                        <Badge label="Out" tone="danger" />
                      ) : p.purpose ? (
                        <Badge label={purposeLabel(p.purpose)} tone="muted" />
                      ) : null}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDateTime(p.outAt)} → {p.ongoing ? 'still out' : formatDateTime(p.backAt)}
                    </ThemedText>
                    {notes ? (
                      <View style={[styles.notes, { backgroundColor: theme.well }]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {notes}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const DOT = 12;
const RAIL_W = 22;

const styles = StyleSheet.create({
  timelineCard: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.two + 4 },
  rail: { width: RAIL_W, alignItems: 'center', paddingTop: 6 },
  railLine: {
    position: 'absolute',
    top: 6 + DOT,
    bottom: 0,
    width: 2,
    borderRadius: Radius.pill,
  },
  dot: { width: DOT, height: DOT, borderRadius: Radius.pill },
  body: { flex: 1, gap: 3, paddingBottom: Spacing.four },
  bodyLast: { paddingBottom: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, justifyContent: 'space-between' },
  driver: { fontFamily: Font.semibold, fontSize: 15, flexShrink: 1 },
  notes: { borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9, marginTop: Spacing.one },
});
