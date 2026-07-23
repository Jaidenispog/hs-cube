import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  BigStat,
  Button,
  Card,
  Empty,
  ErrorView,
  Loading,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/kit';
import { Spacing } from '@/constants/theme';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCoords, geoReasonLabel, type GeoResult } from '@/lib/location';
import { checkInWithLocation, checkOut } from '@/lib/time-clock';
import { useQuery } from '@/lib/use-query';
import { hoursLabel, type ClockStatus, type DirectoryEntry, type StaffTotal, type TimeEntry } from '@/lib/types';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

/** Minutes elapsed since an open clock-in, resolved at render (refresh updates it). */
function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function TimeClockScreen() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const { data: status, error, loading, reload } = useQuery<ClockStatus>(
    () => api.get<ClockStatus>('/time-clock/status'),
    [],
  );
  const { data: entries, reload: reloadEntries } = useQuery<TimeEntry[]>(
    () => api.get<TimeEntry[]>('/time-clock/entries'),
    [],
  );

  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  // The location captured on the most recent check-in (cleared on check-out).
  const [lastGeo, setLastGeo] = useState<GeoResult | null>(null);

  const toggle = async () => {
    setBusy(true);
    setActionErr(null);
    try {
      if (status?.onClock) {
        await checkOut();
        setLastGeo(null);
      } else {
        // Set the captured location only after check-in resolves, so a failed check-in never shows a
        // "location recorded" line.
        const geo = await checkInWithLocation();
        setLastGeo(geo);
      }
      reload();
      reloadEntries();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) return <Loading />;
  if (error && !status) return <ErrorView message={error} onRetry={reload} />;

  const onClock = status?.onClock ?? false;
  const openEntry = onClock ? status?.entry : null;

  // Display-only derivations over the sessions already fetched.
  const sessions = entries ?? [];
  const loggedMinutes = sessions.reduce((sum, e) => sum + (e.minutes ?? 0), 0);

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The hero: the session running right now, and the one action that changes it. */}
      <Card>
        <BigStat
          label={onClock ? 'Current session' : 'Not checked in'}
          // A lone em-dash at 40pt bold reads as a redaction bar, not "no value" — use a real duration.
          value={openEntry ? hoursLabel(minutesSince(openEntry.clockInAt)) : '0m'}
          delta={onClock ? 'Live' : undefined}
          deltaTone="success"
          icon="time"
          iconTone={onClock ? 'success' : 'accent'}
          caption={openEntry ? `Since ${fmt(openEntry.clockInAt)}` : 'Press check in to start'}
        />
        <Button
          label={onClock ? 'Check out' : 'Check in'}
          icon={onClock ? 'log-out-outline' : 'log-in-outline'}
          tone={onClock ? 'plain' : 'accent'}
          loading={busy}
          onPress={toggle}
        />
        {lastGeo ? (
          <ThemedText
            type="small"
            themeColor={lastGeo.ok ? (lastGeo.source === 'override' ? 'accent' : 'success') : 'muted'}
          >
            {lastGeo.ok
              ? `📍 ${lastGeo.source === 'override' ? 'Set location' : 'Location recorded'} · ${formatCoords(lastGeo.coords)}`
              : `📍 ${geoReasonLabel(lastGeo.reason)} — checked in without location`}
          </ThemedText>
        ) : null}
        {actionErr ? (
          <ThemedText type="small" themeColor="danger">
            {actionErr}
          </ThemedText>
        ) : null}
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="albums" value={String(sessions.length)} label="Sessions" pastel="lilac" />
        <StatTile icon="hourglass" value={hoursLabel(loggedMinutes)} label="Logged" pastel="mint" />
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>My recent sessions</SectionTitle>
        {sessions.length === 0 ? (
          <Empty message="No sessions yet." icon="time-outline" />
        ) : (
          <Card>
            {sessions.map((e) => (
              <View key={e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {fmt(e.clockInAt)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {e.clockOutAt ? `Until ${fmt(e.clockOutAt)}` : 'Still running'}
                  </ThemedText>
                </View>
                {e.clockOutAt ? (
                  <ThemedText type="smallBold">{e.minutes != null ? hoursLabel(e.minutes) : '—'}</ThemedText>
                ) : (
                  <Badge label="Open" tone="success" />
                )}
              </View>
            ))}
          </Card>
        )}
      </View>

      {isOwner ? <AdminHours /> : null}
    </Screen>
  );
}

/** OWNER-only: hours logged per staff member, names resolved from the directory. */
function AdminHours() {
  const load = useCallback(
    () =>
      Promise.all([
        api.get<StaffTotal[]>('/time-clock/summary'),
        api.get<DirectoryEntry[]>('/auth/directory'),
      ]),
    [],
  );
  const { data, error, loading } = useQuery(load, []);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} />;
  const [totals, directory] = data ?? [[], []];
  if (!totals.length) return <Empty message="No staff yet." icon="people-outline" />;
  const emailFor = new Map(directory.map((d) => [d.userId, d.email]));

  return (
    <View style={{ gap: Spacing.two }}>
      <SectionTitle>Hours logged — all staff</SectionTitle>
      <Card>
        {totals.map((t) => {
          const who = emailFor.get(t.userId) ?? `${t.userId.slice(0, 8)}…`;
          return (
            <View key={t.userId} style={styles.row}>
              <Avatar name={who} size={40} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {who}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {t.role ?? '—'} · {t.sessions} session{t.sessions === 1 ? '' : 's'}
                </ThemedText>
              </View>
              <View style={styles.rowRight}>
                <ThemedText type="smallBold">{hoursLabel(t.totalMinutes)}</ThemedText>
                {t.onClock ? <Badge label="On now" tone="success" /> : null}
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4, paddingVertical: 6 },
  rowRight: { alignItems: 'flex-end', gap: 3 },
});
