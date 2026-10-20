// src/theme.js - the MUI theme for the whole app (light and dark colour schemes).
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  colorSchemes: { light: true, dark: true },   // MUI builds a dark palette for you
  cssVariables: { colorSchemeSelector: 'data' }, // also exposes colours as CSS variables (var(--mui-palette-...)) for .css files;
                                                 // 'data' lets the header toggle switch modes manually
})

export default theme