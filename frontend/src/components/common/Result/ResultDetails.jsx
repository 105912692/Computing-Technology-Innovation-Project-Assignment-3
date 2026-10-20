// src/components/common/Result/ResultDetails.jsx - the details of one check: text on the left, confidence ring on the right.
// Used both in the HomePage Panel and inside the Result accordion.
import { Box, Typography } from '@mui/material'
import Progress from '../Progress/Progress.jsx'

export default function ResultDetails({ address, time, reasons, confidence, colour = 'primary' }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.25, alignItems: 'center', width: '100%' }}>
      <Typography component="div" sx={{ flex: '0 0 75%', color: 'text.primary' }}>
        Address: {address}
        <br />
        Time for result: {time}
        <br />
        Reasons for result:
        <br />
        {reasons}
      </Typography>

      <Progress value={confidence} label="Confidence" color={`var(--mui-palette-${colour}-main)`} />
    </Box>
  )
}