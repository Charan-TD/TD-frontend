/**
 * Design tokens: the single TypeScript source for values shared by MUI-styled
 * components (`sx`) and the MUI theme.
 *
 * Rules
 * - Do not hard-code a colour that has a token here. Import `colors`.
 * - Variables in `:root` of `globals.css` that appear in `cssVariableTokens`
 *   must keep the same value; `tests/design-tokens.test.cjs` fails if they drift.
 * - Values below were captured from the code as it was (no visual change).
 *   Choosing ONE brand orange is a design decision still to be made: see
 *   `legacyOranges`.
 */

export const colors = {
  // Surfaces
  surface: "#fff",
  surfaceMuted: "#f3f5f8",

  // Text
  ink: "#202b3d",
  inkSoft: "#38455c",
  muted: "#647089",
  mutedStrong: "#56627a",

  // Borders
  line: "#dfe4eb",
  lineHover: "#c8d0dc",
  lineStrong: "#b9c2d0",

  // Primary action (dark slate buttons, selected pagination and tabs)
  slate: "#1e293b",
  slateHover: "#29364a",

  // Status
  success: "#16834a",
  successWash: "#eaf7ef",
  danger: "#cf4141",
  dangerStrong: "#c93636",
  dangerWash: "#fff0ef",
  warning: "#946200",
  warningWash: "#fff6df",

  // Brand orange. These are the values users actually see: the LAST `:root`
  // block in globals.css overrides --orange, --orange-deep and --orange-wash.
  orange: "#ee5b00",
  orangeDeep: "#c94c00",
  orangeWash: "#fff0e6",
} as const;

/**
 * Oranges that are hard-coded in places today and differ from the brand orange.
 * They are kept so nothing changes visually. Retire them by picking one brand
 * orange and replacing these with it.
 */
export const legacyOranges = {
  /** MUI theme primary (rarely visible: most MUI parts are styled by `sx`). */
  muiPrimary: "#ff5a0a",
  muiPrimaryDark: "#e84e00",
  muiPrimaryLight: "#fff1e8",
  /** Focus border of the list search box (the range select uses `colors.orange`). */
  focusSearch: "#ff6b21",
} as const;

/** Mirrors `--radius-1..4` in globals.css (defined in its last `:root` block). */
export const radii = {
  1: 6,
  2: 8,
  3: 12,
  4: 16,
} as const;

/** Spacing scale in px (4px base). Mirrors `--space-*` in globals.css. */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

/**
 * Breakpoint scale for NEW responsive rules (max-width, desktop-first).
 * Use these four. `legacyBreakpoints` are values that already exist in
 * `globals.css`; they stay until each screen is reviewed, but no new values
 * may be added (enforced by `tests/design-tokens.test.cjs`).
 */
export const breakpoints = {
  sm: 560,
  md: 760,
  lg: 900,
  xl: 1100,
} as const;

export const legacyBreakpoints = [
  480, 600, 620, 640, 720, 820, 821, 901, 980, 1000, 1180, 1200, 1240, 1300, 1400, 1600, 1700,
] as const;

/** `:root` variables in globals.css that are mirrored here and must match. */
export const cssVariableTokens: Record<string, string> = {
  "--orange": colors.orange,
  "--orange-deep": colors.orangeDeep,
  "--orange-wash": colors.orangeWash,
  ...Object.fromEntries(Object.entries(spacing).map(([k, v]) => [`--space-${k}`, `${v}px`])),
  ...Object.fromEntries(Object.entries(radii).map(([k, v]) => [`--radius-${k}`, `${v}px`])),
};
