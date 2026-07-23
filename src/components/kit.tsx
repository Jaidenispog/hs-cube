import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { LinearGradient } from "expo-linear-gradient";
import {
  BottomTabInset,
  Confidence,
  Hint,
  MaxContentWidth,
  PastelName,
  PastelOrder,
  Pastels,
  Radius,
  Rego,
  RoleName,
  RoleTheme,
  Shadow,
  Spacing,
  confidenceBand,
  statusColor,
} from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { Font } from "@/lib/fonts";

/**
 * react-native-web renders TextInput as a DOM input, which draws the browser's focus ring on top of our
 * own focus treatment. No-op on native.
 */
const noWebOutline =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

/** #RRGGBB + 0..1 alpha → #RRGGBBAA (for soft tinted fills). */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/** A padded, theme-aware scroll surface with optional pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  /** Set false on screens with no floating tab bar (modals, detail pushes). */
  tabInset = true,
  /**
   * Pad past the status bar / Dynamic Island. Only for screens that draw their OWN header
   * (headerShown: false). A native stack header already insets its scene, so setting this there would
   * double-pad.
   */
  safeTop = false,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  tabInset?: boolean;
  safeTop?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.screenContent,
        safeTop && { paddingTop: insets.top + Spacing.two },
        tabInset && { paddingBottom: BottomTabInset },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        ) : undefined
      }
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

/** A page heading: title + optional subtitle, with an optional right-hand slot. */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 3 }}>
        <ThemedText
          type="subtitle"
          style={styles.headerTitle}
          numberOfLines={2}
        >
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** A circular icon button — the reference's header control (back / bell / calendar). */
export function CircleButton({
  icon,
  onPress,
  tone = "plain",
  size = 44,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: "plain" | "accent";
  size?: number;
}) {
  const theme = useTheme();
  const isAccent = tone === "accent";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: Radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isAccent ? theme.accent : theme.card,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        Shadow.subtle,
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.45)}
        color={isAccent ? theme.accentText : theme.text}
      />
    </Pressable>
  );
}

/** Header for pushed screens: circular back, centred title, optional right control. */
export function DetailHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.detailHeader}>
      <CircleButton icon="chevron-back" onPress={onBack} />
      <ThemedText style={styles.detailTitle} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.detailRight}>
        {right ?? <View style={{ width: 44 }} />}
      </View>
    </View>
  );
}

/** A circular tinted chip holding a single icon — the reference's metric glyph. */
export function IconBadge({
  icon,
  tone = "accent",
  size = 46,
  filled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "accent" | "success" | "warning" | "danger" | "info" | "muted";
  size?: number;
  /** Solid tone fill with white glyph, instead of a white chip with a tinted glyph. */
  filled?: boolean;
}) {
  const theme = useTheme();
  const color = tone === "muted" ? theme.textSecondary : theme[tone];
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? color : theme.card,
        },
        !filled && Shadow.subtle,
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.48)}
        color={filled ? "#FFFFFF" : color}
      />
    </View>
  );
}

/** Up to two initials from a display name ("Metro Fleet Pty Ltd" → "MF"). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? (parts[1][0] ?? "") : "";
  return (first + second).toUpperCase();
}

/**
 * Stable pastel pick so the same person keeps the same colour between renders and screens.
 * FNV-1a — a plain `h*31 + c` sum distributes badly across 6 buckets (31 % 6 === 1) and clusters
 * most names onto the same two colours.
 */
function pastelFor(seed: string): PastelName {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return PastelOrder[Math.abs(h) % PastelOrder.length];
}

/** An initials avatar tinted from the name — no image needed. */
export function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  const p = Pastels[pastelFor(name)];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: p.bg,
      }}
    >
      <ThemedText
        style={{ color: p.ink, fontFamily: Font.bold, fontSize: size * 0.36 }}
      >
        {initialsOf(name)}
      </ThemedText>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.card }, Shadow.card, style]}
    >
      {children}
    </View>
  );
}

/** A tappable card row. */
export function CardButton({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card },
          Shadow.card,
          style,
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <ThemedText style={styles.sectionTitle}>{children}</ThemedText>
      {right}
    </View>
  );
}

/** A key/value line inside a Card. */
export function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type={mono ? "code" : "smallBold"}
        style={{ flexShrink: 1, textAlign: "right" }}
        numberOfLines={1}
      >
        {value}
      </ThemedText>
    </View>
  );
}

/** A tappable navigation row (icon badge + label + chevron). */
export function NavRow({
  label,
  icon,
  onPress,
  first,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Kept for API compatibility — rows no longer draw dividers. */
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.navIcon, { backgroundColor: theme.accentSoft }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <ThemedText style={{ flex: 1, fontFamily: Font.medium }}>
        {label}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
  );
}

type Tone = "accent" | "success" | "warning" | "danger" | "muted" | "info";

/** A soft pill. Reads as a status chip (`+13.3%`, `Out now`) rather than a shouty uppercase tag. */
export function Badge({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: Tone;
}) {
  const theme = useTheme();
  const fg = tone === "muted" ? theme.textSecondary : theme[tone];
  const bg =
    tone === "muted"
      ? theme.well
      : tone === "accent"
        ? theme.accentSoft
        : theme[`${tone}Soft` as const];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText
        style={{ color: fg, fontFamily: Font.semibold, fontSize: 12.5 }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

/** Alias with a clearer name for new code; same pill. */
export const Chip = Badge;

/**
 * The hero number treatment: oversized value, optional delta chip, small caption underneath.
 * e.g. `10,781` `+13.3%` / "More 13.3% than last month".
 */
export function BigStat({
  label,
  value,
  delta,
  deltaTone = "success",
  caption,
  icon,
  iconTone = "accent",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: Tone;
  caption?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: "accent" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <View style={styles.bigStatRow}>
      {icon ? <IconBadge icon={icon} tone={iconTone} size={56} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <View style={styles.bigStatValueRow}>
          <ThemedText
            style={styles.bigStatValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </ThemedText>
          {delta ? <Badge label={delta} tone={deltaTone} /> : null}
        </View>
        {caption ? (
          <ThemedText type="small" themeColor="textSecondary">
            {caption}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/**
 * A pastel stat tile — the reference's Weight / Lost Weight / Total Calories row. Give adjacent tiles
 * different `pastel` names; they're designed to sit side by side in a flex row.
 */
export function StatTile({
  icon,
  value,
  label,
  pastel = "lilac",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  pastel?: PastelName;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const p = Pastels[pastel];
  const body = (
    <View style={[styles.statTile, { backgroundColor: p.bg }]}>
      <View style={[styles.statTileIcon, { backgroundColor: theme.card }]}>
        <Ionicons name={icon} size={18} color={p.ink} />
      </View>
      <ThemedText
        style={[styles.statTileValue, { color: p.ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </ThemedText>
      <ThemedText
        style={[styles.statTileLabel, { color: p.ink }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

/** An evenly-divided metric row (the reference's Heart / SpO₂ / Kcal strip). */
export function MetricStrip({
  items,
}: {
  items: {
    icon: keyof typeof Ionicons.glyphMap;
    value: string;
    label: string;
    tone?: "accent" | "success" | "warning" | "danger" | "info";
  }[];
}) {
  const theme = useTheme();
  return (
    <View style={styles.metricStrip}>
      {items.map((it, i) => (
        <View key={it.label} style={styles.metricItemWrap}>
          {i > 0 ? (
            <View
              style={[styles.metricDivider, { backgroundColor: theme.border }]}
            />
          ) : null}
          <View style={styles.metricItem}>
            <IconBadge icon={it.icon} tone={it.tone ?? "accent"} size={44} />
            <ThemedText
              style={styles.metricValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {it.value}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
            >
              {it.label}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

/** A pill segmented control (Activity / Body data / Food progress). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.segments, { backgroundColor: theme.card }, Shadow.subtle]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              active && { backgroundColor: theme.accent },
            ]}
          >
            <ThemedText
              style={{
                fontFamily: active ? Font.semibold : Font.medium,
                fontSize: 13.5,
                color: active ? theme.accentText : theme.textSecondary,
              }}
              numberOfLines={1}
            >
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A rounded-cap bar chart. The selected bar fills with the accent and carries a dot cap; the rest are
 * soft wells. Values are normalised against the max, so callers just pass raw numbers.
 */
export function BarChart({
  data,
  selectedIndex,
  onSelect,
  height = 180,
  formatValue,
}: {
  /** `label` is the compact axis tick; `tipLabel` (if given) is the full name shown in the tooltip. */
  data: { label: string; value: number; tipLabel?: string }[];
  selectedIndex?: number;
  onSelect?: (i: number) => void;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const theme = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={[styles.chartRow, { height }]}>
        {data.map((d, i) => {
          const active = i === selectedIndex;
          const pct = Math.max(0.06, d.value / max);
          return (
            <Pressable
              key={d.label}
              onPress={onSelect ? () => onSelect(i) : undefined}
              style={styles.chartCol}
            >
              <View
                style={[styles.chartTrack, { backgroundColor: theme.well }]}
              >
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${pct * 100}%`,
                      backgroundColor: active
                        ? theme.accent
                        : withAlpha(theme.accent, 0.28),
                    },
                  ]}
                >
                  {active ? (
                    <View
                      style={[styles.chartDot, { backgroundColor: theme.card }]}
                    />
                  ) : null}
                </View>
              </View>
              <ThemedText
                style={{
                  fontSize: 11.5,
                  fontFamily: active ? Font.semibold : Font.medium,
                  color: active ? theme.text : theme.muted,
                }}
              >
                {d.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {typeof selectedIndex === "number" && data[selectedIndex] ? (
        <View
          style={[
            styles.chartTip,
            { backgroundColor: theme.nav },
            Shadow.lifted,
          ]}
        >
          <ThemedText
            style={{
              color: theme.navText,
              fontFamily: Font.semibold,
              fontSize: 13,
            }}
          >
            {data[selectedIndex].tipLabel ?? data[selectedIndex].label}
          </ThemedText>
          <View
            style={[styles.chartTipRule, { backgroundColor: theme.navMuted }]}
          />
          <ThemedText
            style={{
              color: theme.navText,
              fontFamily: Font.bold,
              fontSize: 13,
            }}
          >
            {formatValue
              ? formatValue(data[selectedIndex].value)
              : data[selectedIndex].value.toLocaleString()}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = "accent",
  size = "md",
  disabled,
  loading,
  icon,
  chevron,
}: {
  label: string;
  onPress?: () => void;
  tone?: "accent" | "danger" | "plain";
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  /** Leading icon shown in a soft circular badge (reference-style CTA). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing chevron (reference-style CTA). */
  chevron?: boolean;
}) {
  const theme = useTheme();
  const bg =
    tone === "plain"
      ? theme.card
      : tone === "danger"
        ? theme.danger
        : theme.accent;
  const fg = tone === "plain" ? theme.text : theme.accentText;
  const isSm = size === "sm";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSm && styles.buttonSm,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        tone !== "plain" && Shadow.subtle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? (
            <View
              style={[
                styles.btnBadge,
                {
                  backgroundColor:
                    tone === "plain"
                      ? theme.accentSoft
                      : "rgba(255,255,255,0.22)",
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={15}
                color={tone === "plain" ? theme.accent : fg}
              />
            </View>
          ) : null}
          <ThemedText
            numberOfLines={1}
            style={{
              color: fg,
              fontFamily: Font.semibold,
              fontSize: isSm ? 14 : 15.5,
              flexShrink: 1,
            }}
          >
            {label}
          </ThemedText>
          {chevron ? (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={fg}
              style={{ marginLeft: 2 }}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/** A theme-aware text input sitting in a soft well. */
export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.muted}
      {...props}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.well },
        noWebOutline,
        props.style,
      ]}
    />
  );
}

/** A rounded pill search field. */
export function SearchBar(props: TextInputProps & { placeholder?: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.searchBar, { backgroundColor: theme.card }, Shadow.subtle]}
    >
      <Ionicons name="search-outline" size={18} color={theme.muted} />
      <TextInput
        placeholderTextColor={theme.muted}
        {...props}
        style={[
          styles.searchInput,
          { color: theme.text },
          noWebOutline,
          props.style,
        ]}
      />
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.centre}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.centre}>
      <IconBadge icon="alert-circle" tone="danger" size={52} />
      <ThemedText
        type="smallBold"
        themeColor="danger"
        style={{ textAlign: "center" }}
      >
        {message}
      </ThemedText>
      {onRetry ? (
        <View style={{ marginTop: Spacing.two }}>
          <Button label="Try again" tone="plain" size="sm" onPress={onRetry} />
        </View>
      ) : null}
      <View style={{ height: 0, backgroundColor: theme.background }} />
    </View>
  );
}

export function Empty({
  message,
  icon = "file-tray-outline",
}: {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.centre}>
      <IconBadge icon={icon} tone="muted" size={52} />
      <ThemedText themeColor="textSecondary" style={{ textAlign: "center" }}>
        {message}
      </ThemedText>
    </View>
  );
}

/** Cents → `$1,234.50`. */
export function formatMoney(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  return `$${v.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Cents → short `$1.2k` / `$3.4M` for tight dashboard tiles. */
export function formatMoneyCompact(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${v.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

const styles = StyleSheet.create({
  screenContent: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    flexGrow: 1,
  },
  inner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    gap: Spacing.three,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  headerTitle: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  detailTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Font.semibold,
    fontSize: 17,
  },
  detailRight: { minWidth: 44, alignItems: "flex-end" },

  card: {
    borderRadius: Radius.xl,
    padding: Spacing.three + 2,
    gap: Spacing.two,
  },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: Font.semibold,
    fontSize: 17,
    letterSpacing: -0.2,
  },

  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingVertical: 5,
  },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: 11,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },

  bigStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  bigStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  bigStatValue: {
    fontFamily: Font.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.4,
  },

  statTile: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three - 2,
    gap: 6,
    minHeight: 118,
    justifyContent: "space-between",
  },
  statTileIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statTileValue: { fontFamily: Font.bold, fontSize: 24, letterSpacing: -0.8 },
  statTileLabel: { fontFamily: Font.medium, fontSize: 12, opacity: 0.75 },

  metricStrip: { flexDirection: "row", alignItems: "center" },
  metricItemWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 46,
    marginRight: -1,
  },
  metricItem: { flex: 1, alignItems: "center", gap: 5 },
  metricValue: { fontFamily: Font.bold, fontSize: 21, letterSpacing: -0.5 },

  segments: {
    flexDirection: "row",
    borderRadius: Radius.pill,
    padding: 5,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    height: "100%",
    justifyContent: "flex-end",
  },
  chartTrack: {
    flex: 1,
    width: "100%",
    maxWidth: 30,
    borderRadius: Radius.pill,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    borderRadius: Radius.pill,
    alignItems: "center",
    paddingTop: 6,
  },
  chartDot: { width: 8, height: 8, borderRadius: Radius.pill },
  chartTip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  chartTipRule: { width: StyleSheet.hairlineWidth, height: 14, opacity: 0.5 },

  button: {
    borderRadius: Radius.pill,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  buttonSm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 40 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnBadge: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },

  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.three,
    minHeight: 220,
  },

  input: {
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 52,
    fontFamily: Font.medium,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    height: 52,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, fontFamily: Font.medium },
});

// ---------------------------------------------------------------------------------------------
// Prototype primitives (card 302). Mapped 1:1 from design/prototype.html — see design/DESIGN_SYSTEM.md
// for the component table. Screens assemble from these; they never restyle them inline.
// ---------------------------------------------------------------------------------------------

/**
 * A vehicle's registration plate. Black-and-yellow because in the prototype a plate is a recognisable
 * OBJECT, not a text label — on a board of twelve jobs it is what the eye lands on first. Monospaced
 * and uppercased so plates of different lengths still line up in a column.
 */
export function RegoPlate({
  rego,
  style,
}: {
  rego: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[protoStyles.rego, style]}>
      <ThemedText
        style={{
          color: Rego.text,
          fontFamily: Font.bold,
          fontSize: 12,
          letterSpacing: 0.6,
          ...(Platform.OS === "web" ? { fontVariant: ["tabular-nums"] } : null),
        }}
      >
        {rego.toUpperCase()}
      </ThemedText>
    </View>
  );
}

/**
 * Job state as a coloured pill. Takes the raw workflow state name and resolves the colour centrally,
 * so a screen can never invent its own mapping and drift from the rest of the app.
 */
export function StatusPill({
  state,
  style,
}: {
  state: string;
  style?: ViewStyle;
}) {
  const bg = statusColor(state);
  return (
    <View style={[protoStyles.statusPill, { backgroundColor: bg }, style]}>
      <ThemedText
        style={{ color: "#fff", fontFamily: Font.bold, fontSize: 11 }}
      >
        {state}
      </ThemedText>
    </View>
  );
}

/**
 * The role home hero. The gradient changes per role (owner navy / staff teal / tow magenta) so a worker
 * can tell at a glance which surface they're on — the prototype leans on this instead of a title bar.
 */
export function Hero({
  role = "owner",
  title,
  subtitle,
  right,
  children,
}: {
  role?: RoleName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const t = RoleTheme[role];
  return (
    <LinearGradient
      colors={[t.from, t.to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={protoStyles.hero}
    >
      <View style={protoStyles.heroRow}>
        <View style={{ flex: 1 }}>
          <ThemedText
            style={{ color: "#fff", fontFamily: Font.bold, fontSize: 19 }}
          >
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              style={{
                color: "rgba(255,255,255,0.72)",
                fontFamily: Font.medium,
                fontSize: 12.5,
              }}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
  );
}

/**
 * Confidence on an AI-drafted line. Banded rather than numeric: "0.62" means nothing to an estimator,
 * but amber-vs-green tells them instantly whether to check the line before pricing it.
 */
export function ConfBadge({ value }: { value: number | null | undefined }) {
  const band = confidenceBand(value);
  const c = Confidence[band];
  const label = value == null ? "—" : `${Math.round(value * 100)}%`;
  return (
    <View style={[protoStyles.conf, { backgroundColor: c.bg }]}>
      <ThemedText
        style={{ color: c.text, fontFamily: Font.bold, fontSize: 11 }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

/** An explanatory note. Blue, never red — this tells the user how something works, it isn't an error. */
export function Hintnote({ children }: { children: ReactNode }) {
  return (
    <View style={protoStyles.hintnote}>
      <ThemedText
        style={{ color: Hint.text, fontFamily: Font.medium, fontSize: 12.5 }}
      >
        {children}
      </ThemedText>
    </View>
  );
}

const protoStyles = StyleSheet.create({
  rego: {
    backgroundColor: Rego.bg,
    borderRadius: Radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 7,
    alignSelf: "flex-start",
  },
  statusPill: {
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 9,
    alignSelf: "flex-start",
  },
  hero: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    overflow: "hidden",
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.two },
  conf: {
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 7,
    alignSelf: "flex-start",
  },
  hintnote: {
    backgroundColor: Hint.bg,
    borderColor: Hint.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
});
