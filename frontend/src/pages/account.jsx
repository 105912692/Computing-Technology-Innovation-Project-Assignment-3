// src/pages/account.jsx - the logged-in user's account page (shown at /account, see App.jsx).
// TODO: "Delete account" button -> DELETE /api/me (through authRequest), then logout()
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Button, Stack, Typography } from '@mui/material'

import { useAuth } from '../context/AuthContext.jsx'

export default function AccountPage() {
  const { user, expiresAt, logout } = useAuth()

  if (!user) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 480 }}>
        <Typography variant="h4" component="h1">Manage account</Typography>
        <Alert severity="info">Log in to see your account.</Alert>
        <Button variant="contained" component={RouterLink} to="/login" sx={{ alignSelf: 'flex-start' }}>Log in</Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <Typography variant="h4" component="h1">Manage account</Typography>
      <Typography><strong>Name:</strong> {user.user_name}</Typography>
      <Typography><strong>Email:</strong> {user.user_email}</Typography>
      {expiresAt && (
        <Typography variant="body2" color="text.secondary">
          Logged in until {new Date(expiresAt).toLocaleTimeString()} (logins last 30 minutes).
        </Typography>
      )}
      <Button variant="outlined" color="error" onClick={() => logout()} sx={{ alignSelf: 'flex-start' }}>Log out</Button>
    </Stack>
  )
}
