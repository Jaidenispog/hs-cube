import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionTitle } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL, ApiError, api, authHeaders } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import { Font } from '@/lib/fonts';
import type { Attachment } from '@/lib/types';

/** Job photos: thumbnails + capture/upload from the camera or library (base64 → API). */
export function JobPhotos({ jobId }: { jobId: string }) {
  const theme = useTheme();
  const { data, loading, reload } = useQuery<Attachment[]>(
    () => api.get<Attachment[]>(`/work-items/${jobId}/attachments`),
    [jobId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photos = (data ?? []).filter((a) => a.contentType.startsWith('image/'));

  const upload = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/work-items/${jobId}/attachments`, {
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
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

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission is needed to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!res.canceled && res.assets[0]) void upload(res.assets[0]);
  };

  const fromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: 'images',
    });
    if (!res.canceled && res.assets[0]) void upload(res.assets[0]);
  };

  return (
    <View style={{ gap: Spacing.two }}>
      <SectionTitle
        right={
          photos.length ? (
            <ThemedText type="small" themeColor="muted">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </ThemedText>
          ) : undefined
        }
      >
        Photos
      </SectionTitle>
      <Card style={{ gap: Spacing.three }}>
        {photos.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.well }]}>
            <Ionicons name="images-outline" size={22} color={theme.muted} />
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
                  uri: `${API_BASE_URL}/work-items/${jobId}/attachments/${p.id}/content`,
                  headers: authHeaders(),
                }}
                style={[styles.thumb, { backgroundColor: theme.well }]}
              />
            ))}
          </View>
        )}

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        {/* Soft accent wells rather than outlined buttons — no borders anywhere. */}
        <View style={styles.actions}>
          <PhotoAction icon="camera-outline" label="Camera" onPress={fromCamera} busy={busy} />
          <PhotoAction icon="images-outline" label="Library" onPress={fromLibrary} busy={busy} />
        </View>

        {busy || loading ? (
          <ThemedText type="small" themeColor="muted">
            {busy ? 'Uploading…' : 'Loading…'}
          </ThemedText>
        ) : null}
      </Card>
    </View>
  );
}

function PhotoAction({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  busy: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.accentSoft, opacity: pressed || busy ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.accent} />
      <ThemedText style={{ color: theme.accent, fontFamily: Font.semibold, fontSize: 14 }} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 96, height: 96, borderRadius: Radius.lg },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
});
