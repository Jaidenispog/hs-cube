import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import EmployeeHome from '@/components/employee-home';
import { ThemedText } from '@/components/themed-text';
import {
  BarChart,
  BigStat,
  Card,
  CircleButton,
  Empty,
  ErrorView,
  Loading,
  Screen,
  SectionTitle,
  StatTile,
  formatMoneyCompact,
} from '@/components/kit';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useIsStaff } from '@/lib/roles';
import { useQuery } from '@/lib/use-query';
import type { DashboardSummary } from '@/lib/types';

/**
 * Job states are PascalCase and too long for an axis tick, so show one word and keep the full name for
 * the tooltip. A tiny leading word carries no meaning on its own ("InProgress" → "In"), so in that case
 * use the following word instead ("Progress").
 */
function shortState(state: string): string {
  const words = state.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
  const pick = words[0].length <= 3 && words[1] ? words[1] : words[0];
  return pick;
}

function prettyState(state: string): string {
  return state.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Home is two different products depending on who's holding the phone. The owner gets the business;
 * the employee gets their shift and their own jobs. Split here rather than inside the dashboard so a
 * worker's device never even issues the /dashboard/summary request — which the API would refuse.
 */
export default function HomeScreen() {
  const isStaff = useIsStaff();
  return isStaff ? <EmployeeHome /> : <OwnerHome />;
}

function OwnerHome() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [picked, setPicked] = useState(0);
  const { data, error, loading, reload } = useQuery<DashboardSummary>(
    () => api.get<DashboardSummary>('/dashboard/summary'),
    [],
  );

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;

  const s = data;
  const states = s ? Object.entries(s.jobsByState) : [];
  const role = user?.role === 'OWNER' ? 'Owner' : 'Staff';
  const chart = states.map(([state, count]) => ({
    label: shortState(state),
    tipLabel: prettyState(state),
    value: count,
  }));

  return (
    <Screen safeTop refreshing={loading} onRefresh={reload}>
      {/* Greeting — avatar, who you are, and the two quick actions. */}
      <View style={styles.greet}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }, Shadow.subtle]}>
          <ThemedText style={{ color: theme.accentText, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>
            {role[0]}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.hello} numberOfLines={1}>
            Hey there 👋
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Signed in as {role.toLowerCase()}
          </ThemedText>
        </View>
        <CircleButton icon="calendar-outline" onPress={() => router.push('/calendar')} />
        <CircleButton icon="notifications-outline" onPress={() => router.push('/waitlist')} />
      </View>

      {/* The hero number. */}
      <Card>
        <BigStat
          label="Active jobs"
          value={String(s?.activeJobs ?? 0)}
          icon="construct"
          iconTone="accent"
          caption="Open in the workshop now"
        />
      </Card>

      {/* Money at a glance. */}
      <View style={styles.tiles}>
        <StatTile
          icon="trending-up"
          value={formatMoneyCompact(s?.thisWeekRevenueCents)}
          label="This week"
          pastel="mint"
          onPress={() => router.push('/(tabs)/jobs')}
        />
        <StatTile
          icon="alert-circle"
          value={formatMoneyCompact(s?.totalUnpaidCents)}
          label="Unpaid"
          pastel="salmon"
        />
        <StatTile icon="layers" value={String(states.length)} label="States" pastel="lilac" />
      </View>

      {/* Jobs by state — tap a bar for the exact count. */}
      <View style={{ gap: Spacing.two }}>
        <SectionTitle
          right={
            <View style={[styles.pillLabel, { backgroundColor: theme.card }, Shadow.subtle]}>
              <ThemedText type="small" themeColor="textSecondary">
                Now
              </ThemedText>
            </View>
          }
        >
          Jobs by state
        </SectionTitle>
        {chart.length === 0 ? (
          <Empty message="No jobs yet." />
        ) : (
          <Card>
            <BarChart
              data={chart}
              selectedIndex={picked}
              onSelect={setPicked}
              height={170}
              formatValue={(v) => `${v} ${v === 1 ? 'job' : 'jobs'}`}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  avatar: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  hello: { fontFamily: 'Poppins_700Bold', fontSize: 23, lineHeight: 28, letterSpacing: -0.5 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  pillLabel: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
});
