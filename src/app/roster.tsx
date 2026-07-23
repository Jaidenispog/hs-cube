import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  BigStat,
  Card,
  Empty,
  ErrorView,
  Loading,
  Screen,
  StatTile,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Shift } from '@/lib/types';

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

/** One rostered entry: who it is, when they're on, and whether it's a shift or time off. */
function ShiftRow({ shift }: { shift: Shift }) {
  const off = shift.kind === 'time_off';
  return (
    <View style={styles.row}>
      <Avatar name={shift.staffName} size={40} />
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {shift.staffName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {time(shift.startsAt)}–{time(shift.endsAt)}
        </ThemedText>
      </View>
      <Badge label={off ? 'Time off' : 'Shift'} tone={off ? 'warning' : 'success'} />
    </View>
  );
}

export default function RosterScreen() {
  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + WINDOW_DAYS);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data, error, loading, reload } = useQuery<Shift[]>(
    () => api.get<Shift[]>(`/shifts?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`),
    [range],
  );

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const shifts = data ?? [];
  if (shifts.length === 0) return <Empty message={`No shifts in the next ${WINDOW_DAYS} days.`} icon="people-outline" />;

  const byDay = groupByDay(shifts);

  // Display-only derivations — the same list, counted three ways.
  const todayLabel = dayLabel(new Date());
  const working = shifts.filter((s) => s.kind === 'shift').length;
  const off = shifts.length - working;
  const staff = new Set(shifts.map((s) => s.staffName)).size;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The number that matters: how many shifts are rostered across the window. */}
      <Card>
        <BigStat
          label="Shifts rostered"
          value={String(working)}
          icon="people"
          iconTone="accent"
          caption={`Across the next ${WINDOW_DAYS} days`}
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="person" value={String(staff)} label="On the roster" pastel="lilac" />
        <StatTile icon="airplane" value={String(off)} label="Time off" pastel="sand" />
        <StatTile icon="layers" value={String(byDay.length)} label="Days" pastel="mint" />
      </View>

      {byDay.map(([day, items]) => (
        <View key={day} style={{ gap: Spacing.two }}>
          <DayHeader day={day} count={items.length} today={day === todayLabel} />
          <Card>
            {items.map((s) => (
              <ShiftRow key={s.id} shift={s} />
            ))}
          </Card>
        </View>
      ))}

      <ThemedText type="small" themeColor="muted" style={{ textAlign: 'center' }}>
        Add or edit shifts from the web roster.
      </ThemedText>
    </Screen>
  );
}

function groupByDay(shifts: Shift[]): [string, Shift[]][] {
  const map = new Map<string, Shift[]>();
  for (const s of [...shifts].sort((a, z) => a.startsAt.localeCompare(z.startsAt))) {
    const day = dayLabel(new Date(s.startsAt));
    (map.get(day) ?? map.set(day, []).get(day)!).push(s);
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
});
