// src/components/charts/ChartLegend.jsx - a row of colour swatches + names above a chart.
import { Box, Stack } from '@mui/material'

/**
 * Props:
 *   items - [{ name, colour, dashed? }] (dashed = a dashed line instead of a swatch)
 */
export default function ChartLegend({ items }) {
  return (
    <Stack component="ul" direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2, listStyle: 'none', p: 0, m: 0, fontSize: 13 }}>
      {items.map((item) => (
        <Box component="li" key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {item.dashed
            ? <Box sx={{ width: 18, borderTop: '2px dashed', borderColor: item.colour }} />
            : <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: item.colour }} />}
          {item.name}
        </Box>
      ))}
    </Stack>
  )
}
