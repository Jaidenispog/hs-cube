import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, KV, NavRow, Screen, SectionTitle } from '@/components/kit';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';
import { useIsStaff } from '@/lib/roles';

/**
 * `staff: true` marks a destination an employee may open. It mirrors the API's @AllowStaff() allowlist —
 * everything else is OWNER-only there and would 403, so we don't show it. See lib/roles.ts.
 *
 * `offWedge: true` marks a destination built for a different vertical (retail/salon), not panel & paint
 * (card #300). The screens and their APIs still work — we just don't lead a panel shop to them. Drop the
 * flag to put one back in the menu once a pack that wants it exists.
 */
const LINKS = [
  { href: '/fleet', label: 'Fleet & courtesy cars', icon: 'car-outline' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar-outline' },
  { href: '/waitlist', label: 'Waitlist', icon: 'time-outline' },
  { href: '/roster', label: 'Roster', icon: 'people-outline', staff: true },
  { href: '/time-clock', label: 'Time clock', icon: 'time-outline', staff: true },
  { href: '/leads', label: 'Leads', icon: 'megaphone-outline' },
  { href: '/price-book', label: 'Price book', icon: 'pricetags-outline' },
  { href: '/inventory', label: 'Inventory', icon: 'cube-outline', offWedge: true },
  { href: '/loyalty', label: 'Loyalty & gift cards', icon: 'gift-outline', offWedge: true },
  { href: '/referrals', label: 'Referrals', icon: 'share-social-outline', offWedge: true },
  { href: '/pos', label: 'Point of sale', icon: 'card-outline', offWedge: true },
  { href: '/settings/custom-fields', label: 'Custom fields', icon: 'options-outline' },
  { href: '/settings/webhooks', label: 'Webhooks', icon: 'link-outline' },
  { href: '/settings/integrations', label: 'Integrations', icon: 'extension-puzzle-outline' },
] as const;

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const isStaff = useIsStaff();
  const links = LINKS.filter((l) => !('offWedge' in l)).filter((l) => !isStaff || 'staff' in l);

  return (
    <Screen>
      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Workspace</SectionTitle>
        <Card>
          {links.map((l, i) => (
            <NavRow
              key={l.href}
              label={l.label}
              icon={l.icon}
              first={i === 0}
              onPress={() => router.push(l.href)}
            />
          ))}
        </Card>
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionTitle>Session</SectionTitle>
        <Card>
          <KV label="Role" value={user?.role ?? '—'} />
          <KV label="Tenant" value={user?.tenantId ?? '—'} mono />
          <KV label="API" value={API_BASE_URL} mono />
        </Card>
        <Button label="Sign out" tone="danger" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
