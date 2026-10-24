// src/pages/signup.jsx - the sign-up page (shown at /signup, see App.jsx).
// Based on the Week 8 React Showcase RegisterForm (pages/fullstack-auth/demos/RegisterForm.jsx), without the
// demo-only "check in the browser first" switch and response preview, and built with MUI like the rest of the app.
//
// - The browser checks are for a pleasant form; the back end checks again (schemas.py), because anyone can skip the browser.
// - Server errors land on the right field: 409 (email taken) and 422 (Pydantic) via ApiError.fieldErrors.
// - On success: log in automatically with the same details, then go home.
import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material'
import { UserPlus } from 'lucide-react'

import { signUp } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { NAME_MAX, PASSWORD_MAX, PASSWORD_MIN, emailError } from '../utils/accountRules.js'

const EMPTY = { user_name: '', user_email: '', password: '', confirm: '' }
const FIELD_ORDER = ['user_name', 'user_email', 'password', 'confirm']   // top to bottom, as on screen

export default function SignUpPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})            // { field: message }
  const [generalError, setGeneralError] = useState(null)
  const [sending, setSending] = useState(false)
  const [focusRequest, setFocusRequest] = useState(null)   // { field } - a new object every time

  // After a failed submit, move focus to the first field with an error. An effect, because the error text
  // only exists in the DOM after React has rendered this update.
  useEffect(() => {
    if (focusRequest) document.getElementById(`signup-${focusRequest.field}`)?.focus()
  }, [focusRequest])

  function showErrors(found) {
    setErrors(found)
    const first = FIELD_ORDER.find((field) => found[field])
    if (first) setFocusRequest({ field: first })
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      const next = { ...current }   // copy - never mutate state
      delete next[field]            // editing a field clears its error
      return next
    })
  }

  function browserErrors() {
    const found = {}
    const name = form.user_name.trim()
    if (!name) found.user_name = 'Enter a name.'
    else if (name.length > NAME_MAX) found.user_name = `Use at most ${NAME_MAX} characters.`
    const emailProblem = emailError(form.user_email)
    if (emailProblem) found.user_email = emailProblem
    if (form.password.length < PASSWORD_MIN) found.password = `Use at least ${PASSWORD_MIN} characters.`
    else if (form.password.length > PASSWORD_MAX) found.password = `Use at most ${PASSWORD_MAX} characters.`
    if (form.confirm !== form.password) found.confirm = 'The passwords do not match.'
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setGeneralError(null)
    const found = browserErrors()
    showErrors(found)
    if (Object.keys(found).length > 0) return   // don't bother the server

    setSending(true)
    try {
      const name = form.user_name.trim()
      const email = form.user_email.trim()
      await signUp(name, email, form.password)   // -> 201 Created
      await login(email, form.password)          // log in automatically with the same details
      setForm(EMPTY)
      navigate('/')
    } catch (err) {
      if (err.status === 409) showErrors({ user_email: err.message })          // "Email is already registered"
      else if (err.status === 422) showErrors(err.fieldErrors)                 // the back end's rules, on each field
      else setGeneralError(err.message)
    } finally {
      setSending(false)
    }
  }

  const fieldProps = (field) => ({
    id: `signup-${field}`,
    value: form[field],
    onChange: (e) => update(field, e.target.value),
    error: Boolean(errors[field]),
    disabled: sending,
    required: true,
    fullWidth: true,
  })

  if (user) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 420, mx: 'auto' }}>
        <Typography variant="h4" component="h1">Sign up</Typography>
        <Alert severity="info">You are already logged in as {user.user_name}.</Alert>
        <Button variant="contained" component={RouterLink} to="/" sx={{ alignSelf: 'flex-start' }}>Go to home</Button>
      </Stack>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ maxWidth: 420, mx: 'auto' }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">Sign up</Typography>

        <TextField {...fieldProps('user_name')} label="Name" autoComplete="nickname"
                   helperText={errors.user_name || `Up to ${NAME_MAX} characters`} />
        <TextField {...fieldProps('user_email')} label="Email" type="email" autoComplete="email"
                   helperText={errors.user_email || 'Used to log in'} />
        <TextField {...fieldProps('password')} label="Password" type="password" autoComplete="new-password"
                   helperText={errors.password || `At least ${PASSWORD_MIN} characters`} />
        <TextField {...fieldProps('confirm')} label="Confirm password" type="password" autoComplete="new-password"
                   helperText={errors.confirm || ' '} />

        {generalError && <Alert severity="error">{generalError}</Alert>}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={sending}
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <UserPlus size={18} aria-hidden="true" />}
        >
          {sending ? 'Creating account…' : 'Create account'}
        </Button>

        <Typography variant="body2">
          Already have an account? <Link component={RouterLink} to="/login">Log in</Link>
        </Typography>
      </Stack>
    </Box>
  )
}
