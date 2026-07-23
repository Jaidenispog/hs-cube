import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Badge, CardButton } from '@/components/kit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BoardCard, WorkItem } from '@/lib/types';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'muted' | 'info';

/**
 * Colour a job's state so the board reads at a glance rather than as a wall of indigo.
 * Falls back to accent for pack-specific states we don't know about.
 */
export function stateTone(state: string): Tone {
  const s = state.toLowerCase().replace(/[^a-z]/g, '');
  if (s.includes('progress')) return 'accent';
  if (s.includes('ready') || s.includes('done') || s.includes('complete')) return 'success';
  if (s.includes('await') || s.includes('parts') || s.includes('hold')) return 'warning';
  if (s.includes('collected') || s.includes('closed') || s.includes('cancel')) return 'muted';
  if (s.includes('booked') || s.includes('new')) return 'info';
  return 'accent';
}

/** Split PascalCase state names for display ("AwaitingParts" → "Awaiting Parts"). */
export function prettyState(state: string): string {
  return state.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** A tappable job summary card (used on the Jobs list and inside board columns). */
export function JobCard({ card }: { card: BoardCard }) {
  const router = useRouter();
  const theme = useTheme();
  const tone = stateTone(card.stateName);
  const tint = tone === 'muted' ? theme.textSecondary : theme[tone];
  return (
    <CardButton onPress={() => router.push(`/jobs/${card.id}`)} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: theme.well }]}>
          <Ionicons name="car-sport" size={22} color={tint} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.top}>
            <ThemedText style={styles.ref} numberOfLines={1}>
              {card.reference}
            </ThemedText>
            <Badge label={prettyState(card.stateName)} tone={tone} />
          </View>
          {card.customerName ? (
            <ThemedText type="small" numberOfLines={1}>
              {card.customerName}
            </ThemedText>
          ) : null}
          {card.vehicleLabel ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {card.vehicleLabel}
            </ThemedText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      </View>
    </CardButton>
  );
}

/**
 * A job row for the employee surface.
 *
 * Staff read /work-items (scoped to their assignments), not /board — the board is OWNER-only, so a
 * worker's token is refused there. A WorkItem carries no customerName/vehicleLabel: those live on the
 * board read-model, which is exactly the business data an employee isn't shown. Hence the leaner row.
 */
export function StaffJobCard({ item }: { item: WorkItem }) {
  const router = useRouter();
  const theme = useTheme();
  const tone = stateTone(item.stateName);
  return (
    <CardButton onPress={() => router.push(`/jobs/${item.id}`)} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.refWell, { backgroundColor: theme.well }]}>
          <ThemedText style={styles.refShort} numberOfLines={1}>
            {item.reference.replace(/^J-0*/, '#')}
          </ThemedText>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <ThemedText style={styles.ref} numberOfLines={1}>
            {item.reference}
          </ThemedText>
          <ThemedText type="small" themeColor="muted" numberOfLines={1}>
            Opened {new Date(item.createdAt).toLocaleDateString('en-AU')}
          </ThemedText>
        </View>
        <Badge label={prettyState(item.stateName)} tone={tone} />
      </View>
    </CardButton>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three - 2 },
  refWell: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.sm, minWidth: 52, alignItems: 'center' },
  refShort: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 4 },
  badge: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  ref: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, flexShrink: 1 },
});
