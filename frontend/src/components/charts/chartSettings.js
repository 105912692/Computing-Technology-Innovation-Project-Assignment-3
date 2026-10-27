// src/components/charts/chartSettings.js - shared values for the charts on the Visualisations tab.

// The model's decision line. Must match "threshold" in backend/models/registry.json (risk >= this = phishing).
export const MODEL_THRESHOLD = 0.3

// MUI theme colours as CSS variables (theme.js sets cssVariables), so the charts follow light and dark mode.
export const CHART_COLOURS = {
  benign: 'var(--mui-palette-success-main)',
  careful: 'var(--mui-palette-warning-main)',
  phishing: 'var(--mui-palette-error-main)',
  text: 'var(--mui-palette-text-primary)',
  muted: 'var(--mui-palette-text-secondary)',
  grid: 'var(--mui-palette-divider)',
  paper: 'var(--mui-palette-background-paper)',
}
