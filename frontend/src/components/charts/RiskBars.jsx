// src/components/charts/RiskBars.jsx - "How do all my checks compare?" (EVERY saved check).
// One horizontal bar per checked URL, sorted from highest to lowest phishing risk, with:
//   - the model's decision line (dashed, fixed), and
//   - a "what-if" line you can drag (mouse / touch / arrow keys): bars change colour as they cross it,
//     showing which URLs a stricter or looser line would flag.
// Built from the Week 8 React Showcase:
//   - sorted horizontal bars + d3.scaleBand: Interactive Charts -> MajorBars.jsx
//   - D3 calculates, React renders: D3 Fundamentals -> "React + D3 two ways" (BarsReactRenders.jsx)
//   - draggable threshold: Visualising ML Results -> Threshold explorer (useThresholdDrag.js)
//   - tooltip + "Show data table": d3-charts/demos/helpers/ChartTooltip.jsx, DataTable.jsx
import { useCallback, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

import useElementSize from '../../hooks/useElementSize.js'
import useThresholdDrag from '../../hooks/useThresholdDrag.js'
import { getPhishingProbability } from '../../utils/phishingRisk.js'
import ChartLegend from './ChartLegend.jsx'
import ChartTooltip from './ChartTooltip.jsx'
import { CHART_COLOURS, MODEL_THRESHOLD } from './chartSettings.js'

const ROW_HEIGHT = 30
const M = { top: 40, right: 20, bottom: 46 }   // left margin depends on the width (it holds the URL labels)
const pct = d3.format('.0%')
const verdictOf = (risk, line) => (risk >= line ? 'Phishing' : 'Benign')

// A short, readable label for a URL: no scheme or "www.", cut to fit the left margin
function shortUrl(url, max) {
  const text = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./i, '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Props:
 *   entries   - saved checks (history entries: { id, url, label, confidence / phishing_probability })
 *   threshold - the model's decision line 0-1
 */
export default function RiskBars({ entries, threshold = MODEL_THRESHOLD }) {
  const [ref, { width }] = useElementSize()
  const [whatIf, setWhatIf] = useState(threshold)
  const [hoverRow, setHoverRow] = useState(null)
  const [showTable, setShowTable] = useState(false)

  // One row per check, sorted riskiest first
  const rows = useMemo(() => entries
    .map((entry, index) => ({
      key: entry.id ?? `${entry.url}-${index}`, url: entry.url, risk: getPhishingProbability(entry),
      modelVerdict: entry.label === 'phishing' ? 'Phishing' : 'Benign',
    }))
    .sort((a, b) => b.risk - a.risk), [entries])

  // Layout: URL labels on the left (narrower on phones), bars on the right
  const left = Math.round(Math.min(220, Math.max(110, width * 0.3)))
  const labelChars = Math.floor((left - 12) / 7)                     // roughly 7px per character at 12px
  const height = M.top + rows.length * ROW_HEIGHT + M.bottom
  const plotRight = Math.max(left + 1, width - M.right)
  const plotBottom = height - M.bottom

  // Scales: x = risk -> pixels, y = one band per URL (d3.scaleBand, as in MajorBars.jsx)
  const x = useMemo(() => d3.scaleLinear([0, 1], [left, plotRight]), [left, plotRight])
  const y = d3.scaleBand(rows.map((r) => r.key), [M.top, plotBottom]).paddingInner(0.25).paddingOuter(0.15)

  // The drag / tap / keyboard behaviour (a custom hook - see useThresholdDrag.js). Rounded to whole percent.
  const changeWhatIf = useCallback((value) => setWhatIf(Math.round(value * 100) / 100), [])
  const { overlayRef, handleRef, dragging, handleSurfaceClick, handleKeyDown } = useThresholdDrag(x, whatIf, changeWhatIf)

  function handlePointerMove(event) {
    const [, py] = d3.pointer(event.nativeEvent, event.currentTarget.ownerSVGElement)
    const index = Math.floor((py - M.top) / y.step())
    setHoverRow(index >= 0 && index < rows.length ? index : null)
  }

  // The numbers the chart is about
  const flaggedByModel = rows.filter((r) => r.risk >= threshold).length
  const flaggedByWhatIf = rows.filter((r) => r.risk >= whatIf).length
  const change = flaggedByWhatIf - flaggedByModel
  const tx = x(whatIf)
  const hovered = hoverRow !== null && !dragging ? rows[hoverRow] : null

  return (
    <Box component="figure" sx={{ m: 0 }}>
      <Typography component="figcaption" variant="h6">How do all my checks compare?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Every checked URL, riskiest first. Drag the what-if line (or focus it and use the arrow keys) to see which URLs
        a different decision line would flag.
      </Typography>
      <ChartLegend items={[
        { name: `Benign at the what-if line (${rows.length - flaggedByWhatIf})`, colour: CHART_COLOURS.benign },
        { name: `Phishing at the what-if line (${flaggedByWhatIf})`, colour: CHART_COLOURS.phishing },
        { name: `Model decision line (${pct(threshold)})`, colour: CHART_COLOURS.muted, dashed: true },
      ]} />

      <Box ref={ref} sx={{ position: 'relative', mt: 1 }}>
        {width > 0 && (
          <svg width={width} height={height} role="group"
            aria-label={`Bar chart of ${rows.length} checked URLs sorted by phishing risk. ${flaggedByModel} are at or above the model's ${pct(threshold)} line. At a what-if line of ${pct(whatIf)}, ${flaggedByWhatIf} would be flagged.`}>
            {/* Everything right of the what-if line would be flagged as phishing (a neutral wash) */}
            <rect x={tx} y={M.top} width={Math.max(0, plotRight - tx)} height={plotBottom - M.top}
              style={{ fill: CHART_COLOURS.text, opacity: 0.05 }} />

            {/* Grid + x axis (risk) */}
            {x.ticks(width < 520 ? 5 : 10).map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={M.top} y2={plotBottom} style={{ stroke: CHART_COLOURS.grid }} />
                <text x={x(t)} y={plotBottom + 16} textAnchor="middle" fontSize={11} style={{ fill: CHART_COLOURS.muted }}>{pct(t)}</text>
              </g>
            ))}
            <text x={(left + plotRight) / 2} y={height - 6} textAnchor="middle" fontSize={12} style={{ fill: CHART_COLOURS.muted }}>
              Phishing risk (the model's predicted probability)
            </text>

            {/* One row per URL: label on the left, bar coloured by its verdict at the what-if line, value at the end */}
            {rows.map((r, index) => {
              const top = y(r.key)
              const barEnd = x(r.risk)
              const whatIfVerdict = verdictOf(r.risk, whatIf)
              const changed = whatIfVerdict !== r.modelVerdict           // the what-if line flips this URL's verdict
              const valueInside = plotRight - barEnd < 70                 // no room after the bar -> write inside it
              return (
                <g key={r.key}>
                  {hoverRow === index && !dragging && (
                    <rect x={0} y={top - (y.step() - y.bandwidth()) / 2} width={plotRight} height={y.step()}
                      style={{ fill: CHART_COLOURS.text, opacity: 0.06 }} />
                  )}
                  <text x={left - 8} y={top + y.bandwidth() / 2} dy="0.32em" textAnchor="end" fontSize={12}
                    style={{ fill: CHART_COLOURS.text }}>{shortUrl(r.url, labelChars)}</text>
                  <rect x={left} y={top} width={Math.max(2, barEnd - left)} height={y.bandwidth()} rx={2}
                    strokeWidth={changed ? 2 : 0} strokeDasharray={changed ? '4 3' : undefined}
                    style={{ fill: whatIfVerdict === 'Phishing' ? CHART_COLOURS.phishing : CHART_COLOURS.benign, stroke: CHART_COLOURS.text }} />
                  <text x={valueInside ? barEnd - 6 : barEnd + 6} y={top + y.bandwidth() / 2} dy="0.32em"
                    textAnchor={valueInside ? 'end' : 'start'} fontSize={12} fontWeight={600}
                    style={{ fill: valueInside ? CHART_COLOURS.paper : CHART_COLOURS.text }}>
                    {pct(r.risk)}{changed ? ' *' : ''}
                  </text>
                </g>
              )
            })}
            <line x1={left} x2={left} y1={M.top} y2={plotBottom} style={{ stroke: CHART_COLOURS.muted }} />

            {/* The model's decision line (fixed) */}
            <line x1={x(threshold)} x2={x(threshold)} y1={M.top} y2={plotBottom} strokeDasharray="5 4" strokeWidth={2}
              style={{ stroke: CHART_COLOURS.muted }} />

            {/* The drag surface: the whole plot area (a big, forgiving hit target). A tap moves the line too. */}
            <rect ref={overlayRef} x={left} y={M.top} width={Math.max(0, plotRight - left)} height={plotBottom - M.top}
              style={{ fill: 'transparent', cursor: 'ew-resize' }}
              onPointerMove={handlePointerMove} onPointerLeave={() => setHoverRow(null)} onClick={handleSurfaceClick} />

            {/* The what-if line + handle - focusable, works with the arrow keys */}
            <g ref={handleRef} transform={`translate(${tx},0)`} tabIndex={0} role="slider" style={{ cursor: 'ew-resize' }}
              aria-label="What-if decision line" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(whatIf * 100)}
              aria-valuetext={`${pct(whatIf)}: ${flaggedByWhatIf} URLs flagged`} onKeyDown={handleKeyDown}>
              <line y1={M.top - 6} y2={plotBottom} strokeWidth={2} style={{ stroke: CHART_COLOURS.text }} />
              <rect x={-44} y={M.top - 30} width={88} height={24} rx={12} style={{ fill: CHART_COLOURS.text }} />
              <text y={M.top - 14} textAnchor="middle" fontSize={12} fontWeight={700} style={{ fill: CHART_COLOURS.paper }}>
                What-if {pct(whatIf)}
              </text>
            </g>
          </svg>
        )}

        <ChartTooltip width={width} tip={hovered && {
          x: Math.min(x(hovered.risk), plotRight), y: y(hovered.key),
          title: hovered.url,
          rows: [
            { label: 'Phishing risk', value: pct(hovered.risk), colour: hovered.modelVerdict === 'Phishing' ? CHART_COLOURS.phishing : CHART_COLOURS.benign },
            { label: `Model verdict (${pct(threshold)})`, value: hovered.modelVerdict },
            { label: `What-if verdict (${pct(whatIf)})`, value: verdictOf(hovered.risk, whatIf) },
          ],
        }} />
      </Box>

      {/* The answer in words (read out by screen readers as the line moves) */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, mt: 1 }}>
        <Typography variant="body2" aria-live="polite" sx={{ flex: 1 }}>
          Model line ({pct(threshold)}): <strong>{flaggedByModel} of {rows.length}</strong> flagged as phishing.
          What-if line ({pct(whatIf)}): <strong>{flaggedByWhatIf}</strong> would be flagged
          {change !== 0 && ` (${change > 0 ? '+' : ''}${change})`}.
          {change !== 0 && ' * = verdict changes at the what-if line.'}
        </Typography>
        <Button size="small" onClick={() => setWhatIf(threshold)} disabled={whatIf === threshold}>Reset what-if line</Button>
        <Button size="small" onClick={() => setShowTable((shown) => !shown)} aria-expanded={showTable}>
          {showTable ? 'Hide data table' : 'Show data table'}
        </Button>
      </Stack>

      {/* The same data as a table (accessible alternative to the chart, like Week 8's DataTable) */}
      {showTable && (
        <TableContainer sx={{ mt: 1, maxHeight: 320 }}>
          <Table size="small" stickyHeader aria-label="Checked URLs by phishing risk">
            <TableHead>
              <TableRow>
                <TableCell>URL</TableCell>
                <TableCell align="right">Phishing risk</TableCell>
                <TableCell>Model verdict ({pct(threshold)})</TableCell>
                <TableCell>What-if verdict ({pct(whatIf)})</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{r.url}</TableCell>
                  <TableCell align="right">{pct(r.risk)}</TableCell>
                  <TableCell>{r.modelVerdict}</TableCell>
                  <TableCell>{verdictOf(r.risk, whatIf)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
