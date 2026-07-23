import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Screen, ScreenHeader, SectionTitle } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';

/** A labelled form field — label sits above its input, no divider. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

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

export default function RecordReturnScreen() {
  const router = useRouter();
  const [returnedRego, setReturnedRego] = useState('');
  const [driverName, setDriverName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [bondStatus, setBondStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!returnedRego.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/fleet/returns', {
        returnedRego,
        driverName: driverName || undefined,
        mobileNumber: mobileNumber || undefined,
        bondStatus: bondStatus || undefined,
        notes: notes || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record the return');
      setBusy(false);
    }
  };

  return (
    <Screen tabInset={false}>
      <ScreenHeader title="Record return" subtitle="A loan car has come back" />

      <SectionTitle>Car</SectionTitle>
      <Card>
        <Field label="Returned fleet car rego">
          <Input
            value={returnedRego}
            onChangeText={setReturnedRego}
            autoCapitalize="characters"
            placeholder="e.g. 1PI3XZ"
          />
        </Field>
      </Card>

      <SectionTitle>Driver</SectionTitle>
      <Card>
        <Field label="Driver name">
          <Input value={driverName} onChangeText={setDriverName} placeholder="Driver name" />
        </Field>
        <Field label="Mobile">
          <Input
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            placeholder="04…"
          />
        </Field>
      </Card>

      <SectionTitle>Bond &amp; notes</SectionTitle>
      <Card>
        <Field label="Bond status">
          <Input value={bondStatus} onChangeText={setBondStatus} placeholder="e.g. Returned, Held" />
        </Field>
        <Field label="Notes">
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            multiline
            style={styles.notes}
          />
        </Field>
      </Card>

      {error ? <FormError message={error} /> : null}

      <View style={styles.actions}>
        <Button
          label="Record return"
          icon="arrow-undo"
          loading={busy}
          disabled={!returnedRego.trim()}
          onPress={save}
        />
        <Button label="Cancel" tone="plain" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  notes: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
  },
  actions: { gap: Spacing.two },
});
