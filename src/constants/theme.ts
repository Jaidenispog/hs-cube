/**
 * OneStack design tokens — card 302.
 *
 * SOURCE OF TRUTH: `design/prototype.html` (live: https://autotech-demo.higgsfield.app) and the token
 * export `design/theme.ts` beside it. Values here are copied from that export, NOT eyeballed. If the
 * prototype and this file disagree, the prototype wins and this file is wrong.
 *
 * The look: navy + orange on a cool grey page. White cards, tight radii (8/12/16/18), a single soft
 * shadow, and a navy tab bar. Job state is carried by a fixed five-colour status set, and a vehicle is
 * always identified by a black-and-yellow rego plate.
 *
 * Everything visual comes from here. A screen that hardcodes a hex or a radius fails review.
 *
 * Key names are unchanged from the previous palette on purpose: 37 screens reference them, so this is a
 * value swap rather than a rename. New prototype-only concepts are added at the bottom.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#111826",
    textSecondary: "#5b6472",
    muted: "#888780",

    /** Cool off-white page behind the cards. */
    background: "#f4f6fa",
    /** White surfaces that sit on the page. */
    card: "#FFFFFF",
    backgroundElement: "#FFFFFF",
    /** Inset wells (inputs, inactive segments) — slightly darker than card. */
    well: "#eef1f6",
    backgroundSelected: "#ffe8dc",
    /** Kept for compatibility; the new look uses shadow, not borders. */
    border: "#e7ebf0",

    accent: "#FF6A2C",
    accentText: "#FFFFFF",
    accentSoft: "#ffe8dc",

    /** The navy tab bar (prototype `.tabs`). */
    nav: "#0F2340",
    navText: "#FFFFFF",
    navMuted: "#8ea0bb",

    success: "#10B981",
    successSoft: "#dff5ee",
    warning: "#F59E0B",
    warningSoft: "#fef1d6",
    danger: "#c23a1e",
    dangerSoft: "#fde2dc",
    info: "#3B82F6",
    infoSoft: "#DBE9FE",
  },
  /**
   * Dark is intentionally a near-mirror of light. The app currently locks to light (see use-theme),
   * but keeping the keys in sync means a screen can never reference a token that doesn't exist.
   */
  dark: {
    text: "#EDF0F7",
    textSecondary: "#A3AEC2",
    muted: "#6B7688",

    background: "#0B0E16",
    card: "#151A25",
    backgroundElement: "#151A25",
    well: "#1B2130",
    backgroundSelected: "#242C3B",
    border: "#232A39",

    accent: "#FF8A55",
    accentText: "#1a0d05",
    accentSoft: "rgba(255,106,44,0.18)",

    nav: "#0B1A30",
    navText: "#FFFFFF",
    navMuted: "#7A8296",

    success: "#34D399",
    successSoft: "rgba(95,191,114,0.18)",
    warning: "#FBBF24",
    warningSoft: "rgba(224,166,78,0.18)",
    danger: "#E86C7C",
    dangerSoft: "rgba(232,108,124,0.18)",
    info: "#5B8DEF",
    infoSoft: "rgba(91,141,239,0.18)",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

/**
 * Pastel fills for stat tiles — the reference's signature. Each pairs a soft background with an ink
 * dark enough to stay AA-legible on it. Cycle through them for adjacent tiles.
 */
export const Pastels = {
  lilac: { bg: "#DCDBF7", ink: "#3B3A8C" },
  salmon: { bg: "#F5CFC9", ink: "#8C3A31" },
  mint: { bg: "#CFE9D6", ink: "#2C6238" },
  sky: { bg: "#CFE0F7", ink: "#28527F" },
  sand: { bg: "#F3E3C3", ink: "#7A5A18" },
  blush: { bg: "#F2D3E6", ink: "#7E3564" },
} as const;

export type PastelName = keyof typeof Pastels;
export const PastelOrder: PastelName[] = [
  "lilac",
  "salmon",
  "sky",
  "mint",
  "sand",
  "blush",
];

/**
 * Prototype radii. Noticeably tighter than the previous look (which used 12/18/24/30) — this is the
 * single biggest visual change in card 302 and it is deliberate: the prototype reads as crisp and
 * businesslike, not soft. `xxl` is kept for the phone-frame only.
 */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 46,
  pill: 999,
} as const;

/**
 * Soft, diffuse elevation. The modern look leans on shadow instead of borders — `card` is the default
 * for surfaces, `lifted` for things that float above them (nav, tooltips, sheets).
 */
export const Shadow = {
  none: {},
  /** Prototype: `0 8px 22px rgba(16,35,64,.10)`. The only shadow on a resting surface. */
  card: {
    shadowColor: "#10233F",
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  lifted: {
    shadowColor: "#0B1020",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  subtle: {
    shadowColor: "#0B1020",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

/** 4pt base scale. `three` (16) is the default gutter. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Height of the floating pill nav + the gap under it — screens pad their scroll content by this. */
// 74 = 8pt padding + 30pt icon pill + 3pt gap + ~13pt label + 8pt padding, with room to spare.
export const TabBarHeight = 74;
export const TabBarBottomGap = Platform.select({ ios: 28, android: 16 }) ?? 16;
export const BottomTabInset = TabBarHeight + TabBarBottomGap + Spacing.three;
export const MaxContentWidth = 800;

// ---------------------------------------------------------------------------------------------
// Prototype-only concepts (card 302). These have no equivalent in the previous palette.
// ---------------------------------------------------------------------------------------------

/**
 * Job-state colours. FIXED — a job's state is the single most-scanned thing on every screen, so the
 * same state must be the same colour everywhere. Never pick one of these by hand; call `statusColor`.
 */
export const JobStatus = {
  booked: "#8b95a5",
  inProgress: "#F59E0B",
  ready: "#10B981",
  collected: "#3B82F6",
  towed: "#7c3aed",
} as const;

export type JobStatusName = keyof typeof JobStatus;

/** Map a workflow state name to its colour, tolerating case and spacing ('In Progress', 'in_progress'). */
export function statusColor(state: string | null | undefined): string {
  const key = (state ?? "").toLowerCase().replace(/[\s_-]/g, "");
  const table: Record<string, string> = {
    booked: JobStatus.booked,
    inprogress: JobStatus.inProgress,
    awaitingparts: JobStatus.inProgress,
    ready: JobStatus.ready,
    collected: JobStatus.collected,
    towed: JobStatus.towed,
  };
  return table[key] ?? JobStatus.booked;
}

/**
 * The rego plate. A vehicle is identified by its plate everywhere in the prototype, rendered as
 * black-and-yellow so it is findable at a glance on a busy board — it is a recognisable object, not
 * just a label, which is why it gets its own tokens rather than reusing text colours.
 */
export const Rego = { bg: "#111826", text: "#ffd23f" } as const;

/** Role home themes — the hero gradient changes per role so a worker knows which app they're in. */
export const RoleTheme = {
  owner: { from: "#0F2340", to: "#16325b", accent: "#FF6A2C" },
  staff: { from: "#0b3b34", to: "#12A594", accent: "#12A594" },
  tow: { from: "#3a2140", to: "#b5347e", accent: "#b5347e" },
} as const;

export type RoleName = keyof typeof RoleTheme;

/**
 * Confidence badges on AI drafts. Three bands, because a number alone ("0.62") means nothing to an
 * estimator — the colour is what tells them whether to trust the line or check it.
 */
export const Confidence = {
  hi: { bg: "#dff5ee", text: "#0b7a5e" },
  md: { bg: "#fef1d6", text: "#95610a" },
  lo: { bg: "#fde2dc", text: "#c23a1e" },
} as const;

/** Band a 0..1 confidence. Thresholds match the prototype's conf-hi / conf-md / conf-lo. */
export function confidenceBand(
  value: number | null | undefined,
): keyof typeof Confidence {
  if (value == null) return "md";
  if (value >= 0.8) return "hi";
  if (value >= 0.5) return "md";
  return "lo";
}

/** Informational note block (prototype `.hintnote`) — explains, never alarms. */
export const Hint = {
  bg: "#eef6ff",
  border: "#cfe4fb",
  text: "#2b5c86",
} as const;
