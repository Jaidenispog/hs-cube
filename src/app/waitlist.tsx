import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
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
} from '@/components/kit';
import { Spacing } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { WaitlistEntry } from '@/lib/types';

export default function WaitlistScreen() {
  const { data, error, loading, reload } = useQuery<WaitlistEntry[]>(
    () => api.get<WaitlistEntry[]>('/waitlist'),
    [],
  );

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const entries = data ?? [];

  const add = async () => {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.post('/waitlist', { name: name.trim(), phone: phone.trim(), notes: notes.trim() || undefined });
      setName('');
      setPhone('');
      setNotes('');
      reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not add');
    } finally {
      setBusy(false);
    }
  };

  const remove = (e: WaitlistEntry) =>
    Alert.alert('Remove from waitlist?', e.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.del(`/waitlist/${e.id}`);
          reload();
        },
      },
    ]);

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The number that matters: how many people are waiting on a slot. */}
      <Card>
        <BigStat
          label="Waiting"
          value={String(entries.length)}
          icon="people"
          iconTone="accent"
          caption={entries.length === 1 ? 'Customer waiting on a slot' : 'Customers waiting on a slot'}
        />
      </Card>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Add to waitlist</SectionTitle>
        <Card style={{ gap: Spacing.two }}>
          <Input placeholder="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Input placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />
          {formError ? (
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          ) : null}
          <Button
            label="Add to waitlist"
            icon="add"
            loading={busy}
            disabled={!name.trim() || !phone.trim()}
            onPress={add}
          />
        </Card>
      </View>

      <SectionTitle
        right={
          <ThemedText type="small" themeColor="muted">
            {entries.length} {entries.length === 1 ? 'person' : 'people'}
          </ThemedText>
        }
      >
        In the queue
      </SectionTitle>

      {entries.length === 0 ? (
        <Empty message="Nobody's waiting right now." icon="time-outline" />
      ) : (
        entries.map((e, i) => (
          <Card key={e.id} style={styles.entryCard}>
            <View style={styles.row}>
              <Avatar name={e.name} size={42} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {e.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {e.phone}
                  {e.notes ? ` · ${e.notes}` : ''}
                </ThemedText>
              </View>
              <Badge label={`#${i + 1}`} tone={i === 0 ? 'accent' : 'muted'} />
            </View>
            <Button label="Remove" tone="plain" size="sm" icon="close" onPress={() => remove(e)} />
          </Card>
        ))
      )}

      <ThemedText type="small" themeColor="muted" style={{ textAlign: 'center' }}>
        Tip: book a waiting customer into a freed slot from the web calendar.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  entryCard: { padding: Spacing.three - 2, gap: Spacing.two + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
});
