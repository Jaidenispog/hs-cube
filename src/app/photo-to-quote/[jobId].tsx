import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  Button,
  Card,
  ErrorView,
  IconBadge,
  Loading,
  Screen,
  SectionTitle,
  formatMoney,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { DamageScope, ScopePart } from '@/lib/types';

export default function PhotoToQuoteScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const theme = useTheme();

  const load = useCallback(
    () =>
      Promise.all([
        api.get<DamageScope>(`/work-items/${jobId}/ai-scope`).catch(() => null),
        api.get<ScopePart[]>(`/work-items/${jobId}/parts-list`).catch(() => [] as ScopePart[]),
      ]),
    [jobId],
  );
  const { data, error, loading, reload } = useQuery(load, [jobId]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const [scope, parts] = data ?? [null, []];
  const partsTotal = parts.reduce((s, p) => s + p.quantity * p.unitPriceCents, 0);

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

  const generateScope = () => act(() => api.post(`/work-items/${jobId}/ai-scope`));
  const generateParts = () => act(() => api.post(`/work-items/${jobId}/parts-list`));
  const createQuote = () =>
    act(() =>
      api
        .post<{ id: string }>(`/work-items/${jobId}/parts-list/quote`)
        .then((q) => router.replace(`/quotes/${q.id}`)),
    );

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The native stack header supplies "Photo → quote" + back. */}
      <ThemedText type="small" themeColor="textSecondary">
        AI-drafted from the job photos — review before sending.
      </ThemedText>

      {!scope ? (
        <Card style={{ gap: Spacing.three }}>
          <View style={styles.introRow}>
            <IconBadge icon="sparkles" tone="accent" size={46} />
            <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
              Take or upload photos on the job, then generate an AI damage scope. Everything it produces is an
              editable draft you confirm.
            </ThemedText>
          </View>
          <Button label="Generate scope from photos" icon="sparkles" loading={busy} onPress={generateScope} />
        </Card>
      ) : (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle
            right={<Badge label={scope.status} tone={scope.status === 'draft' ? 'warning' : 'success'} />}
          >
            Damage scope
          </SectionTitle>
          <Card style={{ gap: Spacing.three }}>
            {scope.summary ? <ThemedText type="small">{scope.summary}</ThemedText> : null}

            {/* Provenance: which model read how many photos. */}
            <View style={[styles.meta, { backgroundColor: theme.well }]}>
              <Ionicons name="images-outline" size={15} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
                {scope.photoCount} photo{scope.photoCount === 1 ? '' : 's'} · {scope.source} · {scope.model}
              </ThemedText>
            </View>

            <View style={{ gap: Spacing.two }}>
              {scope.items.map((it) => (
                <View key={it.id} style={[styles.row, { backgroundColor: theme.well }]}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <ThemedText style={styles.rowTitle} numberOfLines={1}>
                      {it.panel}
                    </ThemedText>
                    {it.note ? (
                      <ThemedText type="small" themeColor="muted">
                        {it.note}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Badge label={it.operation} tone="accent" />
                </View>
              ))}
            </View>
          </Card>
          <Button label="Regenerate scope" tone="plain" icon="refresh" loading={busy} onPress={generateScope} />
        </View>
      )}

      {scope ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle right={parts.length ? <ThemedText type="smallBold">{formatMoney(partsTotal)}</ThemedText> : undefined}>
            Parts &amp; labour
          </SectionTitle>
          <Card>
            {parts.length === 0 ? (
              <ThemedText type="small" themeColor="muted">
                No parts yet — generate them from the scope.
              </ThemedText>
            ) : (
              <View style={{ gap: Spacing.two }}>
                {parts.map((p) => (
                  <View key={p.id} style={[styles.row, { backgroundColor: theme.well }]}>
                    <ThemedText type="small" style={{ flex: 1 }}>
                      {p.description}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {p.quantity} × {formatMoney(p.unitPriceCents)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </Card>
          {parts.length === 0 ? (
            <Button label="Generate parts list" icon="sparkles" loading={busy} onPress={generateParts} />
          ) : (
            <Button label="Create draft quote" icon="document-text-outline" loading={busy} onPress={createQuote} />
          )}
        </View>
      ) : null}

      {actionError ? (
        <ThemedText type="small" themeColor="danger">
          {actionError}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  introRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + 4,
    borderRadius: Radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: Spacing.two + 4,
    borderRadius: Radius.md,
  },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
});
