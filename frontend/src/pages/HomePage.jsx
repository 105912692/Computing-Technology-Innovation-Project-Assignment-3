// src/pages/HomePage.jsx - index page ("/"). For now it only shows that the front end can reach the back end.
import { useEffect, useState } from 'react'
import { Alert, Stack, Typography } from '@mui/material'

import { getHealth } from '../api/client.js'

export default function HomePage() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getHealth().then(setHealth).catch((e) => setError(e.message))
  }, [])

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">Home</Typography>
      {!health && !error && <Alert severity="info">Connecting to the back end...</Alert>}
      {health && <Alert severity="success">Back end connected (model: {health.model})</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  )
}
