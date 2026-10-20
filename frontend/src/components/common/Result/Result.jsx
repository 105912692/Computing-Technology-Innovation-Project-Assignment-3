// src/components/common/Result/Result.jsx - one check's result: header row plus expandable details.
import { Box } from '@mui/material'
import Accordion from '../Accordion/Accordion.jsx'
import ResultDetails from './ResultDetails.jsx'

const COLOURS = {
  phishing:   { border: 'error.main',   background: 'error.main',   text: 'error.contrastText',   ring: 'error' },
  benign:     { border: 'success.main', background: 'success.main', text: 'success.contrastText', ring: 'success' },
}
const NEUTRAL = { border: 'divider', background: 'action.hover', text: 'text.primary', ring: 'primary' }
const resultColours = (label) => COLOURS[label] ?? NEUTRAL

export default function Result({ name, label, confidence, time, reasons }) {
  const colours = resultColours(label)
  const items = [{
    id: 'details',
    title: 'Details',
    content: <ResultDetails address={name} time={time} reasons={reasons} confidence={confidence} colour={colours.ring} />,
  }]

  return (
    <Box sx={{ border: 2, borderColor: colours.border, borderRadius: 3, overflow: 'hidden', margin: 3 }}>
      <Box sx={{ display: 'flex', p: 1.25, bgcolor: colours.background, color: colours.text }}>
        <Box sx={{ flex: 1, p: 1.25 }}>{name}</Box>
        <Box sx={{ flex: 1, p: 1.25, textAlign: 'right' }}>{label}</Box>
      </Box>

      <Accordion items={items}/>
      {/* <Accordion items={items} defaultOpen={['details']} /> */}
    </Box>
  )
}