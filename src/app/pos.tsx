import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  BigStat,
  Button,
  Card,
  Empty,
  ErrorView,
  IconBadge,
  Input,
  KV,
  Loading,
  Screen,
  SectionTitle,
  formatMoney,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Sale } from '@/lib/types';

export default function PosScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<Sale[]>(() => api.get<Sale[]>('/sales'), []);
  const [active, setActive] = useState<Sale | null>(null);
  const [desc, setDesc] = useState(''); const [qty, setQty] = useState('1'); const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);

  if (loading && !data && !active) return <Loading />;
  if (error && !data && !active) return <ErrorView message={error} onRetry={reload} />;

  const openSale = async () => { setBusy(true); try { setActive(await api.post<Sale>('/sales', {})); } finally { setBusy(false); } };
  const addLine = async () => {
    const quantity = parseInt(qty, 10); const unitPriceCents = Math.round(parseFloat(price) * 100);
    if (!active || !desc.trim() || !quantity || !Number.isFinite(unitPriceCents)) return;
    setErr(null);
    try { setActive(await api.post<Sale>(`/sales/${active.id}/lines`, { description: desc.trim(), quantity, unitPriceCents })); setDesc(''); setQty('1'); setPrice(''); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const complete = async (tenderType: 'cash' | 'card' | 'other') => {
    if (!active) return; setBusy(true); setErr(null);
    try { await api.post(`/sales/${active.id}/complete`, { tenderType }); setActive(null); reload(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed'); } finally { setBusy(false); }
  };

  if (!active) {
    const sales = data ?? [];
    return (
      <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
        <Button label="New sale" icon="add" loading={busy} onPress={openSale} />

        <SectionTitle
          right={
            <ThemedText type="small" themeColor="muted">
              {sales.length} {sales.length === 1 ? 'sale' : 'sales'}
            </ThemedText>
          }
        >
          Recent sales
        </SectionTitle>

        {sales.length === 0 ? <Empty message="No sales yet." icon="receipt-outline" /> :
          sales.map((s) => (
            <Card key={s.id} style={styles.saleCard}>
              <View style={styles.saleRow}>
                <IconBadge
                  icon="receipt-outline"
                  tone={s.status === 'completed' ? 'success' : s.status === 'void' ? 'muted' : 'accent'}
                  size={42}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="code" themeColor="textSecondary" numberOfLines={1}>{s.reference}</ThemedText>
                  <ThemedText style={styles.saleTotal} numberOfLines={1}>{formatMoney(s.totalCents)}</ThemedText>
                </View>
                <Badge label={s.status} tone={s.status === 'completed' ? 'success' : s.status === 'void' ? 'muted' : 'accent'} />
              </View>
            </Card>
          ))}
      </Screen>
    );
  }

  const lineCount = active.lines.length;

  return (
    <Screen tabInset={false}>
      <SectionTitle right={<Button label="Void" size="sm" tone="plain" onPress={() => { void api.post(`/sales/${active.id}/void`); setActive(null); reload(); }} />}>
        {active.reference}
      </SectionTitle>

      {/* The running total is the whole point of a till — give it the hero treatment. */}
      <Card>
        <BigStat
          label="Total due"
          value={formatMoney(active.totalCents)}
          icon="cart"
          iconTone="accent"
          caption={`${lineCount} ${lineCount === 1 ? 'item' : 'items'} · incl. GST ${formatMoney(active.gstCents)}`}
        />
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>Items</ThemedText>
        {lineCount === 0 ? <ThemedText type="small" themeColor="muted">No items yet.</ThemedText> :
          active.lines.map((l) => (
            /* Rows separate by spacing and a well-backed qty chip — no hairline dividers. */
            <View key={l.id} style={styles.lineRow}>
              <View style={[styles.qtyChip, { backgroundColor: theme.well }]}>
                <ThemedText style={styles.qtyText}>{l.quantity}×</ThemedText>
              </View>
              <ThemedText type="small" style={{ flex: 1 }} numberOfLines={2}>{l.description}</ThemedText>
              <ThemedText type="smallBold">{formatMoney(l.lineTotalCents)}</ThemedText>
            </View>
          ))}
        <View style={styles.totals}>
          <KV label="Subtotal" value={formatMoney(active.subtotalCents)} />
          <KV label="GST" value={formatMoney(active.gstCents)} />
        </View>
      </Card>

      <Card style={{ gap: Spacing.two }}>
        <Input placeholder="Item" value={desc} onChangeText={setDesc} />
        <View style={styles.row}>
          <Input placeholder="Qty" value={qty} onChangeText={setQty} keyboardType="number-pad" style={{ flex: 1 }} />
          <Input placeholder="Price $" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ flex: 2 }} />
        </View>
        <Button label="Add item" icon="add" onPress={addLine} />
      </Card>

      {err ? <ThemedText type="small" themeColor="danger">{err}</ThemedText> : null}

      {/* Stacked, not side by side: at 375pt a two-up tender row squeezes both labels. */}
      <View style={styles.tenders}>
        <Button label="Cash" icon="cash-outline" loading={busy} disabled={active.lines.length === 0} onPress={() => complete('cash')} />
        <Button label="Card" icon="card-outline" tone="plain" loading={busy} disabled={active.lines.length === 0} onPress={() => complete('card')} />
      </View>
      <ThemedText type="small" themeColor="muted" style={{ textAlign: 'center' }}>Records how they paid — card processing comes later.</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  saleCard: { padding: Spacing.three - 2 },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  saleTotal: { fontFamily: 'Poppins_700Bold', fontSize: 16, letterSpacing: -0.4 },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, letterSpacing: -0.2 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2, paddingVertical: 5 },
  qtyChip: { minWidth: 34, alignItems: 'center', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 5 },
  qtyText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12.5 },
  totals: { marginTop: Spacing.two },
  tenders: { gap: Spacing.two },
});
