import { createTheme, Popover, Modal, Input } from "@mantine/core";

// Colour tokens from the redesign in issue #120. Each becomes a CSS variable
// (`--fl-page`, `--fl-ink`, ...) whose value follows the colour scheme.
export const tokens = {
  light: {
    page: "#E6E9EE",
    surface: "#FFFFFF",
    "surface-2": "#FAFBFC",
    subtle: "#F0F2F5",
    ink: "#171C26",
    muted: "#535B6B",
    border: "#CDD2DA",
    "input-border": "#A9B0BC",
    divider: "#E1E4EA",
    map: "#DCE4EA",
    grid: "#C3CED8",
    accent: "#DA111B",
    "accent-text": "#B30E17",
    "accent-tint": "#FDE7E8",
    "on-accent": "#FFFFFF",
  },
  dark: {
    page: "#0E1218",
    surface: "#181D27",
    "surface-2": "#1E2430",
    subtle: "#232A37",
    ink: "#ECEEF2",
    muted: "#A3ABB9",
    border: "#2E3645",
    "input-border": "#4A5466",
    divider: "#0B0E13",
    map: "#131A26",
    grid: "#222C3D",
    accent: "#DA111B",
    "accent-text": "#FF7A80",
    "accent-tint": "#3B1B20",
    "on-accent": "#FFFFFF",
  },
};

const toVars = (scheme) =>
  Object.fromEntries(
    Object.entries(scheme).map(([name, value]) => [`--fl-${name}`, value]),
  );

// Point Mantine's own colours at the tokens, so its components pick them up.
// Mantine paints cards, the header and panels with `body`, so that is the
// surface. The page background itself is set in index.css.
const mantineVars = {
  "--mantine-color-body": "var(--fl-surface)",
  "--mantine-color-text": "var(--fl-ink)",
  "--mantine-color-dimmed": "var(--fl-muted)",
  "--mantine-color-placeholder": "var(--fl-muted)",
  "--mantine-color-default": "var(--fl-surface)",
  "--mantine-color-default-hover": "var(--fl-subtle)",
  "--mantine-color-default-border": "var(--fl-border)",
  "--mantine-color-anchor": "var(--fl-accent-text)",
};

export const resolver = () => ({
  variables: {},
  light: { ...toVars(tokens.light), ...mantineVars },
  dark: { ...toVars(tokens.dark), ...mantineVars },
});

export const theme = createTheme({
  primaryColor: "primary",
  // Shade 6 is the brand red in both schemes. Mantine's default would switch
  // to shade 8 in dark mode.
  primaryShade: 6,
  colors: {
    primary: [
      "#FFE9EA",
      "#FFD1D3",
      "#FCA2A6",
      "#F87077",
      "#F2464E",
      "#EC2A33",
      "#DA111B",
      "#B30E17",
      "#8F0B12",
      "#6B080D",
    ],
    // Mantine builds dark mode from this palette (dark-7 is its body, dark-6
    // its inputs, dark-4 its borders), so it follows the dark tokens.
    dark: [
      "#ECEEF2",
      "#C5CAD3",
      "#A3ABB9",
      "#7D8698",
      "#4A5466",
      "#2E3645",
      "#232A37",
      "#181D27",
      "#0E1218",
      "#0B0E13",
    ],
  },
  fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  fontFamilyMonospace: "'IBM Plex Mono', ui-monospace, monospace",
  headings: {
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontWeight: "600",
  },
  components: {
    // Select, DatePickerInput and Menu dropdowns render in a portal at the
    // popover z-index (300 by default). The flight edit modal sits at 1000
    // (see FlightsList), so dropdowns opened inside it rendered behind it.
    Popover: Popover.extend({ defaultProps: { zIndex: 1100 } }),
    // The fixed AppShell header sits at 400, so a modal at Mantine's default
    // (200) opened under it, hiding its title and close button on phones.
    Modal: Modal.extend({ defaultProps: { zIndex: 500 } }),
    Input: Input.extend({
      vars: (_theme, props) => ({
        wrapper: {
          // iOS Safari zooms in on any input under 16px when it gets focus,
          // and stays zoomed, which pushes modals off-screen.
          "--input-fz": "16px",
          // Inputs get a darker border than cards. Skipped on errors, so the
          // red error border still shows, and on borderless variants.
          ...(!props.error &&
            (props.variant ?? "default") === "default" && {
              "--input-bd": "var(--fl-input-border)",
            }),
        },
      }),
    }),
  },
});
