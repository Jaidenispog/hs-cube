import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  BigStat,
  Button,
  Card,
  Empty,
  ErrorView,
  Input,
  Loading,
  Screen,
  ScreenHeader,
  SectionTitle,
  StatTile,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import {
  FleetBooking,
  bookingStatusLabel,
  bookingStatusTone,
  formatDateTime,
} from '@/lib/fleet';
import { Font } from '@/lib/fonts';
import { useQuery } from '@/lib/use-query';

const isOverdue = (b: FleetBooking) =>
  b.status === 'active' && !!b.expectedReturnAt && new Date(b.expectedReturnAt) < new Date();

/** A soft danger note for inline form failures — no borders, just a tinted well. */
function FormError({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.formError, { backgroundColor: theme.dangerSoft }]}>
      <Ionicons name="alert-circle" size={16} color={theme.danger} />
      <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>
        {message}
      </ThemedText>
    </View>
  );
}

export default function FleetBookingsScreen() {
  const theme = useTheme();
  const { data, loading, error, reload } = useQuery<FleetBooking[]>(
    () => api.get('/fleet/bookings?status=booked,active'),
    [],
  );
  const [rego, setRego] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  /** Purely presentational roll-up of the list we already have — no extra fetches. */
  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      booked: list.filter((b) => b.status === 'booked').length,
      active: list.filter((b) => b.status === 'active').length,
      overdue: list.filter(isOverdue).length,
    };
  }, [data]);

  const create = async () => {
    if (!rego.trim()) return;
    setBusy(true);
    setFormErr(null);
    try {
      await api.post('/fleet/bookings', {
        vehicleRego: rego,
        bookingName: name || undefined,
        bookingMobile: mobile || undefined,
        startAt: new Date().toISOString(),
      });
      setRego('');
      setName('');
      setMobile('');
      reload();
    } catch (e) {
      setFormErr(e instanceof ApiError ? e.message : 'Could not create the booking');
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      reload();
    } catch (e) {
      Alert.alert('Error', e instanceof ApiError ? e.message : 'Something went wrong');
    }
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <ScreenHeader title="Bookings" subtitle="Loan cars reserved for customers" />

      {/* The number that matters: how many cars are spoken for right now. */}
      <Card>
        <BigStat
          label="Open bookings"
          value={String(counts.total)}
          icon="calendar"
          iconTone="accent"
          caption="Booked and picked up"
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="calendar-outline" value={String(counts.booked)} label="Booked" pastel="lilac" />
        <StatTile icon="car-sport" value={String(counts.active)} label="Picked up" pastel="sky" />
        <StatTile icon="time" value={String(counts.overdue)} label="Overdue" pastel="salmon" />
      </View>

      <SectionTitle>New booking</SectionTitle>
      <Card>
        <Input value={rego} onChangeText={setRego} autoCapitalize="characters" placeholder="Fleet car rego" />
        <Input value={name} onChangeText={setName} placeholder="Customer name" />
        <Input value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="Mobile" />
        {formErr ? <FormError message={formErr} /> : null}
        <View style={{ marginTop: Spacing.one }}>
          <Button label="Create booking" loading={busy} disabled={!rego.trim()} onPress={create} />
        </View>
      </Card>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {counts.total} {counts.total === 1 ? 'booking' : 'bookings'}
          </ThemedText>
        }
      >
        Open bookings
      </SectionTitle>

      {(data ?? []).length === 0 ? (
        <Empty message="No open bookings." icon="calendar-outline" />
      ) : (
        (data ?? []).map((b) => {
          const overdue = isOverdue(b);
          return (
            <Card key={b.id}>
              <View style={styles.bookingRow}>
                <View style={[styles.rego, { backgroundColor: theme.well }]}>
                  <ThemedText style={styles.regoText}>{b.vehicleRego || '—'}</ThemedText>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={styles.bookingName} numberOfLines={1}>
                    {b.bookingName || 'No name'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {formatDateTime(b.startAt)}
                  </ThemedText>
                </View>
                <Badge
                  label={overdue ? 'Overdue' : bookingStatusLabel[b.status]}
                  tone={overdue ? 'danger' : bookingStatusTone[b.status]}
                />
              </View>

              {/* Full-width stacked: two side-by-side buttons truncate at 375pt. */}
              <View style={styles.bookingActions}>
                <Button
                  label="Convert to movement"
                  size="sm"
                  icon="swap-horizontal"
                  onPress={() => act(() => api.post(`/fleet/bookings/${b.id}/convert`))}
                />
                <Button
                  label="Cancel booking"
                  size="sm"
                  tone="danger"
                  onPress={() =>
                    Alert.alert('Cancel booking', 'Free up this car?', [
                      { text: 'Keep', style: 'cancel' },
                      {
                        text: 'Cancel booking',
                        style: 'destructive',
                        onPress: () => act(() => api.post(`/fleet/bookings/${b.id}/cancel`)),
                      },
                    ])
                  }
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  bookingName: { fontFamily: Font.semibold, fontSize: 15 },
  bookingActions: { gap: Spacing.two, marginTop: Spacing.two },
  rego: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.sm },
  regoText: { fontFamily: Font.bold, fontSize: 13, letterSpacing: 0.5 },
});
