import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  Button,
  Card,
  ErrorView,
  Input,
  Loading,
  Screen,
  SectionTitle,
  SegmentedTabs,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Font } from '@/lib/fonts';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { CustomField, CustomFieldTarget, CustomFieldType } from '@/lib/types';

const TYPES: CustomFieldType[] = ['text', 'number', 'date', 'select', 'boolean'];

/** The type keys are lowercase API values; show them title-cased on the chips. */
const TYPE_LABEL: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Select',
  boolean: 'Boolean',
};

export default function CustomFieldsScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<CustomField[]>(
    () => api.get<CustomField[]>('/custom-fields?appliesTo=customer').then((customer) =>
      api.get<CustomField[]>('/custom-fields?appliesTo=vehicle').then((vehicle) => [...customer, ...vehicle]),
    ),
    [],
  );

  const [appliesTo, setAppliesTo] = useState<CustomFieldTarget>('customer');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const fields = (data ?? []).filter((f) => !f.archived);
  const customer = fields.filter((f) => f.appliesTo === 'customer');
  const vehicle = fields.filter((f) => f.appliesTo === 'vehicle');

  const keyFrom = (l: string) => l.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const create = async () => {
    const key = keyFrom(label);
    if (!label.trim() || !key) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.post('/custom-fields', { appliesTo, key, label: label.trim(), type });
      setLabel('');
      reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not add the field');
    } finally {
      setBusy(false);
    }
  };

  const archive = async (id: string) => {
    setBusy(true);
    try {
      await api.del(`/custom-fields/${id}`);
      reload();
    } finally {
      setBusy(false);
    }
  };

  /* Rows sit on a `well` so the white Archive pill reads against them — no dividers needed. */
  const list = (items: CustomField[]) =>
    items.length === 0 ? (
      <ThemedText type="small" themeColor="muted">
        None.
      </ThemedText>
    ) : (
      items.map((f) => (
        <View key={f.id} style={[styles.row, { backgroundColor: theme.well }]}>
          <View style={{ flex: 1, gap: 1 }}>
            <ThemedText style={styles.fieldLabel} numberOfLines={1}>
              {f.label}
            </ThemedText>
            <ThemedText type="code" themeColor="muted" numberOfLines={1}>
              {f.key} · {f.type}
            </ThemedText>
          </View>
          {f.required ? <Badge label="Required" tone="warning" /> : null}
          <Button label="Archive" size="sm" tone="plain" loading={busy} onPress={() => archive(f.id)} />
        </View>
      ))
    );

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Add a field</SectionTitle>
        <SegmentedTabs
          options={[
            { value: 'customer', label: 'Customer' },
            { value: 'vehicle', label: 'Vehicle' },
          ]}
          value={appliesTo}
          onChange={setAppliesTo}
        />
        <Card style={{ gap: Spacing.two + 2 }}>
          <Input placeholder="Label (e.g. Insurer)" value={label} onChangeText={setLabel} />

          <ThemedText type="small" themeColor="textSecondary">
            Field type
          </ThemedText>
          <View style={styles.chips}>
            {TYPES.map((t) => {
              const active = type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: active ? theme.accent : theme.well, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <ThemedText
                    style={{
                      fontFamily: active ? Font.semibold : Font.medium,
                      fontSize: 13,
                      color: active ? theme.accentText : theme.textSecondary,
                    }}
                  >
                    {TYPE_LABEL[t]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {formError ? (
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          ) : null}
          <Button label="Add field" icon="add" loading={busy} onPress={create} disabled={!label.trim()} />
        </Card>
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle
          right={
            <ThemedText type="small" themeColor="muted">
              {customer.length}
            </ThemedText>
          }
        >
          Customer fields
        </SectionTitle>
        <Card style={styles.listCard}>{list(customer)}</Card>
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle
          right={
            <ThemedText type="small" themeColor="muted">
              {vehicle.length}
            </ThemedText>
          }
        >
          Vehicle fields
        </SectionTitle>
        <Card style={styles.listCard}>{list(vehicle)}</Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderRadius: Radius.lg,
  },
  fieldLabel: { fontFamily: Font.semibold, fontSize: 14.5 },
  chips: { flexDirection: 'row', gap: Spacing.two - 2, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
});
