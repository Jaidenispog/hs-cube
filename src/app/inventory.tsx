import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  Button,
  Card,
  CircleButton,
  Empty,
  ErrorView,
  IconBadge,
  Input,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { InventoryItem } from '@/lib/types';

export default function InventoryScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<InventoryItem[]>(() => api.get<InventoryItem[]>('/inventory'), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [reorder, setReorder] = useState('0');
  const [par, setPar] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const items = data ?? [];

  const adjust = async (item: InventoryItem, delta: number, reason: 'receive' | 'use') => {
    setBusyId(item.id);
    try {
      await api.post(`/inventory/${item.id}/movement`, { delta, reason });
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const stocktake = (item: InventoryItem) => {
    const apply = async (val?: string) => {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0) return;
      setBusyId(item.id);
      try {
        await api.post(`/inventory/${item.id}/stocktake`, { countedQuantity: Math.round(n) });
        reload();
      } finally {
        setBusyId(null);
      }
    };
    if (Alert.prompt) Alert.prompt('Stocktake', `Counted on hand for ${item.name}:`, apply, 'plain-text', String(item.quantityOnHand));
    else Alert.alert('Stocktake', 'Counting stock is available on iOS or the web.');
  };

  const create = async () => {
    if (!name.trim()) return;
    setBusyId('new');
    setFormError(null);
    try {
      await api.post('/inventory', { name: name.trim(), unit: unit.trim() || undefined, reorderLevel: parseInt(reorder, 10) || 0, parLevel: parseInt(par, 10) || 0 });
      setName('');
      setUnit('');
      setReorder('0');
      setPar('0');
      setAdding(false);
      reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not add');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* Full-width primary action: at 375pt this label has room to breathe. */}
      <Button
        label={adding ? 'Cancel' : 'Add item'}
        icon={adding ? 'close' : 'add'}
        tone={adding ? 'plain' : 'accent'}
        onPress={() => setAdding((v) => !v)}
      />

      {adding ? (
        <Card style={{ gap: Spacing.two }}>
          <Input placeholder="Name" value={name} onChangeText={setName} />
          <Input placeholder="Unit" value={unit} onChangeText={setUnit} />
          {/* Two across, not three: at 375pt a third field clips its own placeholder. */}
          <View style={styles.row}>
            <Input placeholder="Reorder at" value={reorder} onChangeText={setReorder} keyboardType="number-pad" style={{ flex: 1 }} />
            <Input placeholder="Par" value={par} onChangeText={setPar} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          {formError ? (
            <ThemedText type="small" themeColor="danger">{formError}</ThemedText>
          ) : null}
          <Button label="Save item" loading={busyId === 'new'} onPress={create} disabled={!name.trim()} />
        </Card>
      ) : null}

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </ThemedText>
        }
      >
        Stock on hand
      </SectionTitle>

      {items.length === 0 ? (
        <Empty message="No inventory items yet." icon="cube-outline" />
      ) : (
        items.map((i) => {
          const busy = busyId === i.id;
          return (
            <Card key={i.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <IconBadge icon="cube" tone={i.lowStock ? 'danger' : 'accent'} size={42} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={styles.itemName} numberOfLines={1}>{i.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {i.quantityOnHand} {i.unit ?? ''} on hand · reorder at {i.reorderLevel}
                  </ThemedText>
                </View>
                {i.lowStock ? <Badge label="Low" tone="danger" /> : null}
              </View>

              {/* The reorder hint was buried in the subtitle; as a chip it actually gets read. */}
              {i.lowStock && i.suggestedReorderQty > 0 ? (
                <Badge label={`Suggested reorder ${i.suggestedReorderQty}`} tone="warning" />
              ) : null}

              {/* A stepper instead of three side-by-side buttons, which truncated at 375pt.
                  While a movement is in flight the row dims and the presses are ignored —
                  the same guard the loading Buttons used to give us. */}
              <View style={[styles.actions, busy && styles.busy]}>
                <View style={[styles.stepper, { backgroundColor: theme.well }]}>
                  <CircleButton icon="remove" size={36} onPress={busy ? undefined : () => adjust(i, -1, 'use')} />
                  <View style={styles.qtyCol}>
                    <ThemedText style={styles.qty} numberOfLines={1}>{i.quantityOnHand}</ThemedText>
                    <ThemedText type="small" themeColor="muted" style={styles.qtyLabel} numberOfLines={1}>
                      on hand
                    </ThemedText>
                  </View>
                  <CircleButton icon="add" tone="accent" size={36} onPress={busy ? undefined : () => adjust(i, 1, 'receive')} />
                </View>
                <Button label="Count" size="sm" tone="plain" onPress={() => stocktake(i)} />
              </View>
              <ThemedText type="small" themeColor="muted" style={styles.hint}>
                − use one · + receive one
              </ThemedText>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  itemCard: { padding: Spacing.three - 2 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  itemName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, letterSpacing: -0.2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  busy: { opacity: 0.4 },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.pill,
    padding: 5,
  },
  qtyCol: { flex: 1, alignItems: 'center' },
  qty: { fontFamily: 'Poppins_700Bold', fontSize: 17, letterSpacing: -0.4 },
  qtyLabel: { fontSize: 11, lineHeight: 14 },
  hint: { fontSize: 11.5, lineHeight: 16 },
});
