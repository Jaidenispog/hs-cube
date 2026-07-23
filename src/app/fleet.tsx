import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  BigStat,
  Button,
  Card,
  CardButton,
  Empty,
  ErrorView,
  IconBadge,
  Loading,
  Screen,
  SearchBar,
  SectionTitle,
  StatTile,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import {
  FleetDashboardStats,
  FleetVehicle,
  vehicleStatusLabel,
  vehicleStatusTone,
} from '@/lib/fleet';
import { useQuery } from '@/lib/use-query';

export default function FleetScreen() {
  const router = useRouter();
  const theme = useTheme();
  const stats = useQuery<FleetDashboardStats>(() => api.get('/fleet/dashboard'), []);
  const vehicles = useQuery<FleetVehicle[]>(() => api.get('/fleet/vehicles'), []);
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const term = q.trim().toUpperCase();
    return (vehicles.data ?? []).filter((v) =>
      term
        ? v.rego.includes(term) ||
          v.make.toUpperCase().includes(term) ||
          v.model.toUpperCase().includes(term)
        : true,
    );
  }, [vehicles.data, q]);

  if (vehicles.loading && !vehicles.data) return <Loading />;
  if (vehicles.error && !vehicles.data)
    return <ErrorView message={vehicles.error} onRetry={vehicles.reload} />;

  const s = stats.data;
  const review = s?.needsAttention ?? 0;

  return (
    <Screen
      tabInset={false}
      refreshing={vehicles.loading}
      onRefresh={() => {
        stats.reload();
        vehicles.reload();
      }}
    >
      {/* The number that matters: how many of our cars are with customers right now. */}
      <Card>
        <BigStat
          label="Cars out"
          value={String(s?.carsOut ?? 0)}
          icon="car-sport"
          iconTone="accent"
          caption="Loan cars with customers now"
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="checkmark-circle" value={String(s?.availableCars ?? 0)} label="Available" pastel="mint" />
        <StatTile icon="calendar" value={String(s?.bookedCars ?? 0)} label="Booked" pastel="lilac" />
        <StatTile icon="time" value={String(s?.overdue ?? 0)} label="Overdue" pastel="salmon" />
      </View>

      {/* Only surface the import-review queue when there's actually something in it. */}
      {review > 0 ? (
        <CardButton onPress={() => router.push('/fleet/bookings')} style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <IconBadge icon="alert-circle" tone="warning" size={42} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.reviewTitle}>{review} need review</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Records missing details
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </View>
        </CardButton>
      ) : null}

      {/* Full-width actions: at 375pt two of these side by side truncate their labels. */}
      <View style={styles.actions}>
        <Button label="New movement" icon="add" onPress={() => router.push('/fleet/new-movement')} />
        <Button
          label="Record return"
          tone="plain"
          icon="arrow-undo"
          onPress={() => router.push('/fleet/return')}
        />
        <Button
          label="Bookings"
          tone="plain"
          icon="calendar-outline"
          chevron
          onPress={() => router.push('/fleet/bookings')}
        />
      </View>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {shown.length} {shown.length === 1 ? 'car' : 'cars'}
          </ThemedText>
        }
      >
        Fleet availability
      </SectionTitle>
      <SearchBar
        placeholder="Search rego, make, model…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {shown.length === 0 ? (
        <Empty message="No fleet cars match." icon="car-outline" />
      ) : (
        shown.map((v) => (
          <CardButton
            key={v.id}
            style={styles.vehicleCard}
            onPress={() => router.push(`/fleet/history?rego=${encodeURIComponent(v.rego)}`)}
          >
            <View style={styles.vehicleRow}>
              <View style={[styles.rego, { backgroundColor: theme.well }]}>
                <ThemedText style={styles.regoText}>{v.rego}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" numberOfLines={1}>
                  {[v.make, v.model].filter(Boolean).join(' ') || 'Unknown car'}
                </ThemedText>
                <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                  {v.vehicleType || 'Courtesy car'}
                </ThemedText>
              </View>
              <Badge label={vehicleStatusLabel[v.status]} tone={vehicleStatusTone[v.status]} />
            </View>
          </CardButton>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  actions: { gap: Spacing.two },
  reviewCard: { padding: Spacing.three - 2 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  reviewTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  vehicleCard: { padding: Spacing.three - 2 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  rego: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.sm },
  regoText: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 0.5 },
});
