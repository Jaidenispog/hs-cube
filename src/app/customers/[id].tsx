import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Button,
  Card,
  ErrorView,
  Input,
  KV,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import { vehicleLine, vehicleRego, type Contact, type Vehicle } from '@/lib/types';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const load = useCallback(
    () =>
      Promise.all([
        api.get<Contact>(`/contacts/${id}`),
        api.get<Vehicle[]>(`/contacts/${id}/vehicles`).catch(() => [] as Vehicle[]),
      ]),
    [id],
  );
  const { data, error, loading, reload } = useQuery(load, [id]);

  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rego, setRego] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const [contact, vehicles] = data;

  const addVehicle = async () => {
    const y = parseInt(year, 10);
    if (!rego.trim() || !make.trim() || !model.trim() || !Number.isFinite(y)) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.post(`/contacts/${id}/vehicles`, {
        rego: rego.trim(),
        make: make.trim(),
        model: model.trim(),
        year: y,
      });
      setRego('');
      setMake('');
      setModel('');
      setYear('');
      setAdding(false);
      reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not add the vehicle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The profile hero: who this is, at a glance. The native stack header supplies "Customer" + back. */}
      <Card style={styles.profile}>
        <Avatar name={contact.displayName} size={78} />
        <ThemedText style={styles.profileName} numberOfLines={2}>
          {contact.displayName}
        </ThemedText>
        <ThemedText type="small" themeColor="muted">
          {vehicles.length === 0
            ? 'No vehicles on file'
            : `${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'} on file`}
        </ThemedText>
      </Card>

      <Card>
        <KV label="Phone" value={contact.phone ?? '—'} />
        <KV label="Email" value={contact.email ?? '—'} />
      </Card>

      <Button label="Start a new job" icon="add" onPress={() => router.push(`/jobs/new?customerId=${id}`)} />

      <View style={{ gap: Spacing.two }}>
        <SectionTitle
          right={
            <Button
              label={adding ? 'Cancel' : 'Add vehicle'}
              size="sm"
              tone="plain"
              onPress={() => setAdding((v) => !v)}
            />
          }
        >
          Vehicles
        </SectionTitle>

        {/* Each vehicle is its own inset well — separation by spacing, never a rule. */}
        <Card>
          {vehicles.length === 0 ? (
            <ThemedText type="small" themeColor="muted">
              No vehicles.
            </ThemedText>
          ) : (
            <View style={{ gap: Spacing.two }}>
              {vehicles.map((v) => (
                <View key={v.id} style={[styles.vrow, { backgroundColor: theme.well }]}>
                  <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                    {vehicleLine(v)}
                  </ThemedText>
                  <View style={[styles.rego, { backgroundColor: theme.card }]}>
                    <ThemedText style={styles.regoText}>{vehicleRego(v) || '—'}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {adding ? (
            <View style={styles.form}>
              <Input placeholder="Rego" value={rego} onChangeText={setRego} autoCapitalize="characters" />
              <View style={styles.two}>
                <Input placeholder="Make" value={make} onChangeText={setMake} style={{ flex: 1 }} />
                <Input placeholder="Model" value={model} onChangeText={setModel} style={{ flex: 1 }} />
              </View>
              <Input placeholder="Year" value={year} onChangeText={setYear} keyboardType="number-pad" />
              {formError ? (
                <ThemedText type="small" themeColor="danger">
                  {formError}
                </ThemedText>
              ) : null}
              <Button label="Save vehicle" size="sm" loading={busy} onPress={addVehicle} />
            </View>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  profileName: { fontFamily: 'Poppins_600SemiBold', fontSize: 21, letterSpacing: -0.4, textAlign: 'center' },

  vrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two + 4,
    borderRadius: Radius.md,
  },
  rego: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
  regoText: { fontFamily: 'Poppins_700Bold', fontSize: 12.5, letterSpacing: 0.5 },

  form: { gap: Spacing.two, marginTop: Spacing.two },
  two: { flexDirection: 'row', gap: Spacing.two },
});
