// src/components/common/Result/ResultDetails.jsx - the details of one check: text on the left, phishing-risk ring on the right.
// Used both in the HomePage Panel and inside the Result accordion.
import { useState } from 'react'
import { Box, Divider, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Columns2, Gauge, ShieldCheck } from 'lucide-react'
import Progress from '../Progress/Progress.jsx'

// `risk` is the phishing probability as a percentage (0-100): the same scale for every result,
// so a higher number always means more phishing-like (see utils/phishingRisk.js).
// `confidence` is how sure the model is of its own label, as a percentage (0-100). For a phishing result it equals
// the score, so it is only shown (as a second ring) for benign results, where it is 100 - score.

const formatTime = (ms) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`)

// Benign results only: buttons to choose which ring(s) to show, in this order. Confidence is shown by default.
const VIEWS = [
  { value: 'both', name: 'Show both', icon: Columns2 },
  { value: 'confidence', name: 'Show confidence', icon: ShieldCheck },
  { value: 'score', name: 'Show score (phishing rate)', icon: Gauge },
]

export default function ResultDetails({ address, time, reasons, risk, confidence, label, colour = 'primary' }) {
  const isBenign = label === 'benign'
  const [view, setView] = useState('confidence')                      // benign only: 'both' | 'confidence' | 'score'
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'))   // phones: buttons go underneath, in a row

  const confidenceRing = { name: 'Confidence (Benign)', value: confidence }
  const scoreRing = { name: 'Score', value: risk }
  const rings = !isBenign ? [scoreRing]
    : view === 'both' ? [confidenceRing, scoreRing]
    : view === 'score' ? [scoreRing]
    : [confidenceRing]

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.25, alignItems: 'center', width: '100%', minWidth: 0 }}>
      {/* Text takes the remaining width and wraps; the ring keeps its own fixed size (see Progress.css).
          minWidth: 0 lets a flex item shrink below its longest word, and overflowWrap: 'anywhere' breaks
          long unbroken strings (e.g. URLs with no spaces) onto the next line instead of pushing the ring out. */}
      <Typography component="div" sx={{ flex: '1 1 0', minWidth: 0, overflowWrap: 'anywhere', color: 'text.primary' }}>
        Address: {address}
        {/* A line under the address: long URLs wrap over several lines, so this marks where the address ends */}
        <Divider sx={{ my: 1, borderBottomWidth: 2, borderColor: `${colour}.main`, opacity: 0.4, borderRadius: 1 }} />
        Phishing risk: {risk}%
        <br />
        Time for result: {time == null ? '--' : formatTime(time)}
        <br />
        Reasons for result:
        <br />
        {reasons || 'No extra reasons available yet.'}
      </Typography>

      {/* Rings + (benign only) the view buttons: buttons on the right, stacked vertically, on desktop;
          underneath in a row on phones. */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flex: '0 0 auto', width: { xs: '100%', sm: 'auto' } }}>
      {/* "Score" = the phishing rate (risk); benign results can also show their confidence.
          On phones (xs) each ring takes an equal share of the width and shrinks to fit it (container query:
          100cqi = the column's width); they only stack below 76px per column. From sm up each column is 112px.
          --size is read by Progress.css. */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: { xs: 1, sm: 2 }, flex: '0 0 auto', width: { xs: '100%', sm: 'auto' } }}>
        {rings.map((ring) => (
          <Box key={ring.name} sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
            flex: { xs: '1 1 0', sm: '0 0 112px' }, minWidth: 76, maxWidth: 112,
            containerType: 'inline-size', '& .progress': { '--size': 'min(100px, 100cqi)' },
          }}>
            <Progress value={ring.value} label={ring.name} color={`var(--mui-palette-${colour}-main)`} />
            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', color: `${colour}.main`, overflowWrap: 'normal', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {ring.name}
            </Typography>
          </Box>
        ))}
      </Box>

      {isBenign && (
        <ToggleButtonGroup
          size="small"
          exclusive
          orientation={isMobile ? 'horizontal' : 'vertical'}
          value={view}
          onChange={(event, next) => next && setView(next)}   // next is null when the selected button is clicked again: keep it
          aria-label="Choose which rings to show"
        >
          {VIEWS.map(({ value, name, icon: Icon }) => (
            <Tooltip key={value} title={name} placement={isMobile ? 'top' : 'left'}>
              <ToggleButton value={value} aria-label={name} sx={{ color: `${colour}.main` }}>
                <Icon size={18} aria-hidden="true" />
              </ToggleButton>
            </Tooltip>
          ))}
        </ToggleButtonGroup>
      )}
      </Box>
    </Box>
  )
}