import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { api } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import type { MaterialRequest, MaterialRequestLine } from '@/lib/types';

type Draft = { description: string; quantity: string };

const statusTone = (s: string): 'accent' | 'success' | 'warning' | 'danger' | 'muted' => {
  const v = s.toLowerCase();
  if (v.includes('approved')) return 'success';
  if (v.includes('rejected')) return 'danger';
  if (v.includes('ordered')) return 'accent';
  if (v.includes('pending') || v.includes('requested')) return 'warning';
  return 'muted';
};

/**
 * Parts request — the technician's side of floor ordering. A worker lists what the job needs and raises
 * it; a manager approves and orders (both OWNER-only on the API, so there's no approve button here).
 *
 * The API scopes this to jobs assigned to the caller, so an employee opening someone else's job gets a
 * 404 rather than a request form.
 */
export default function JobPartsScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [lines, setLines] = useState<Draft[]>([{ description: '', quantity: '1' }]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const existing = useQuery<MaterialRequest[]>(
    () => api.get<MaterialRequest[]>(`/work-items/${jobId}/material-requests`),
    [jobId],
  );

  const setLine = (i: number, patch: Partial<Draft>) =>
    setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { description: '', quantity: '1' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, n) => n !== i));

  const filled = lines.filter((l) => l.description.trim().length > 0);
  const canSubmit = filled.length > 0 && !busy;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/work-items/${jobId}/material-requests`, {
        lines: filled.map((l) => ({
          description: l.description.trim(),
          // The API wants a positive int or nothing at all — never NaN from a half-typed field.
          quantity: Number.isFinite(Number(l.quantity)) && Number(l.quantity) > 0
            ? Math.floor(Number(l.quantity))
            : undefined,
        })),
        notes: notes.trim() || undefined,
      });
      setLines([{ description: '', quantity: '1' }]);
      setNotes('');
      existing.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not raise the request');
    } finally {
      setBusy(false);
    }
  };

  if (existing.loading && !existing.data) return <Loading />;
  if (existing.error && !existing.data)
    return <ErrorView message={existing.error} onRetry={existing.reload} />;

  return (
    <Screen tabInset={false}>
      <Card>
        <View style={styles.head}>
          <IconBadge icon="construct" tone="accent" size={44} />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title}>Request parts</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your manager approves before anything is ordered
            </ThemedText>
          </View>
        </View>

        {lines.map((l, i) => (
          <View key={i} style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="What do you need? e.g. front bumper clip"
                value={l.description}
                onChangeText={(v) => setLine(i, { description: v })}
              />
            </View>
            <View style={{ width: 74 }}>
              <Input
                placeholder="Qty"
                value={l.quantity}
                onChangeText={(v) => setLine(i, { quantity: v.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
                style={{ textAlign: 'center' }}
              />
            </View>
            {lines.length > 1 ? (
              <Pressable
                onPress={() => removeLine(i)}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Ionicons name="close-circle" size={22} color={theme.muted} />
              </Pressable>
            ) : null}
          </View>
        ))}

        <Button label="Add another item" tone="plain" size="sm" icon="add" onPress={addLine} />

        <Input
          placeholder="Anything the manager should know (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ minHeight: 76, textAlignVertical: 'top', paddingTop: 14 }}
        />

        {err ? (
          <View style={[styles.err, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger">
              {err}
            </ThemedText>
          </View>
        ) : null}

        <Button
          label={busy ? 'Sending…' : 'Send request'}
          icon="paper-plane"
          loading={busy}
          disabled={!canSubmit}
          onPress={() => void submit()}
        />
      </Card>

      <SectionTitle>Already requested</SectionTitle>
      {(existing.data ?? []).length === 0 ? (
        <Empty message="No parts requested for this job yet." icon="cube-outline" />
      ) : (
        (existing.data ?? []).map((r) => (
          <Card key={r.id}>
            <View style={styles.reqHead}>
              <ThemedText style={styles.reqRef}>{r.reference}</ThemedText>
              <Badge label={r.status} tone={statusTone(r.status)} />
            </View>
            {r.lines.map((l: MaterialRequestLine) => (
              <View key={l.id} style={[styles.line, { backgroundColor: theme.well }]}>
                <ThemedText type="small" style={{ flex: 1 }} numberOfLines={2}>
                  {l.description}
                </ThemedText>
                <ThemedText type="smallBold">×{l.quantity}</ThemedText>
              </View>
            ))}
            {r.decisionNote ? (
              <ThemedText type="small" themeColor="textSecondary">
                {r.decisionNote}
              </ThemedText>
            ) : null}
          </Card>
        ))
      )}

      <Button label="Back to job" tone="plain" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  err: { borderRadius: Radius.md, padding: Spacing.two + 2 },
  reqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  reqRef: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
