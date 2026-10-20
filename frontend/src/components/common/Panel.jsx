// src/components/common/Panel.jsx - a reusable box with a header, a body and an optional footer.
// Based on the Panel in the Week 8 React Showcase (pages/jsx/demos/Composition.jsx), restyled with MUI
// theme colours so it follows light and dark mode.
import { Box, Typography } from '@mui/material'

/**
 * A generic container. It doesn't know (or care) what goes inside it.
 *
 * Props:
 *   title    - text in the header
 *   icon     - optional icon shown before the title
 *   actions  - optional buttons on the right of the header
 *   footer   - optional content for the bottom bar
 *   children - whatever is placed between <Panel> and </Panel>
 */
export default function Panel({ title, icon, actions, footer, children, headerColor = 'action.hover', headerTextColor }) {
  return (
    <Box
      component="section"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        component="header"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.75,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: headerColor,
          color: headerTextColor,
        }}
      >
        <Typography variant="subtitle1" component="h2" sx={{ m: 0, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
          {icon}
          {title}
        </Typography>
        {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{actions}</Box>}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.75, flex: 1 }}>{children}</Box>

      {footer && (
        <Box
          component="footer"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: 1.75,
            py: 1.25,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {footer}
        </Box>
      )}
    </Box>
  )
}
