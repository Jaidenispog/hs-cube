import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Screen, ScreenHeader, SectionTitle } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { PURPOSE_OPTIONS, purposeLabel } from '@/lib/fleet';
import { Font } from '@/lib/fonts';

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

export default function NewMovementScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [carsInRego, setCarsInRego] = useState('');
  const [carsOutRego, setCarsOutRego] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [purpose, setPurpose] = useState('COURTESY');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = !!carsInRego.trim() || !!carsOutRego.trim();

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/fleet/movements', {
        carsInRego: carsInRego || undefined,
        carsOutRego: carsOutRego || undefined,
        driverName: driverName || undefined,
        driverPhone: driverPhone || undefined,
        purpose,
        notes: notes || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the movement');
      setBusy(false);
    }
  };

  return (
    <Screen tabInset={false}>
      <ScreenHeader title="New movement" subtitle="Customer car in · loan car out" />

      <SectionTitle>Cars</SectionTitle>
      <Card>
        <Field label="Customer car rego (in)">
          <Input
            value={carsInRego}
            onChangeText={setCarsInRego}
            autoCapitalize="characters"
            placeholder="e.g. ABC123"
          />
        </Field>
        <Field label="Fleet car rego (out)">
          <Input
            value={carsOutRego}
            onChangeText={setCarsOutRego}
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
        <Field label="Driver mobile">
          <Input
            value={driverPhone}
            onChangeText={setDriverPhone}
            keyboardType="phone-pad"
            placeholder="04…"
          />
        </Field>
      </Card>

      <SectionTitle>Purpose</SectionTitle>
      <Card>
        {/* Selection reads from fill, not an outline — the design system has no borders. */}
        <View style={styles.purposes}>
          {PURPOSE_OPTIONS.map((p) => {
            const on = p === purpose;
            return (
              <Pressable
                key={p}
                onPress={() => setPurpose(p)}
                style={({ pressed }) => [
                  styles.purpose,
                  {
                    backgroundColor: on ? theme.accent : theme.well,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: on ? theme.accentText : theme.textSecondary,
                    fontFamily: Font.semibold,
                    fontSize: 13,
                  }}
                >
                  {purposeLabel(p)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
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
        <Button label="Save movement" icon="checkmark" loading={busy} disabled={!canSave} onPress={save} />
        <Button label="Cancel" tone="plain" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  purposes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  purpose: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
  },
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
