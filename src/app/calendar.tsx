import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Badge, BigStat, Card, Empty, ErrorView, Loading, Screen, StatTile } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Booking, Resource } from '@/lib/types';

const WINDOW_DAYS = 14;

/** A day heading: a tone dot (accent for today), the date, and the count sitting under it. */
function DayHeader({ day, count, today }: { day: string; count: number; today: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.dayHeader}>
      <View style={[styles.dot, { backgroundColor: today ? theme.accent : theme.muted }]} />
      <ThemedText style={styles.dayTitle}>{day}</ThemedText>
      <Badge label={String(count)} tone={today ? 'accent' : 'muted'} />
    </View>
  );
}

/** One booking: the start time in a well, then what it is and where it sits. */
function BookingRow({ booking, resource }: { booking: Booking; resource: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.timePill, { backgroundColor: theme.well }]}>
        <ThemedText style={styles.timeText}>{time(booking.startsAt)}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {booking.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {resource} · until {time(booking.endsAt)}
        </ThemedText>
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + WINDOW_DAYS);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const load = useCallback(
    () =>
      Promise.all([
        api.get<Booking[]>(
          `/bookings?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
        ),
        api.get<Resource[]>('/resources').catch(() => [] as Resource[]),
      ]),
    [range],
  );
  const { data, error, loading, reload } = useQuery(load, [range]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const [bookings, resources] = data ?? [[], []];
  const resourceName = new Map(resources.map((r) => [r.id, r.name]));
  const byDay = groupByDay(bookings);

  if (bookings.length === 0) return <Empty message={`No bookings in the next ${WINDOW_DAYS} days.`} />;

  // Display-only derivations — the same list, counted three ways.
  const todayLabel = dayLabel(new Date());
  const todayCount = byDay.find(([day]) => day === todayLabel)?.[1].length ?? 0;
  const bays = new Set(bookings.map((b) => b.resourceId)).size;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The number that matters: what's booked across the window. */}
      <Card>
        <BigStat
          label="Bookings"
          value={String(bookings.length)}
          icon="calendar"
          iconTone="accent"
          caption={`Scheduled over the next ${WINDOW_DAYS} days`}
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="today" value={String(todayCount)} label="Today" pastel="sky" />
        <StatTile icon="layers" value={String(byDay.length)} label="Days booked" pastel="lilac" />
        <StatTile icon="grid" value={String(bays)} label="Resources" pastel="mint" />
      </View>

      {byDay.map(([day, items]) => (
        <View key={day} style={{ gap: Spacing.two }}>
          <DayHeader day={day} count={items.length} today={day === todayLabel} />
          <Card>
            {items.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                resource={resourceName.get(b.resourceId) ?? 'Resource'}
              />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

function groupByDay(bookings: Booking[]): [string, Booking[]][] {
  const map = new Map<string, Booking[]>();
  for (const b of [...bookings].sort((a, z) => a.startsAt.localeCompare(z.startsAt))) {
    const day = dayLabel(new Date(b.startsAt));
    (map.get(day) ?? map.set(day, []).get(day)!).push(b);
  }
  return [...map.entries()];
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  dayTitle: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 16, letterSpacing: -0.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4, paddingVertical: 6 },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    minWidth: 62,
    alignItems: 'center',
  },
  timeText: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 0.2 },
});
