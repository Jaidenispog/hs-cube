import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Button,
  Card,
  CardButton,
  Empty,
  ErrorView,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { Font } from '@/lib/fonts';
import { useQuery } from '@/lib/use-query';
import { vehicleLine, vehicleRego, type Contact, type Vehicle, type WorkItem } from '@/lib/types';

export default function NewJobScreen() {
  const params = useLocalSearchParams<{ customerId?: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: pick a customer (skipped when one was passed in).
  const contactsQ = useQuery<Contact[]>(() => api.get<Contact[]>('/contacts'), []);
  // Step 2: that customer's vehicles.
  const vehiclesQ = useQuery<Vehicle[]>(
    () => (customerId ? api.get<Vehicle[]>(`/contacts/${customerId}/vehicles`) : Promise.resolve([])),
    [customerId],
  );

  useEffect(() => {
    setVehicleId(null);
  }, [customerId]);

  const create = async () => {
    if (!customerId || !vehicleId) return;
    setBusy(true);
    setError(null);
    try {
      const job = await api.post<WorkItem>('/work-items', {
        type: 'job',
        fields: { customerId },
        subjectIds: [vehicleId],
      });
      router.replace(`/jobs/${job.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the job');
      setBusy(false);
    }
  };

  // Customer picker
  if (!customerId) {
    if (contactsQ.loading && !contactsQ.data) return <Loading />;
    if (contactsQ.error && !contactsQ.data) return <ErrorView message={contactsQ.error} onRetry={contactsQ.reload} />;
    const contacts = contactsQ.data ?? [];
    return (
      <Screen tabInset={false}>
        <SectionTitle
          right={
            <ThemedText type="small" themeColor="muted">
              Step 1 of 2
            </ThemedText>
          }
        >
          Choose a customer
        </SectionTitle>
        {contacts.length === 0 ? (
          <Empty message="No customers yet. Add one first." icon="people-outline" />
        ) : (
          contacts.map((c) => (
            <CardButton key={c.id} onPress={() => setCustomerId(c.id)} style={styles.pickCard}>
              <View style={styles.pickRow}>
                <Avatar name={c.displayName} size={44} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.pickName} numberOfLines={1}>
                    {c.displayName}
                  </ThemedText>
                  {c.phone ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {c.phone}
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

  // Vehicle picker + create
  if (vehiclesQ.loading && !vehiclesQ.data) return <Loading />;
  const vehicles = vehiclesQ.data ?? [];
  const customerName = contactsQ.data?.find((c) => c.id === customerId)?.displayName;

  return (
    <Screen tabInset={false}>
      <SectionTitle right={!params.customerId ? <Button label="Change" size="sm" tone="plain" onPress={() => setCustomerId(null)} /> : undefined}>
        Customer
      </SectionTitle>
      <Card>
        <View style={styles.pickRow}>
          <Avatar name={customerName ?? 'Selected customer'} size={44} />
          <ThemedText style={[styles.pickName, { flex: 1 }]} numberOfLines={1}>
            {customerName ?? 'Selected customer'}
          </ThemedText>
        </View>
      </Card>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            Step 2 of 2
          </ThemedText>
        }
      >
        Choose a vehicle
      </SectionTitle>
      {vehicles.length === 0 ? (
        <Empty message="This customer has no vehicles. Add one from their profile first." icon="car-outline" />
      ) : (
        <Card>
          {vehicles.map((v) => {
            const selected = v.id === vehicleId;
            return (
              <Pressable
                key={v.id}
                onPress={() => setVehicleId(v.id)}
                style={({ pressed }) => [
                  styles.vrow,
                  { backgroundColor: selected ? theme.accentSoft : theme.well, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={[styles.vIcon, { backgroundColor: theme.card }]}>
                  <Ionicons name="car-sport" size={19} color={selected ? theme.accent : theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" numberOfLines={1}>
                    {vehicleLine(v)}
                  </ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    {vehicleRego(v) || '—'}
                  </ThemedText>
                </View>
                {/* Selection reads from fill + tick, not a ring — the system has no borders. */}
                <View style={[styles.tick, { backgroundColor: selected ? theme.accent : theme.card }]}>
                  {selected ? <Ionicons name="checkmark" size={14} color={theme.accentText} /> : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button label="Create job" icon="add" loading={busy} disabled={!vehicleId} onPress={create} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickCard: { padding: Spacing.three - 2 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  pickName: { fontFamily: Font.semibold, fontSize: 15 },

  vrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
  },
  vIcon: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 22, height: 22, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
