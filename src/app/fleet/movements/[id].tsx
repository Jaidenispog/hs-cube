import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import {
  Badge,
  Button,
  Card,
  ErrorView,
  KV,
  Loading,
  Screen,
  ScreenHeader,
  SectionTitle,
} from '@/components/kit';
import { PastelName, Pastels, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL, ApiError, api, authHeaders } from '@/lib/api';
import {
  FleetMovement,
  FleetPhoto,
  RentalPeriod,
  formatDateTime,
  movementStatusLabel,
  purposeLabel,
} from '@/lib/fleet';
import { Font } from '@/lib/fonts';
import { useQuery } from '@/lib/use-query';

/** A soft danger note for inline failures — no borders, just a tinted well. */
function FormError({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.formError, { backgroundColor: theme.dangerSoft }]}>
      <Ionicons name="alert-circle" size={16} color={theme.danger} />
      <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>
        {message}
      </ThemedText>
    </View>
  );
}

/** One side of the swap: a pastel plate carrying a rego. */
function RegoPlate({ label, rego, pastel }: { label: string; rego: string; pastel: PastelName }) {
  const p = Pastels[pastel];
  return (
    <View style={[styles.plate, { backgroundColor: p.bg }]}>
      <ThemedText style={[styles.plateLabel, { color: p.ink }]} numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        style={[styles.plateRego, { color: p.ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {rego || '—'}
      </ThemedText>
    </View>
  );
}

export default function MovementDetailScreen() {
  const theme = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useQuery<FleetMovement>(
    () => api.get(`/fleet/movements/${id}`),
    [id],
  );
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;
  const m = data;

  const markReturned = async () => {
    setBusy(true);
    try {
      await api.patch(`/fleet/movements/${id}`, { status: 'returned' });
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tabInset={false} refreshing={loading} onRefresh={reload}>
      <ScreenHeader
        title={m.carsOutRego || m.carsInRego || 'Movement'}
        subtitle={`${purposeLabel(m.purpose)} · ${movementStatusLabel[m.status]}`}
        right={
          <Badge
            label={movementStatusLabel[m.status]}
            tone={m.status === 'active' ? 'danger' : 'success'}
          />
        }
      />

      {/* The swap, at a glance: our car went out, theirs came in. */}
      <Card>
        <View style={styles.swap}>
          <RegoPlate label="Fleet car out" rego={m.carsOutRego} pastel="lilac" />
          <View style={[styles.swapIcon, { backgroundColor: theme.well }]}>
            <Ionicons name="swap-horizontal" size={18} color={theme.textSecondary} />
          </View>
          <RegoPlate label="Customer car in" rego={m.carsInRego} pastel="sand" />
        </View>
      </Card>

      <SectionTitle>Details</SectionTitle>
      <Card>
        <KV label="Driver" value={[m.driverName, m.driverPhone].filter(Boolean).join(' · ') || '—'} />
        <KV label="Purpose" value={purposeLabel(m.purpose)} />
        <KV label="Out at" value={formatDateTime(m.movedAt)} />
        <KV label="Status" value={movementStatusLabel[m.status]} />
        {m.notes ? <KV label="Notes" value={m.notes} /> : null}
      </Card>

      {m.status === 'active' ? (
        <Button label="Mark returned" icon="checkmark" loading={busy} onPress={markReturned} />
      ) : null}

      <Photos movementId={m.id} />
      {m.carsOutRego ? <History rego={m.carsOutRego} /> : null}
    </Screen>
  );
}

function Photos({ movementId }: { movementId: string }) {
  const theme = useTheme();
  const { data, loading, reload } = useQuery<FleetPhoto[]>(
    () => api.get(`/fleet/photos?movementId=${movementId}`),
    [movementId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (asset: ImagePicker.ImagePickerAsset, photoType: string) => {
    if (!asset.base64) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/fleet/photos', {
        movementId,
        photoType,
        contentType: asset.mimeType ?? 'image/jpeg',
        dataBase64: asset.base64,
      });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = async (photoType: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission is needed.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!res.canceled && res.assets[0]) void upload(res.assets[0], photoType);
  };

  const photos = data ?? [];

  return (
    <View style={{ gap: Spacing.two }}>
      <SectionTitle
        right={
          photos.length ? (
            <ThemedText type="small" themeColor="muted">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </ThemedText>
          ) : null
        }
      >
        Photos
      </SectionTitle>

      <Card>
        {photos.length === 0 ? (
          <View style={styles.noPhotos}>
            <Ionicons name="images-outline" size={18} color={theme.muted} />
            <ThemedText type="small" themeColor="muted">
              No photos yet.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((p) => (
              <Image
                key={p.id}
                source={{
                  uri: `${API_BASE_URL}/fleet/photos/${p.id}/content`,
                  headers: authHeaders(),
                }}
                style={[styles.thumb, { backgroundColor: theme.well }]}
              />
            ))}
          </View>
        )}
        {busy || loading ? (
          <ThemedText type="small" themeColor="muted">
            {busy ? 'Uploading…' : 'Loading…'}
          </ThemedText>
        ) : null}
      </Card>

      {error ? <FormError message={error} /> : null}

      {/* Plain buttons live on the page, not inside the card — they'd vanish against white. */}
      <Button
        label="Photo before handover"
        tone="plain"
        size="sm"
        icon="camera-outline"
        disabled={busy}
        onPress={() => fromCamera('before_handover')}
      />
      <Button
        label="Photo after return"
        tone="plain"
        size="sm"
        icon="camera-outline"
        disabled={busy}
        onPress={() => fromCamera('after_return')}
      />
    </View>
  );
}

function History({ rego }: { rego: string }) {
  const theme = useTheme();
  const { data } = useQuery<RentalPeriod[]>(
    () => api.get(`/fleet/vehicles/history?rego=${encodeURIComponent(rego)}`),
    [rego],
  );
  if (!data || data.length === 0) return null;
  return (
    <View style={{ gap: Spacing.two }}>
      <SectionTitle>Chain of custody</SectionTitle>
      <Card style={styles.timelineCard}>
        {data.map((p, i) => {
          const last = i === data.length - 1;
          return (
            <View key={p.id} style={styles.tlRow}>
              <View style={styles.rail}>
                {!last ? <View style={[styles.railLine, { backgroundColor: theme.well }]} /> : null}
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: p.ongoing ? theme.danger : theme.accentSoft },
                  ]}
                />
              </View>
              <View style={[styles.tlBody, last && styles.tlBodyLast]}>
                <ThemedText type="small" numberOfLines={1}>
                  {p.driverName || 'Unknown'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDateTime(p.outAt)} → {p.ongoing ? 'still out' : formatDateTime(p.backAt)}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const DOT = 10;

const styles = StyleSheet.create({
  swap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swapIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: { flex: 1, borderRadius: Radius.lg, padding: Spacing.three - 2, gap: 4 },
  plateLabel: { fontFamily: Font.medium, fontSize: 11.5, opacity: 0.75 },
  plateRego: { fontFamily: Font.bold, fontSize: 20, letterSpacing: 0.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 92, height: 92, borderRadius: Radius.md },
  noPhotos: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
  },

  timelineCard: { gap: 0 },
  tlRow: { flexDirection: 'row', gap: Spacing.two + 4 },
  rail: { width: 18, alignItems: 'center', paddingTop: 6 },
  railLine: {
    position: 'absolute',
    top: 6 + DOT,
    bottom: 0,
    width: 2,
    borderRadius: Radius.pill,
  },
  dot: { width: DOT, height: DOT, borderRadius: Radius.pill },
  tlBody: { flex: 1, gap: 2, paddingBottom: Spacing.three },
  tlBodyLast: { paddingBottom: 0 },
});
