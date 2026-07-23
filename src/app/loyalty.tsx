import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  BigStat,
  Button,
  Card,
  Empty,
  ErrorView,
  Input,
  Loading,
  Screen,
  SectionTitle,
  StatTile,
  formatMoney,
  formatMoneyCompact,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { GiftCard } from '@/lib/types';

export default function LoyaltyScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<GiftCard[]>(() => api.get<GiftCard[]>('/gift-cards'), []);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const cards = data ?? [];

  const issue = async () => {
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.post('/gift-cards', { initialCents: Math.round(dollars * 100) });
      setAmount('');
      reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not issue');
    } finally {
      setBusy(false);
    }
  };

  const redeem = (c: GiftCard) =>
    Alert.prompt?.(`Redeem from ${c.code}`, `Balance ${formatMoney(c.balanceCents)}. Amount to redeem ($):`, async (val) => {
      const dollars = Number(val);
      if (!Number.isFinite(dollars) || dollars <= 0) return;
      try {
        await api.post(`/gift-cards/${c.id}/redeem`, { amountCents: Math.round(dollars * 100) });
        reload();
      } catch {
        /* ignore */
      }
    }) ?? Alert.alert('Redeem on web', 'Redeeming a specific amount is available on the web.');

  /* All derived from the list we already fetched — the money the workshop still owes on gift cards. */
  const liveCards = cards.filter((c) => c.status === 'active');
  const outstanding = liveCards.reduce((sum, c) => sum + c.balanceCents, 0);
  const issued = cards.reduce((sum, c) => sum + c.initialCents, 0);
  const redeemed = issued - cards.reduce((sum, c) => sum + c.balanceCents, 0);

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The number that matters: unredeemed value still sitting on live cards. */}
      <Card>
        <BigStat
          label="Outstanding balance"
          value={formatMoney(outstanding)}
          icon="gift"
          iconTone="accent"
          caption="Unredeemed value on live cards"
        />
      </Card>

      <View style={styles.tiles}>
        <StatTile icon="checkmark-circle" value={String(liveCards.length)} label="Live cards" pastel="mint" />
        <StatTile icon="pricetag" value={formatMoneyCompact(issued)} label="Issued" pastel="lilac" />
        <StatTile icon="swap-horizontal" value={formatMoneyCompact(redeemed)} label="Redeemed" pastel="salmon" />
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Issue a gift card</SectionTitle>
        <Card style={{ gap: Spacing.two }}>
          <Input placeholder="Amount $" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          {formError ? (
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          ) : null}
          <Button label="Issue gift card" icon="add" loading={busy} disabled={!amount} onPress={issue} />
        </Card>
      </View>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </ThemedText>
        }
      >
        Gift cards
      </SectionTitle>

      {cards.length === 0 ? (
        <Empty message="No gift cards yet." icon="gift-outline" />
      ) : (
        cards.map((c) => (
          <Card key={c.id} style={styles.cardBody}>
            <View style={styles.row}>
              <View style={[styles.code, { backgroundColor: theme.well }]}>
                <ThemedText style={styles.codeText}>{c.code}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.balance} numberOfLines={1}>
                  {formatMoney(c.balanceCents)}
                </ThemedText>
                <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                  of {formatMoney(c.initialCents)} issued
                </ThemedText>
              </View>
              {c.status === 'void' ? <Badge label="Void" tone="muted" /> : <Badge label="Active" tone="success" />}
            </View>
            {c.status === 'active' && c.balanceCents > 0 ? (
              <View style={[styles.footer, { backgroundColor: theme.well }]}>
                <Button label="Redeem" size="sm" tone="plain" icon="cash-outline" onPress={() => redeem(c)} />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  cardBody: { padding: Spacing.three - 2, gap: Spacing.two + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  code: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.sm },
  codeText: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 0.5 },
  balance: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, letterSpacing: -0.3 },
  footer: { borderRadius: Radius.lg, padding: Spacing.two, gap: Spacing.two },
});
