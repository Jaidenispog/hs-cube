import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { prettyState, stateTone } from '@/components/job-card';
import {
  Badge,
  BigStat,
  Button,
  Card,
  CardButton,
  Empty,
  ErrorView,
  Loading,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/kit';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/use-query';
import { hoursLabel, type ClockStatus, type WorkItem } from '@/lib/types';

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

/**
 * The employee's home: clock on, see the work that's actually theirs, and get into it.
 *
 * Every call here is on the API's @AllowStaff() surface, and /work-items is scoped server-side to the
 * caller's assignments — this screen never asks for the shop's revenue or the full board, because a
 * worker's token would (correctly) be refused.
 */
export default function EmployeeHome() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const clock = useQuery<ClockStatus>(() => api.get<ClockStatus>('/time-clock/status'), []);
  const jobs = useQuery<WorkItem[]>(() => api.get<WorkItem[]>('/work-items?type=job'), []);

  const onClock = clock.data?.onClock ?? false;
  const openEntry = clock.data?.entry ?? null;

  // "How many jobs have I picked up", grouped by where each one is up to.
  const byState = useMemo(() => {
    const out = new Map<string, number>();
    for (const j of jobs.data ?? []) out.set(j.stateName, (out.get(j.stateName) ?? 0) + 1);
    return [...out.entries()];
  }, [jobs.data]);

  const toggleClock = async () => {
    setBusy(true);
    try {
      await api.post(onClock ? '/time-clock/check-out' : '/time-clock/check-in');
      clock.reload();
    } finally {
      setBusy(false);
    }
  };

  if (clock.loading && !clock.data) return <Loading />;
  if (clock.error && !clock.data) return <ErrorView message={clock.error} onRetry={clock.reload} />;

  const mine = jobs.data ?? [];
  const active = mine.filter((j) => !/collect|closed|cancel/i.test(j.stateName)).length;

  return (
    <Screen
      safeTop
      refreshing={clock.loading || jobs.loading}
      onRefresh={() => {
        clock.reload();
        jobs.reload();
      }}
    >
      <View style={styles.greet}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }, Shadow.subtle]}>
          <ThemedText style={{ color: theme.accentText, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>
            {(user?.role ?? 'S')[0]}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.hello} numberOfLines={1}>
            {onClock ? 'On the clock' : 'Ready to start'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {onClock ? 'Have a good shift' : 'Check in when you start'}
          </ThemedText>
        </View>
      </View>

      {/* The one thing a worker opens this app to do. */}
      <Card>
        <BigStat
          label={onClock ? 'Current session' : 'Not checked in'}
          value={openEntry ? hoursLabel(minutesSince(openEntry.clockInAt)) : '0m'}
          delta={onClock ? 'Live' : undefined}
          deltaTone="success"
          icon="time"
          iconTone={onClock ? 'success' : 'accent'}
          caption={onClock ? 'Tap to check out when you finish' : 'Tap to start your shift'}
        />
        <Button
          label={onClock ? 'Check out' : 'Check in'}
          icon={onClock ? 'log-out-outline' : 'log-in-outline'}
          tone={onClock ? 'danger' : 'accent'}
          loading={busy}
          onPress={() => void toggleClock()}
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="construct" value={String(active)} label="My open jobs" pastel="lilac" />
        <StatTile icon="layers" value={String(mine.length)} label="Picked up" pastel="sky" />
      </View>

      <View style={styles.actions}>
        <Button
          label="New job from photos"
          icon="camera"
          onPress={() => router.push('/jobs/new')}
        />
      </View>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {mine.length} {mine.length === 1 ? 'job' : 'jobs'}
          </ThemedText>
        }
      >
        My jobs
      </SectionTitle>

      {jobs.error && !jobs.data ? (
        <ErrorView message={jobs.error} onRetry={jobs.reload} />
      ) : mine.length === 0 ? (
        <Empty message="Nothing assigned to you yet." icon="construct-outline" />
      ) : (
        <>
          {byState.length > 1 ? (
            <View style={styles.chips}>
              {byState.map(([state, n]) => (
                <Badge key={state} label={`${prettyState(state)} · ${n}`} tone={stateTone(state)} />
              ))}
            </View>
          ) : null}
          {mine.map((j) => (
            <CardButton key={j.id} style={styles.jobCard} onPress={() => router.push(`/jobs/${j.id}`)}>
              <View style={styles.jobRow}>
                <View style={[styles.jobIcon, { backgroundColor: theme.well }]}>
                  <ThemedText style={styles.jobRef} numberOfLines={1}>
                    {j.reference.replace(/^J-0*/, '#')}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.jobTitle} numberOfLines={1}>
                    {j.reference}
                  </ThemedText>
                  <ThemedText type="small" themeColor="muted">
                    Updated {new Date(j.createdAt).toLocaleDateString('en-AU')}
                  </ThemedText>
                </View>
                <Badge label={prettyState(j.stateName)} tone={stateTone(j.stateName)} />
              </View>
            </CardButton>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  avatar: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  hello: { fontFamily: 'Poppins_700Bold', fontSize: 23, lineHeight: 28, letterSpacing: -0.5 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  actions: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two - 2 },
  jobCard: { padding: Spacing.three - 2 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  jobIcon: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.sm, minWidth: 52, alignItems: 'center' },
  jobRef: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
  jobTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
