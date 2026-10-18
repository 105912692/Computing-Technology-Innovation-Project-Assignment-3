// src/pages/NotFoundPage.jsx - shown for any address that does not match a route (path="*" in App.jsx)
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Button, Stack, Typography } from '@mui/material'

export default function NotFoundPage() {
  const { pathname } = useLocation()   // shown as text, so React escapes it
  return (
    <Stack spacing={2} alignItems="flex-start">
      <Typography variant="overline">Error 404</Typography>
      <Typography variant="h4" component="h1">This page does not exist</Typography>
      <Typography color="text.secondary">Nothing is at {pathname}.</Typography>
      <Button variant="contained" component={RouterLink} to="/">Back to home</Button>
    </Stack>
  )
}
