import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { prettyState, stateTone } from '@/components/job-card';
import { JobPhotos } from '@/components/job-photos';
import { ThemedText } from '@/components/themed-text';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardButton,
  Empty,
  ErrorView,
  Input,
  KV,
  Loading,
  Screen,
  SectionTitle,
  formatMoney,
} from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Font } from '@/lib/fonts';
import { useIsStaff } from '@/lib/roles';
import { useQuery } from '@/lib/use-query';
import { eventsFor } from '@/lib/workflow';
import {
  vehicleLine,
  vehicleRego,
  type DirectoryEntry,
  type Invoice,
  type Note,
  type Quote,
  type WorkItem,
} from '@/lib/types';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'muted' | 'info';

/** Tone a quote's status so the row reads at a glance; mirrors the quote detail screen. */
const QUOTE_TONE: Record<string, Tone> = {
  Draft: 'muted',
  Sent: 'accent',
  Accepted: 'success',
  Declined: 'danger',
};

/** Tone an invoice's status; mirrors the invoice detail screen. */
const INVOICE_TONE: Record<string, Tone> = {
  Draft: 'muted',
  Sent: 'accent',
  Paid: 'success',
  Void: 'danger',
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isStaff = useIsStaff();
  const theme = useTheme();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const load = useCallback(
    () =>
      Promise.all([
        api.get<WorkItem>(`/work-items/${id}`),
        api.get<Quote[]>(`/work-items/${id}/quotes`),
        api.get<Invoice[]>(`/work-items/${id}/invoices`),
        api.get<Note[]>(`/work-items/${id}/notes`),
      ]),
    [id],
  );
  const { data, error, loading, reload } = useQuery(load, [id]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const [job, quotes, invoices, notes] = data;
  const mine = user ? job.assignees.includes(user.userId) : false;
  const events = eventsFor(job.stateName);
  const tone = stateTone(job.stateName);
  const tint = tone === 'muted' ? theme.textSecondary : theme[tone];

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

  const toggleAssign = () =>
    act(() =>
      api.post(`/work-items/${id}/assign`, { assignees: mine ? [] : user ? [user.userId] : [] }),
    );

  const transition = (event: string) => act(() => api.post(`/work-items/${id}/transition`, { event }));

  const newQuote = () =>
    act(() =>
      api.post<{ id: string }>(`/work-items/${id}/quotes`).then((q) => router.push(`/quotes/${q.id}`)),
    );

  const addNote = () => {
    const body = noteText.trim();
    if (!body) return;
    return act(async () => {
      await api.post(`/work-items/${id}/notes`, { body });
      setNoteText('');
    });
  };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      {/* The job at a glance: reference, where it sits in the workflow, who has it. */}
      <Card>
        <View style={styles.heroRow}>
          <View style={[styles.iconWell, { backgroundColor: theme.well }]}>
            <Ionicons name="car-sport" size={24} color={tint} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <ThemedText style={styles.heroRef} numberOfLines={1}>
              {job.reference}
            </ThemedText>
            <Badge label={prettyState(job.stateName)} tone={tone} />
          </View>
        </View>
        <KV
          label="Assigned to"
          value={
            job.assignees.length
              ? `${job.assignees.length} ${job.assignees.length === 1 ? 'person' : 'people'}`
              : 'Nobody yet'
          }
        />
      </Card>

      {job.subjects && job.subjects.length ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Vehicle</SectionTitle>
          <Card>
            {job.subjects.map((v) => (
              <KV key={v.id} label={vehicleLine(v)} value={vehicleRego(v) || '—'} mono />
            ))}
          </Card>
        </View>
      ) : null}

      {user ? (
        <Button
          label={mine ? 'Unassign me' : 'Assign to me'}
          tone={mine ? 'plain' : 'accent'}
          icon={mine ? 'person-remove' : 'person-add'}
          loading={busy}
          onPress={toggleAssign}
        />
      ) : null}

      {/* Dispatch. Without this an owner can only ever assign THEMSELVES, so no employee could be given
          work — and the staff assignee scope meant their app stayed empty forever. */}
      {isStaff ? null : (
        <Dispatch jobId={id} assignees={job.assignees} busy={busy} onChanged={reload} />
      )}

      {events.length ? (
        <View style={{ gap: Spacing.two }}>
          <SectionTitle>Move job</SectionTitle>
          {events.map((ev) => (
            <Button key={ev.event} label={ev.label} loading={busy} onPress={() => transition(ev.event)} />
          ))}
        </View>
      ) : null}

      {actionError ? (
        <ThemedText type="small" themeColor="danger">
          {actionError}
        </ThemedText>
      ) : null}

      <View style={{ gap: Spacing.two }}>
        <SectionTitle right={<Button label="New quote" size="sm" tone="plain" loading={busy} onPress={newQuote} />}>
          Quotes
        </SectionTitle>
        {quotes.length === 0 ? (
          <Empty message="No quotes yet." icon="document-text-outline" />
        ) : (
          quotes.map((q) => (
            <DocRow
              key={q.id}
              icon="document-text"
              reference={q.reference}
              status={q.status}
              tone={QUOTE_TONE[q.status] ?? 'muted'}
              amount={formatMoney(q.totalCents)}
              onPress={() => router.push(`/quotes/${q.id}`)}
            />
          ))
        )}
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Invoices</SectionTitle>
        {invoices.length === 0 ? (
          <Empty message="No invoices yet." icon="receipt-outline" />
        ) : (
          invoices.map((inv) => (
            <DocRow
              key={inv.id}
              icon="receipt"
              reference={inv.reference}
              status={inv.status}
              tone={INVOICE_TONE[inv.status] ?? 'muted'}
              amount={`${formatMoney(inv.balanceCents)} due`}
              onPress={() => router.push(`/invoices/${inv.id}`)}
            />
          ))
        )}
      </View>

      <JobPhotos jobId={id} />

      <View style={{ gap: Spacing.two }}>
        {/* Parts is the technician's action, so it stays available to both roles. */}
        <Button
          label="Request parts"
          tone="plain"
          icon="construct"
          chevron
          onPress={() => router.push(`/parts/${id}`)}
        />
        {/* Photo→quote and the claim file are owner-surface (AI + claim packs are OWNER-only on the
            API), so a worker would only reach a 403 — don't offer them the tap. */}
        {isStaff ? null : (
          <>
            <Button
              label="Photo → quote (AI)"
              tone="plain"
              icon="sparkles"
              chevron
              onPress={() => router.push(`/photo-to-quote/${id}`)}
            />
            <Button
              label="Claim file"
              tone="plain"
              icon="folder-open"
              chevron
              onPress={() => router.push(`/claim-file/${id}`)}
            />
          </>
        )}
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Notes</SectionTitle>
        {notes.length === 0 ? (
          <Empty message="No notes yet." icon="chatbubble-ellipses-outline" />
        ) : (
          <Card>
            {notes.map((n) => (
              <View key={n.id} style={[styles.noteBubble, { backgroundColor: theme.well }]}>
                <ThemedText type="small">{n.body}</ThemedText>
              </View>
            ))}
          </Card>
        )}
        <Card>
          <Input placeholder="Add a note…" value={noteText} onChangeText={setNoteText} multiline />
          <Button label="Add note" loading={busy} disabled={!noteText.trim()} onPress={addNote} />
        </Card>
      </View>
    </Screen>
  );
}

/** A tappable quote/invoice summary row — icon well, reference, toned status, money. */
function DocRow({
  icon,
  reference,
  status,
  tone,
  amount,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  reference: string;
  status: string;
  tone: Tone;
  amount: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const tint = tone === 'muted' ? theme.textSecondary : theme[tone];
  return (
    <CardButton onPress={onPress} style={styles.docCard}>
      <View style={styles.docRow}>
        <View style={[styles.docIcon, { backgroundColor: theme.well }]}>
          <Ionicons name={icon} size={20} color={tint} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText style={styles.docRef} numberOfLines={1}>
            {reference}
          </ThemedText>
          <Badge label={prettyState(status)} tone={tone} />
        </View>
        <ThemedText style={styles.docAmount} numberOfLines={1}>
          {amount}
        </ThemedText>
      </View>
    </CardButton>
  );
}

const styles = StyleSheet.create({
  dispatchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4, paddingVertical: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  iconWell: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  heroRef: { fontFamily: Font.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },

  docCard: { padding: Spacing.three - 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  docIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  docRef: { fontFamily: Font.semibold, fontSize: 15 },
  docAmount: { fontFamily: Font.bold, fontSize: 14, flexShrink: 1, textAlign: 'right' },

  noteBubble: { borderRadius: Radius.md, paddingHorizontal: Spacing.three - 4, paddingVertical: Spacing.two + 2 },
});

/**
 * Owner-only dispatch: assign this job to any member of the workshop.
 *
 * /auth/directory is OWNER-only and returns each member's email + role, which is why this whole block is
 * gated — a staff caller would 403 fetching it. Toggling a person posts the full assignees array, since
 * that's the shape /assign takes.
 */
function Dispatch({
  jobId,
  assignees,
  busy,
  onChanged,
}: {
  jobId: string;
  assignees: string[];
  busy: boolean;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const { data, error } = useQuery<DirectoryEntry[]>(
    () => api.get<DirectoryEntry[]>('/auth/directory'),
    [],
  );

  const toggle = async (userId: string) => {
    setSaving(userId);
    try {
      const next = assignees.includes(userId)
        ? assignees.filter((a) => a !== userId)
        : [...assignees, userId];
      await api.post(`/work-items/${jobId}/assign`, { assignees: next });
      onChanged();
    } finally {
      setSaving(null);
    }
  };

  if (error) return null; // never block the job screen on the directory
  const people = data ?? [];

  return (
    <View style={{ gap: Spacing.two }}>
      <SectionTitle>Assign to</SectionTitle>
      {people.length === 0 ? (
        <Empty message="No team members yet." icon="people-outline" />
      ) : (
        <Card>
          {people.map((p) => {
            const on = assignees.includes(p.userId);
            return (
              <Pressable
                key={p.userId}
                disabled={busy || saving !== null}
                onPress={() => void toggle(p.userId)}
                style={({ pressed }) => [styles.dispatchRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Avatar name={p.email ?? p.role} size={38} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" numberOfLines={1}>
                    {p.email ?? p.userId.slice(0, 8)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="muted">
                    {p.role}
                  </ThemedText>
                </View>
                {saving === p.userId ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={on ? theme.success : theme.muted}
                  />
                )}
              </Pressable>
            );
          })}
        </Card>
      )}
    </View>
  );
}
