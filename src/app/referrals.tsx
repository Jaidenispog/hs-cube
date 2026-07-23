import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ErrorView,
  IconBadge,
  Loading,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Referral } from '@/lib/types';

const TONE = { pending: 'warning', converted: 'accent', rewarded: 'success' } as const;
/** The API's status is lowercase; the chip reads better title-cased. */
const LABEL = { pending: 'Pending', converted: 'Converted', rewarded: 'Rewarded' } as const;

export default function ReferralsScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<Referral[]>(() => api.get<Referral[]>('/referrals'), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const refs = data ?? [];
  if (refs.length === 0) return <Empty message="No referrals yet." icon="share-social-outline" />;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id); setRowError(null);
    try { await fn(); reload(); } catch (e) { setRowError(e instanceof ApiError ? e.message : 'Action failed'); } finally { setBusyId(null); }
  };
  const convert = (r: Referral) => run(r.id, () => api.post(`/referrals/${r.id}/convert`, {}));
  const reward = (r: Referral) =>
    Alert.prompt?.('Reward', 'Reward note (e.g. 500 pts):', (note) => void run(r.id, () => api.post(`/referrals/${r.id}/reward`, { note: note ?? '' })))
      ?? void run(r.id, () => api.post(`/referrals/${r.id}/reward`, {}));

  /* Counts come straight off the list we already have — no extra call. */
  const count = (s: Referral['status']) => refs.filter((r) => r.status === s).length;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <View style={styles.tiles}>
        <StatTile icon="hourglass" value={String(count('pending'))} label="Pending" pastel="sand" />
        <StatTile icon="person-add" value={String(count('converted'))} label="Converted" pastel="lilac" />
        <StatTile icon="ribbon" value={String(count('rewarded'))} label="Rewarded" pastel="mint" />
      </View>

      {rowError ? (
        <Card style={styles.errorCard}>
          <View style={styles.row}>
            <IconBadge icon="alert-circle" tone="danger" size={42} />
            <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>
              {rowError}
            </ThemedText>
          </View>
        </Card>
      ) : null}

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {refs.length} {refs.length === 1 ? 'referral' : 'referrals'}
          </ThemedText>
        }
      >
        Referrals
      </SectionTitle>

      {refs.map((r) => (
        <Card key={r.id} style={styles.cardBody}>
          <View style={styles.row}>
            <Avatar name={r.referredName} size={42} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {r.referredName}
              </ThemedText>
              <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                {r.referredPhone || 'No phone on file'}
              </ThemedText>
            </View>
            <Badge label={LABEL[r.status] ?? r.status} tone={TONE[r.status] ?? 'muted'} />
          </View>

          {r.rewardNote ? (
            <View style={[styles.note, { backgroundColor: theme.well }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {r.rewardNote}
              </ThemedText>
            </View>
          ) : null}

          {r.status === 'pending' ? (
            <View style={[styles.footer, { backgroundColor: theme.well }]}>
              <Button
                label="Mark converted"
                size="sm"
                icon="checkmark"
                loading={busyId === r.id}
                onPress={() => convert(r)}
              />
            </View>
          ) : null}
          {r.status === 'converted' ? (
            <View style={[styles.footer, { backgroundColor: theme.well }]}>
              <Button label="Reward" size="sm" icon="ribbon-outline" loading={busyId === r.id} onPress={() => reward(r)} />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  errorCard: { padding: Spacing.three - 2 },
  cardBody: { padding: Spacing.three - 2, gap: Spacing.two + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, letterSpacing: -0.2 },
  note: { borderRadius: Radius.lg, paddingHorizontal: Spacing.two + 4, paddingVertical: Spacing.two + 2 },
  footer: { borderRadius: Radius.lg, padding: Spacing.two, gap: Spacing.two },
});
