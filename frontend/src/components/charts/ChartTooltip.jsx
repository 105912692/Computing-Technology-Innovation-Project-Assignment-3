// src/components/charts/ChartTooltip.jsx - the one tooltip both charts use.
// Based on the Week 8 React Showcase (src/pages/d3-charts/demos/helpers/ChartTooltip.jsx):
// D3 handles the pointer, React renders the tooltip. Text goes in as JSX, so data is never injected as HTML.
import { Box, Typography } from '@mui/material'

/**
 * Props:
 *   tip   - null (hidden) or { x, y, title, rows: [{ label, value, colour? }] } (x / y in pixels inside the chart)
 *   width - the chart's width, so the tooltip flips to the left near the right edge
 */
export default function ChartTooltip({ tip, width }) {
  if (!tip) return null
  const flip = tip.x > width / 2
  return (
    <Box
      aria-hidden="true"   // screen readers get the same values from the aria-label / data table instead
      sx={{
        position: 'absolute', left: tip.x, top: tip.y, zIndex: 1, pointerEvents: 'none',
        transform: flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
        bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 3,
        px: 1.25, py: 0.75, minWidth: 160, maxWidth: 280, fontSize: 13,
      }}
    >
      <Typography variant="caption" color="text.secondary" component="div">{tip.title}</Typography>
      {tip.rows.map((row) => (
        <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {row.colour && <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: row.colour, flexShrink: 0 }} />}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</Box>
          <Box component="strong" sx={{ ml: 'auto', pl: 1 }}>{row.value}</Box>
        </Box>
      ))}
    </Box>
  )
}
