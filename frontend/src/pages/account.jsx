// src/pages/account.jsx - the logged-in user's account page (shown at /account, see App.jsx).
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'

import { deleteMe } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function AccountPage() {
  const { user, expiresAt, logout, authRequest } = useAuth()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Delete account: DELETE /api/me (through authRequest, so a 401 logs out), then log out and show the login page.
  // The back end deletes the account's saved checks too (cascade); copies in this browser's history are kept.
  async function handleDeleteAccount() {
    if (!window.confirm('Delete your account and all checks saved to it? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError('')
    try {
      await authRequest(deleteMe)
      logout('Your account has been deleted.')   // shown on the login page
      navigate('/login')
    } catch (error) {
      setDeleteError(error.message)              // e.g. "Cannot reach the server"
      setDeleting(false)
    }
  }

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

      {/* Danger zone: permanently delete the account */}
      {deleteError && <Alert severity="error">{deleteError}</Alert>}
      <Button
        variant="contained"
        color="error"
        onClick={handleDeleteAccount}
        disabled={deleting}
        startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : null}
        sx={{ alignSelf: 'flex-start' }}
      >
        {deleting ? 'Deleting…' : 'Delete account'}
      </Button>
    </Stack>
  )
}
