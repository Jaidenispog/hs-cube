import { useLocalSearchParams, useRouter } from 'expo-router';
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
  Input,
  KV,
  Loading,
  Screen,
  ScreenHeader,
  SectionTitle,
  SegmentedTabs,
  formatMoney,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { Font } from '@/lib/fonts';
import { useQuery } from '@/lib/use-query';
import type { Quote } from '@/lib/types';

const STATUS_TONE: Record<string, 'muted' | 'accent' | 'success' | 'danger'> = {
  Draft: 'muted',
  Sent: 'accent',
  Accepted: 'success',
  Declined: 'danger',
};

/** The hero icon tone tracks the quote's status, so the total reads as won/lost at a glance. */
const STATUS_ICON_TONE: Record<string, 'accent' | 'success' | 'danger'> = {
  Sent: 'accent',
  Accepted: 'success',
  Declined: 'danger',
};

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data: quote, error, loading, reload } = useQuery<Quote>(() => api.get<Quote>(`/quotes/${id}`), [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [kind, setKind] = useState<'labour' | 'part'>('labour');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');

  if (loading && !quote) return <Loading />;
  if (error && !quote) return <ErrorView message={error} onRetry={reload} />;
  if (!quote) return null;

  const isDraft = quote.status === 'Draft';
  const lines = quote.lines ?? [];

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const addLine = () => {
    const quantity = parseInt(qty, 10);
    const unitPriceCents = Math.round(parseFloat(price) * 100);
    if (!desc.trim() || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(unitPriceCents) || unitPriceCents < 1)
      return;
    return act(async () => {
      await api.post(`/quotes/${id}/lines`, { description: desc.trim(), type: kind, quantity, unitPriceCents });
      setDesc('');
      setQty('1');
      setPrice('');
    });
  };

  const setStatus = (status: 'Sent' | 'Accepted' | 'Declined') =>
    act(() => api.post(`/quotes/${id}/status`, { status }));
  const revise = () => act(() => api.post<Quote>(`/quotes/${id}/revise`).then((q) => router.replace(`/quotes/${q.id}`)));
  const convert = () =>
    act(() =>
      api.post<{ id: string }>(`/quotes/${id}/invoice`).then((inv) => router.replace(`/invoices/${inv.id}`)),
    );

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <ScreenHeader
        title={quote.reference}
        subtitle={`Revision ${quote.revision}`}
        right={<Badge label={quote.status} tone={STATUS_TONE[quote.status] ?? 'muted'} />}
      />

      {/* The number the customer cares about. */}
      <Card>
        <BigStat
          label="Quote total"
          value={formatMoney(quote.totalCents)}
          icon="pricetag"
          iconTone={STATUS_ICON_TONE[quote.status] ?? 'accent'}
          caption={`${lines.length} ${lines.length === 1 ? 'line item' : 'line items'} · incl. GST`}
        />
      </Card>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Line items</SectionTitle>
        {lines.length === 0 ? (
          <Empty message="No line items yet." icon="list-outline" />
        ) : (
          <Card>
            {lines.map((l) => (
              <View key={l.id} style={[styles.line, { backgroundColor: theme.well }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="small" numberOfLines={2}>
                    {l.description}
                  </ThemedText>
                  <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                    {l.quantity} × {formatMoney(l.unitPriceCents)} · {l.type}
                  </ThemedText>
                </View>
                <ThemedText style={styles.lineTotal} numberOfLines={1}>
                  {formatMoney(l.lineTotalCents)}
                </ThemedText>
              </View>
            ))}
          </Card>
        )}
      </View>

      <Card>
        <KV label="Subtotal" value={formatMoney(quote.subtotalCents)} />
        <KV label="GST" value={formatMoney(quote.gstCents)} />
        <View style={[styles.grandRow, { backgroundColor: theme.well }]}>
          <ThemedText style={styles.grandLabel}>Total</ThemedText>
          <ThemedText style={styles.grandValue} numberOfLines={1}>
            {formatMoney(quote.totalCents)}
          </ThemedText>
        </View>
      </Card>

      {isDraft ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Add line</SectionTitle>
          <Card style={{ gap: Spacing.two }}>
            <Input placeholder="Description" value={desc} onChangeText={setDesc} />
            <SegmentedTabs
              options={[
                { value: 'labour', label: 'Labour' },
                { value: 'part', label: 'Part' },
              ]}
              value={kind}
              onChange={setKind}
            />
            <View style={styles.qtyRow}>
              <Input placeholder="Qty" value={qty} onChangeText={setQty} keyboardType="number-pad" style={{ flex: 1 }} />
              <Input placeholder="Unit price $" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ flex: 2 }} />
            </View>
            <Button label="Add line" loading={busy} onPress={addLine} disabled={!desc.trim() || !price} />
          </Card>
        </View>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Actions</SectionTitle>
        {isDraft ? (
          <Button label="Send to customer" icon="paper-plane" loading={busy} disabled={lines.length === 0} onPress={() => setStatus('Sent')} />
        ) : null}
        {quote.status === 'Sent' ? (
          <>
            <Button label="Mark accepted" tone="accent" icon="checkmark-circle" loading={busy} onPress={() => setStatus('Accepted')} />
            <Button label="Mark declined" tone="plain" icon="close-circle" loading={busy} onPress={() => setStatus('Declined')} />
          </>
        ) : null}
        {quote.status === 'Accepted' ? (
          <Button label="Convert to invoice" tone="accent" icon="receipt" loading={busy} onPress={convert} />
        ) : null}
        {!isDraft ? <Button label="Revise (new version)" tone="plain" icon="git-branch" loading={busy} onPress={revise} /> : null}
      </View>

      {actionError ? (
        <ThemedText type="small" themeColor="danger">
          {actionError}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
  },
  lineTotal: { fontFamily: Font.bold, fontSize: 14, flexShrink: 1, textAlign: 'right' },

  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    marginTop: Spacing.one,
  },
  grandLabel: { fontFamily: Font.semibold, fontSize: 15 },
  grandValue: { fontFamily: Font.bold, fontSize: 19, letterSpacing: -0.5, flexShrink: 1 },

  qtyRow: { flexDirection: 'row', gap: Spacing.two },
});
