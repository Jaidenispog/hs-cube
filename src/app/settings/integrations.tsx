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
  Loading,
  Screen,
  SectionTitle,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Font } from '@/lib/fonts';
import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { Integration } from '@/lib/types';

export default function IntegrationsScreen() {
  const theme = useTheme();
  const { data, error, loading, reload } = useQuery<Integration[]>(() => api.get<Integration[]>('/integrations'), []);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const items = data ?? [];

  const toggle = async (i: Integration) => {
    setBusy(i.slug);
    try { await api.post(`/integrations/${i.slug}/${i.status === 'connected' ? 'disconnect' : 'connect'}`, {}); reload(); }
    finally { setBusy(null); }
  };

  const connected = items.filter((i) => i.status === 'connected').length;

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <Card>
        <BigStat
          label="Connected"
          value={String(connected)}
          icon="link"
          iconTone="accent"
          caption={`${items.length} ${items.length === 1 ? 'service' : 'services'} available to wire up`}
        />
      </Card>

      <SectionTitle>All integrations</SectionTitle>

      {items.length === 0 ? (
        <Empty message="No integrations available." icon="extension-puzzle-outline" />
      ) : (
        items.map((i) => {
          const isOn = i.status === 'connected';
          return (
            <Card key={i.slug} style={styles.cardBody}>
              <View style={styles.row}>
                <IconBadge icon="extension-puzzle" tone={isOn ? 'success' : 'muted'} size={42} />
                <View style={{ flex: 1, gap: 1 }}>
                  <ThemedText style={styles.name} numberOfLines={1}>
                    {i.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="muted" numberOfLines={1}>
                    {i.category}
                  </ThemedText>
                </View>
                {isOn ? (
                  <Badge label="Connected" tone="success" />
                ) : i.available ? (
                  <Badge label="Off" tone="muted" />
                ) : (
                  <Badge label="Soon" tone="warning" />
                )}
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                {i.description}
              </ThemedText>

              <View style={[styles.footer, { backgroundColor: theme.well }]}>
                {isOn ? (
                  <Button
                    label="Disconnect"
                    size="sm"
                    tone="plain"
                    icon="unlink-outline"
                    loading={busy === i.slug}
                    onPress={() => toggle(i)}
                  />
                ) : (
                  <Button
                    label={i.available ? 'Connect' : 'Coming soon'}
                    size="sm"
                    icon={i.available ? 'link-outline' : 'time-outline'}
                    disabled={!i.available || busy === i.slug}
                    loading={busy === i.slug}
                    onPress={() => toggle(i)}
                  />
                )}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardBody: { padding: Spacing.three - 2, gap: Spacing.two + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  name: { fontFamily: Font.semibold, fontSize: 15.5, letterSpacing: -0.2 },
  footer: { borderRadius: Radius.lg, padding: Spacing.two, gap: Spacing.two },
});
