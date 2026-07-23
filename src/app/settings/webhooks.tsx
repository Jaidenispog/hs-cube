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
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Font } from '@/lib/fonts';
import { ApiError, api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { WebhookEndpoint } from '@/lib/types';

export default function WebhooksScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<WebhookEndpoint[]>(() => api.get<WebhookEndpoint[]>('/webhooks'), []);
  const [url, setUrl] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const endpoints = data ?? [];

  const add = async () => {
    if (!url.trim()) return;
    setBusyId('new'); setFormError(null);
    try { await api.post('/webhooks', { url: url.trim() }); setUrl(''); reload(); }
    catch (e) { setFormError(e instanceof ApiError ? e.message : 'Could not add'); }
    finally { setBusyId(null); }
  };
  const test = async (ep: WebhookEndpoint) => {
    setBusyId(ep.id);
    try { const d = await api.post<{ status: string; responseCode: number | null }>(`/webhooks/${ep.id}/test`); setStatus((s) => ({ ...s, [ep.id]: `${d.status}${d.responseCode ? ` (${d.responseCode})` : ''}` })); }
    finally { setBusyId(null); }
  };
  const remove = async (ep: WebhookEndpoint) => { await api.del(`/webhooks/${ep.id}`); reload(); };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Add an endpoint</SectionTitle>
        <Card style={{ gap: Spacing.two }}>
          <Input placeholder="https://example.com/hook" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />
          {formError ? (
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          ) : null}
          <Button label="Add endpoint" icon="add" loading={busyId === 'new'} disabled={!url.trim()} onPress={add} />
        </Card>
      </View>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {endpoints.length} {endpoints.length === 1 ? 'endpoint' : 'endpoints'}
          </ThemedText>
        }
      >
        Endpoints
      </SectionTitle>

      {endpoints.length === 0 ? (
        <Empty message="No webhook endpoints yet." icon="link-outline" />
      ) : (
        endpoints.map((ep) => (
          <Card key={ep.id} style={styles.cardBody}>
            <View style={styles.row}>
              <IconBadge icon="link" tone={ep.active ? 'accent' : 'muted'} size={42} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="code" numberOfLines={1}>
                  {ep.url}
                </ThemedText>
                <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                  {ep.events.length} {ep.events.length === 1 ? 'event' : 'events'}
                </ThemedText>
              </View>
              {status[ep.id] ? (
                <Badge label={status[ep.id]} tone={status[ep.id].startsWith('success') ? 'success' : 'danger'} />
              ) : null}
            </View>

            {/* The subscribed events, as soft chips on a well. */}
            <View style={[styles.events, { backgroundColor: theme.well }]}>
              {ep.events.map((e) => (
                <View key={e} style={[styles.eventChip, { backgroundColor: theme.card }]}>
                  <ThemedText style={[styles.eventText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {e}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={[styles.footer, { backgroundColor: theme.well }]}>
              <Button label="Send test" size="sm" tone="plain" icon="paper-plane-outline" loading={busyId === ep.id} onPress={() => test(ep)} />
              <Button label="Delete" size="sm" tone="danger" icon="trash-outline" onPress={() => remove(ep)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardBody: { padding: Spacing.three - 2, gap: Spacing.two + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  events: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2, borderRadius: Radius.lg, padding: Spacing.two },
  eventChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  eventText: { fontFamily: Font.medium, fontSize: 12 },
  footer: { borderRadius: Radius.lg, padding: Spacing.two, gap: Spacing.two },
});
