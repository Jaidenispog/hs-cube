import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ErrorView,
  KV,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Lead } from '@/lib/types';

const TONE = { New: 'accent', Contacted: 'warning', Converted: 'success' } as const;

export default function LeadsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<Lead[]>(() => api.get<Lead[]>('/leads'), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data || data.length === 0) return <Empty message="No leads yet." icon="megaphone-outline" />;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setRowError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setRowError(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const markContacted = (l: Lead) =>
    run(l.id, () => api.patch(`/leads/${l.id}/status`, { status: 'Contacted' }));
  const convert = (l: Lead) =>
    run(l.id, () =>
      api.post<{ contactId: string }>(`/leads/${l.id}/convert`).then((r) => router.push(`/customers/${r.contactId}`)),
    );

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {rowError ? (
        <Card style={{ backgroundColor: theme.dangerSoft }}>
          <ThemedText type="small" themeColor="danger">
            {rowError}
          </ThemedText>
        </Card>
      ) : null}

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {data.length} {data.length === 1 ? 'lead' : 'leads'}
          </ThemedText>
        }
      >
        Pipeline
      </SectionTitle>

      {data.map((lead) => (
        <Card key={lead.id}>
          {/* Who it is, and where they sit in the pipeline. */}
          <View style={styles.top}>
            <Avatar name={lead.name} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {lead.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {lead.phone}
                {lead.email ? ` · ${lead.email}` : ''}
              </ThemedText>
            </View>
            <Badge label={lead.status} tone={TONE[lead.status] ?? 'muted'} />
          </View>

          <View style={styles.facts}>
            {lead.vehicleInfo ? <KV label="Vehicle" value={lead.vehicleInfo} /> : null}
            <KV label="Source" value={lead.source} />
          </View>

          {/* Their own words sit in a well so they read as a quote, not as our copy. */}
          {lead.message ? (
            <View style={[styles.quote, { backgroundColor: theme.well }]}>
              <ThemedText type="small" themeColor="textSecondary">
                “{lead.message}”
              </ThemedText>
            </View>
          ) : null}

          {lead.status === 'New' ? (
            <Button
              label="Mark contacted"
              icon="call-outline"
              loading={busyId === lead.id}
              onPress={() => markContacted(lead)}
            />
          ) : null}
          {lead.status === 'Contacted' ? (
            <Button
              label="Convert to customer"
              icon="person-add-outline"
              loading={busyId === lead.id}
              onPress={() => convert(lead)}
            />
          ) : null}
          {lead.status === 'Converted' && lead.convertedContactId ? (
            <Button
              label="View customer"
              tone="plain"
              icon="person-outline"
              chevron
              onPress={() => router.push(`/customers/${lead.convertedContactId}`)}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, letterSpacing: -0.2 },
  facts: { marginTop: Spacing.one },
  quote: { borderRadius: Radius.md, paddingHorizontal: Spacing.three - 2, paddingVertical: Spacing.two + 2 },
});
