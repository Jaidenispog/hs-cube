import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  BigStat,
  Button,
  Card,
  ErrorView,
  KV,
  Loading,
  Screen,
  SectionTitle,
  StatTile,
  formatMoney,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { ClaimFile, ShareResult } from '@/lib/types';

export default function ClaimFileScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<ClaimFile>(
    () => api.get<ClaimFile>(`/work-items/${jobId}/claim-file`),
    [jobId],
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const cf = data;

  const act = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setNotice(null);
    try {
      const msg = await fn();
      if (msg) setNotice(msg);
      reload();
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const generateDoc = () => act(async () => {
    await api.post(`/work-items/${jobId}/claim-file/document`);
    return 'Claim summary document generated.';
  });
  const share = () => act(async () => {
    const r = await api.post<ShareResult>(`/work-items/${jobId}/claim-file/share`);
    return r.shared ? `Shared: ${r.url}` : `Not shared — ${r.reason ?? 'sharing unavailable'}`;
  });

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* Which job this pack belongs to. The native stack header supplies "Claim file" + back. */}
      <Card>
        <View style={styles.jobRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={styles.reference} numberOfLines={1}>
              {cf.job.reference}
            </ThemedText>
            {cf.job.description ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {cf.job.description}
              </ThemedText>
            ) : null}
          </View>
          <Badge label={cf.job.stateName} tone="accent" />
        </View>
      </Card>

      {cf.claim ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Claim</SectionTitle>
          <Card>
            <KV label="Insurer" value={cf.claim.insurer} />
            <KV label="Claim #" value={cf.claim.claimNumber} />
            {cf.claim.assessor ? <KV label="Assessor" value={cf.claim.assessor} /> : null}
            {cf.claim.authorisedAmountCents != null ? (
              <KV label="Authorised" value={formatMoney(cf.claim.authorisedAmountCents)} />
            ) : null}
            {cf.claim.excessCents != null ? <KV label="Excess" value={formatMoney(cf.claim.excessCents)} /> : null}
            {cf.claim.billPayer ? <KV label="Bill payer" value={cf.claim.billPayer} /> : null}
          </Card>
        </View>
      ) : (
        <Card>
          <ThemedText type="small" themeColor="muted">
            No insurance claim details on this job.
          </ThemedText>
        </Card>
      )}

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Financials</SectionTitle>
        {/* Outstanding is the number that matters — lead with it. */}
        <Card style={{ gap: Spacing.three }}>
          <BigStat
            label="Outstanding"
            value={formatMoney(cf.financials.outstandingCents)}
            icon="cash-outline"
            iconTone={cf.financials.outstandingCents > 0 ? 'warning' : 'success'}
          />
          <View style={[styles.split, { backgroundColor: theme.well }]}>
            <KV label="Invoiced" value={formatMoney(cf.financials.invoicedCents)} />
            <KV label="Paid" value={formatMoney(cf.financials.paidCents)} />
          </View>
        </Card>
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Pack contents</SectionTitle>
        <View style={styles.tiles}>
          <StatTile icon="images-outline" value={String(cf.counts.photos)} label="Photos" pastel="lilac" />
          <StatTile icon="pricetag-outline" value={String(cf.counts.quotes)} label="Quotes" pastel="sky" />
        </View>
        <View style={styles.tiles}>
          <StatTile icon="receipt-outline" value={String(cf.counts.invoices)} label="Invoices" pastel="mint" />
          <StatTile icon="document-text-outline" value={String(cf.counts.documents)} label="Documents" pastel="sand" />
        </View>
      </View>

      {cf.documents.length ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Documents</SectionTitle>
          <Card>
            <View style={{ gap: Spacing.two }}>
              {cf.documents.map((d) => (
                <View key={d.id} style={[styles.row, { backgroundColor: theme.well }]}>
                  <ThemedText style={styles.docType} numberOfLines={1}>
                    {d.type}
                  </ThemedText>
                  <ThemedText type="code" themeColor="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {d.templateRef}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Actions</SectionTitle>
        <Button label="Generate summary document" icon="document-text-outline" loading={busy} onPress={generateDoc} />
        <Button label="Share claim file" tone="plain" icon="share-outline" loading={busy} onPress={share} />
        {notice ? (
          <ThemedText type="small" themeColor="textSecondary">
            {notice}
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reference: { fontFamily: 'Poppins_700Bold', fontSize: 17, letterSpacing: -0.2 },

  split: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.two + 4, borderRadius: Radius.md },

  tiles: { flexDirection: 'row', gap: Spacing.two },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
  },
  docType: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, flex: 1 },
});
