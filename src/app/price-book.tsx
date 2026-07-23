import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorView,
  IconBadge,
  Input,
  Loading,
  Screen,
  SectionTitle,
  SegmentedTabs,
  formatMoney,
} from '@/components/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { PriceBookItem } from '@/lib/types';

export default function PriceBookScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<PriceBookItem[]>(
    () => api.get<PriceBookItem[]>('/price-book'),
    [],
  );

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'labour' | 'part'>('labour');
  const [price, setPrice] = useState('');
  const [code, setCode] = useState('');

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const items = data ?? [];

  const create = async () => {
    const defaultUnitPriceCents = Math.round(parseFloat(price) * 100);
    if (!name.trim() || !Number.isFinite(defaultUnitPriceCents) || defaultUnitPriceCents < 1) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.post('/price-book', {
        name: name.trim(),
        type,
        unit: type === 'labour' ? 'hour' : 'each',
        defaultUnitPriceCents,
        ...(code.trim() ? { code: code.trim() } : {}),
      });
      setName('');
      setPrice('');
      setCode('');
      setAdding(false);
      reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not add the item');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (id: string) => {
    setBusy(true);
    try {
      await api.post(`/price-book/${id}/deactivate`);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* Full-width primary action: at 375pt this label has room to breathe. */}
      <Button
        label={adding ? 'Cancel' : 'New item'}
        icon={adding ? 'close' : 'add'}
        tone={adding ? 'plain' : 'accent'}
        onPress={() => setAdding((v) => !v)}
      />

      {adding ? (
        <Card style={{ gap: Spacing.two }}>
          <Input placeholder="Name" value={name} onChangeText={setName} />
          {/* Segmented control replaces the two side-by-side buttons, which truncated at 375pt. */}
          <SegmentedTabs
            options={[
              { value: 'labour', label: 'Labour / hr' },
              { value: 'part', label: 'Part / each' },
            ]}
            value={type}
            onChange={setType}
          />
          <View style={styles.row}>
            <Input placeholder="Price $" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Input placeholder="Code (optional)" value={code} onChangeText={setCode} style={{ flex: 1 }} autoCapitalize="characters" />
          </View>
          {formError ? (
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          ) : null}
          <Button label="Save item" loading={busy} onPress={create} disabled={!name.trim() || !price} />
        </Card>
      ) : null}

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </ThemedText>
        }
      >
        All items
      </SectionTitle>

      {items.length === 0 ? (
        <Empty message="No price-book items yet." icon="pricetags-outline" />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemTop}>
              {/* Labour vs part reads at a glance from the glyph. */}
              <IconBadge
                icon={item.type === 'labour' ? 'time-outline' : 'cube-outline'}
                tone={item.active ? 'accent' : 'muted'}
                size={42}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {item.type} · per {item.unit}
                  {item.code ? ` · ${item.code}` : ''}
                </ThemedText>
              </View>
              <View style={styles.priceCol}>
                <ThemedText style={[styles.price, { color: theme.text }]} numberOfLines={1}>
                  {formatMoney(item.defaultUnitPriceCents)}
                </ThemedText>
                {!item.active ? <Badge label="Inactive" tone="muted" /> : null}
              </View>
            </View>
            {item.active ? (
              <Button label="Deactivate" size="sm" tone="plain" loading={busy} onPress={() => deactivate(item.id)} />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  itemCard: { padding: Spacing.three - 2 },
  itemTop: { flexDirection: 'row', gap: Spacing.two + 4, alignItems: 'center' },
  itemName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, letterSpacing: -0.2 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  price: { fontFamily: 'Poppins_700Bold', fontSize: 15.5, letterSpacing: -0.3 },
});
