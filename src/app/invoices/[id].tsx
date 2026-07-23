import { useLocalSearchParams } from 'expo-router';
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
import type { Invoice } from '@/lib/types';

const PAID_TONE: Record<string, 'muted' | 'warning' | 'success' | 'accent'> = {
  Unpaid: 'muted',
  PartiallyPaid: 'warning',
  Paid: 'success',
  Overpaid: 'accent',
};
const METHODS = ['card', 'cash', 'bank'] as const;

const methodLabel = (m: string) => m[0].toUpperCase() + m.slice(1);

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: inv, error, loading, reload } = useQuery<Invoice>(() => api.get<Invoice>(`/invoices/${id}`), [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('card');

  if (loading && !inv) return <Loading />;
  if (error && !inv) return <ErrorView message={error} onRetry={reload} />;
  if (!inv) return null;

  const lines = inv.lines ?? [];
  const payments = inv.payments ?? [];
  const isVoid = inv.status === 'Void';
  const settled = inv.balanceCents <= 0;

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

  const recordPayment = () => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) return;
    return act(async () => {
      await api.post(`/invoices/${id}/payments`, { amountCents, method });
      setAmount('');
    });
  };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <ScreenHeader
        title={inv.reference}
        subtitle={inv.status}
        right={<Badge label={inv.paidState ?? 'Unpaid'} tone={PAID_TONE[inv.paidState ?? 'Unpaid'] ?? 'muted'} />}
      />

      {/* The headline number, with what's still owed as the caption. */}
      <Card>
        <BigStat
          label="Invoice total"
          value={formatMoney(inv.totalCents)}
          icon="receipt"
          iconTone={isVoid ? 'danger' : settled ? 'success' : 'accent'}
          caption={settled ? 'Fully settled' : `${formatMoney(inv.balanceCents)} still outstanding`}
        />
      </Card>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Line items</SectionTitle>
        {lines.length === 0 ? (
          <Empty message="No line items." icon="list-outline" />
        ) : (
          <Card>
            {lines.map((l) => (
              <View key={l.id} style={[styles.line, { backgroundColor: theme.well }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="small" numberOfLines={2}>
                    {l.description}
                  </ThemedText>
                  <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                    {l.quantity} × {formatMoney(l.unitPriceCents)}
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
        <KV label="Subtotal" value={formatMoney(inv.subtotalCents)} />
        <KV label="GST" value={formatMoney(inv.gstCents)} />
        <KV label="Total" value={formatMoney(inv.totalCents)} />
        <KV label="Paid" value={formatMoney(inv.paidCents)} />
        <View style={[styles.grandRow, { backgroundColor: theme.well }]}>
          <ThemedText style={styles.grandLabel}>Balance due</ThemedText>
          <ThemedText
            style={[styles.grandValue, { color: settled ? theme.success : theme.text }]}
            numberOfLines={1}
          >
            {formatMoney(inv.balanceCents)}
          </ThemedText>
        </View>
      </Card>

      {payments.length ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Payments</SectionTitle>
          <Card>
            {payments.map((p) => (
              <View key={p.id} style={[styles.pay, { backgroundColor: theme.well }]}>
                <IconBadge icon="cash" tone="success" size={38} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" numberOfLines={1}>
                    {methodLabel(p.method)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                    {new Date(p.receivedAt).toLocaleDateString('en-AU')}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.lineTotal, { color: theme.success }]} numberOfLines={1}>
                  {formatMoney(p.amountCents)}
                </ThemedText>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {!isVoid && !settled ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Record payment</SectionTitle>
          <Card style={{ gap: Spacing.two }}>
            <SegmentedTabs
              options={METHODS.map((m) => ({ value: m, label: methodLabel(m) }))}
              value={method}
              onChange={setMethod}
            />
            <Input placeholder="Amount $" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Button label="Record payment" icon="add" loading={busy} disabled={!amount} onPress={recordPayment} />
          </Card>
        </View>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Actions</SectionTitle>
        {!isVoid ? (
          <Button
            label="Send to customer"
            icon="paper-plane"
            loading={busy}
            onPress={() => act(() => api.post(`/invoices/${id}/send`))}
          />
        ) : null}
        {!isVoid && !settled ? (
          <Button
            label="Mark fully paid"
            tone="accent"
            icon="checkmark-circle"
            loading={busy}
            onPress={() => act(() => api.post(`/invoices/${id}/mark-paid`))}
          />
        ) : null}
        {!isVoid ? (
          <Button
            label="Void invoice"
            tone="danger"
            icon="close-circle"
            loading={busy}
            onPress={() => act(() => api.post(`/invoices/${id}/void`))}
          />
        ) : null}
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

  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
  },
});
