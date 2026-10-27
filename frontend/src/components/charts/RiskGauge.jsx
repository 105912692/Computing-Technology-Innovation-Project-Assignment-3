// src/components/charts/RiskGauge.jsx - "How risky is this link?" (the CURRENT result).
// A 0-100% bar split into zones, a marker for this URL and the model's dashed decision line.
// Pattern from the Week 8 React Showcase (D3 Fundamentals -> "React + D3 two ways", BarsReactRenders.jsx):
// D3 calculates (d3.scaleLinear, ticks, format), React renders every SVG element.
import { useMemo, useState } from 'react'
import * as d3 from 'd3'
import { Box, Typography } from '@mui/material'

import useElementSize from '../../hooks/useElementSize.js'
import ChartLegend from './ChartLegend.jsx'
import ChartTooltip from './ChartTooltip.jsx'
import { CHART_COLOURS, MODEL_THRESHOLD } from './chartSettings.js'

const HEIGHT = 132
const M = { top: 44, right: 20, bottom: 44, left: 20 }   // space for the marker label (top) and axis (bottom)
const BAR_HEIGHT = HEIGHT - M.top - M.bottom
const pct = d3.format('.0%')                             // 0.473 -> "47%"

/**
 * Props:
 *   url       - the checked URL
 *   risk      - phishing probability 0-1
 *   label     - 'benign' | 'phishing' (the model's verdict)
 *   threshold - the decision line 0-1
 */
export default function RiskGauge({ url, risk, label, threshold = MODEL_THRESHOLD }) {
  const [ref, { width }] = useElementSize()
  const [tip, setTip] = useState(null)

  // The three zones of the bar (the first ends at the model's decision line)
  const zones = useMemo(() => [
    { from: 0, to: threshold, name: 'Looks safe', colour: CHART_COLOURS.benign },
    { from: threshold, to: 0.7, name: 'Be careful', colour: CHART_COLOURS.careful },
    { from: 0.7, to: 1, name: 'Likely phishing', colour: CHART_COLOURS.phishing },
  ], [threshold])

  const plotRight = Math.max(M.left + 1, width - M.right)
  const x = useMemo(() => d3.scaleLinear([0, 1], [M.left, plotRight]), [plotRight])
  const zone = zones.find((z) => risk < z.to) ?? zones[zones.length - 1]
  const verdict = label === 'phishing' ? 'Phishing' : 'Benign'
  const markerX = x(risk)
  // Keep the marker label inside the chart near the edges
  const anchor = markerX < M.left + 50 ? 'start' : markerX > plotRight - 50 ? 'end' : 'middle'

  return (
    <Box component="figure" sx={{ m: 0 }}>
      <Typography component="figcaption" variant="h6">How risky is this link?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', mb: 1 }}>{url}</Typography>
      <ChartLegend items={[
        ...zones.map((z) => ({ name: `${z.name} (${pct(z.from)}–${pct(z.to)})`, colour: z.colour })),
        { name: `Decision line (${pct(threshold)})`, colour: CHART_COLOURS.text, dashed: true },
      ]} />

      <Box ref={ref} sx={{ position: 'relative', mt: 1 }}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img"
            aria-label={`Phishing risk ${pct(risk)} (${zone.name}). The decision line is ${pct(threshold)}, so the model labels this URL ${verdict}.`}>
            {/* Zones: faded, so the marker stands out */}
            {zones.map((z) => (
              <rect key={z.name} x={x(z.from)} y={M.top} width={x(z.to) - x(z.from)} height={BAR_HEIGHT}
                style={{ fill: z.colour, opacity: 0.3 }}
                onPointerMove={(event) => setTip({
                  x: d3.pointer(event.nativeEvent, event.currentTarget.ownerSVGElement)[0], y: M.top,
                  title: z.name, rows: [{ label: 'Risk range', value: `${pct(z.from)}–${pct(z.to)}`, colour: z.colour }],
                })}
                onPointerLeave={() => setTip(null)} />
            ))}

            {/* x axis: 0% - 100% */}
            {x.ticks(width < 420 ? 5 : 10).map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={M.top + BAR_HEIGHT} y2={M.top + BAR_HEIGHT + 4} style={{ stroke: CHART_COLOURS.muted }} />
                <text x={x(t)} y={M.top + BAR_HEIGHT + 16} textAnchor="middle" fontSize={11} style={{ fill: CHART_COLOURS.muted }}>{pct(t)}</text>
              </g>
            ))}
            <text x={(M.left + plotRight) / 2} y={HEIGHT - 4} textAnchor="middle" fontSize={12} style={{ fill: CHART_COLOURS.muted }}>
              Phishing risk (the model's predicted probability)
            </text>

            {/* The model's decision line (dashed) */}
            <line x1={x(threshold)} x2={x(threshold)} y1={M.top - 6} y2={M.top + BAR_HEIGHT + 6}
              strokeDasharray="5 4" strokeWidth={2} style={{ stroke: CHART_COLOURS.text }} />

            {/* This URL: a line + dot + label, with a bigger invisible hit target for the tooltip */}
            <g onPointerMove={() => setTip({
                x: markerX, y: M.top,
                title: 'This URL',
                rows: [
                  { label: 'Phishing risk', value: pct(risk), colour: zone.colour },
                  { label: 'Zone', value: zone.name },
                  { label: 'Model verdict', value: verdict },
                ],
              })}
              onPointerLeave={() => setTip(null)}>
              <line x1={markerX} x2={markerX} y1={M.top - 10} y2={M.top + BAR_HEIGHT} strokeWidth={3} style={{ stroke: CHART_COLOURS.text }} />
              <circle cx={markerX} cy={M.top + BAR_HEIGHT / 2} r={7} strokeWidth={3}
                style={{ fill: zone.colour, stroke: CHART_COLOURS.paper }} />
              <text x={markerX} y={M.top - 16} textAnchor={anchor} fontSize={13} fontWeight={700} style={{ fill: CHART_COLOURS.text }}>
                This URL: {pct(risk)} · {verdict}
              </text>
              <rect x={markerX - 14} y={M.top - 30} width={28} height={BAR_HEIGHT + 30} style={{ fill: 'transparent' }} />
            </g>
          </svg>
        )}
        <ChartTooltip tip={tip} width={width} />
      </Box>
    </Box>
  )
}
