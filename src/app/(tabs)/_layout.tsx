import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Radius, Shadow, Spacing, TabBarBottomGap, TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Font } from '@/lib/fonts';
import { useIsStaff } from '@/lib/roles';

/**
 * The floating dark pill nav. The active tab's glyph sits in an accent pill with its label underneath;
 * inactive tabs are muted glyphs on the dark bar. The label is left to React Navigation (tinted via
 * tabBarActiveTintColor) — stacking it under the icon keeps each item inside its 1/5 of the bar.
 */
function TabItem({ focused, name }: { focused: boolean; name: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme();
  return (
    <View style={[styles.item, focused && { backgroundColor: theme.accent }]}>
      <Ionicons name={name} size={19} color={focused ? theme.navText : theme.navMuted} />
    </View>
  );
}

function HeaderIcon({ name, onPress }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 12 })}
    >
      <Ionicons name={name} size={22} color={theme.accent} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  // The board is the whole shop's work — OWNER-only on the API, so an employee gets no tab for it
  // (href: null removes the route, not just the button). People stays: employees have contact CRUD,
  // because intake is their job.
  const isStaff = useIsStaff();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background, shadowColor: 'transparent', elevation: 0 },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: Font.semibold, fontSize: 18 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.navText,
        tabBarInactiveTintColor: theme.navMuted,
        tabBarLabelStyle: { fontSize: 10.5, fontFamily: Font.medium, marginTop: 3 },
        tabBarItemStyle: { paddingVertical: 8 },
        tabBarStyle: {
          backgroundColor: theme.nav,
          borderTopWidth: 0,
          height: TabBarHeight,
          marginHorizontal: Spacing.three,
          marginBottom: TabBarBottomGap,
          borderRadius: Radius.xxl,
          paddingHorizontal: 6,
          position: 'absolute',
          ...Shadow.lifted,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false, // the dashboard draws its own greeting header
          tabBarIcon: ({ focused }) => <TabItem focused={focused} name="home" />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: 'Board',
          href: isStaff ? null : undefined,
          tabBarIcon: ({ focused }) => <TabItem focused={focused} name="grid" />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused }) => <TabItem focused={focused} name="construct" />,
          headerRight: () => <HeaderIcon name="add" onPress={() => router.push('/jobs/new')} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'People',
          tabBarIcon: ({ focused }) => <TabItem focused={focused} name="people" />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Merging duplicates is an admin op — /contacts/duplicates is OWNER-only and would 403. */}
              {isStaff ? null : (
                <HeaderIcon
                  name="git-merge-outline"
                  onPress={() => router.push('/customers/duplicates')}
                />
              )}
              <HeaderIcon name="add" onPress={() => router.push('/customers/new')} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabItem focused={focused} name="ellipsis-horizontal" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /** The accent pill that sits behind the active glyph. */
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 30,
    borderRadius: Radius.pill,
  },
});
