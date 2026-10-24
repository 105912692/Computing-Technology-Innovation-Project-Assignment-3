// src/pages/login.jsx - the login page (shown at /login, see App.jsx).
// Based on the Week 8 React Showcase LoginForm (pages/fullstack-auth/demos/LoginForm.jsx), without the
// demo-only parts (demo accounts, brute-force simulation, request preview) and built with MUI like the rest of the app.
//
// - The form sends POST /api/login through login() in context/AuthContext.jsx, which keeps the token.
// - 401: wrong email OR password (the server deliberately doesn't say which).
// - 429: too many attempts from this computer (5 per minute, backend/app/rate_limit.py).
import { useRef, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton, InputAdornment, Link, Stack, TextField,
  Typography,
} from '@mui/material'
import { Eye, EyeOff, LogIn } from 'lucide-react'

import { useAuth } from '../context/AuthContext.jsx'
import { emailError } from '../utils/accountRules.js'

export default function LoginPage() {
  const { user, login, logout, notice } = useAuth()   // notice: e.g. "Your session has expired" (cleared by the next login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})       // { email, password } shown under each field
  const [error, setError] = useState(null)       // { status, message } from the back end
  const [sending, setSending] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  function browserErrors() {
    const found = {}
    const emailProblem = emailError(email)
    if (emailProblem) found.email = emailProblem
    if (!password) found.password = 'Enter your password.'
    return found
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    const found = browserErrors()
    setErrors(found)
    if (found.email) return emailRef.current?.focus()          // keyboard and screen-reader users land on the problem
    if (found.password) return passwordRef.current?.focus()

    setSending(true)
    try {
      await login(email.trim(), password, { remember })
      setPassword('')                                           // never keep a password around longer than needed
      navigate('/')
    } catch (err) {
      setError({ status: err.status, message: err.message })    // "Incorrect email or password" / "Too many attempts..."
      passwordRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  // Already logged in: no form, just say so.
  if (user) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 420, mx: 'auto' }}>
        <Typography variant="h4" component="h1">Log in</Typography>
        <Alert severity="success">You are logged in as {user.user_name} ({user.user_email}).</Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" component={RouterLink} to="/">Go to home</Button>
          <Button onClick={() => logout()}>Log out</Button>
        </Stack>
      </Stack>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ maxWidth: 420, mx: 'auto' }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">Log in</Typography>

        {notice && <Alert severity="info">{notice}</Alert>}

        <TextField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((current) => ({ ...current, email: undefined })) }}
          error={Boolean(errors.email) || error?.status === 401}
          helperText={errors.email || ' '}
          autoComplete="username"
          inputRef={emailRef}
          disabled={sending}
          required
          fullWidth
        />

        <TextField
          id="login-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((current) => ({ ...current, password: undefined })) }}
          error={Boolean(errors.password) || error?.status === 401}
          helperText={errors.password || ' '}
          autoComplete="current-password"
          inputRef={passwordRef}
          disabled={sending}
          required
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    edge="end"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label="Keep me logged in on this tab (until it closes or the login expires)"
        />

        {/* role="alert" (MUI Alert's default): screen readers announce the error as soon as it appears */}
        {error && <Alert severity={error.status === 429 ? 'warning' : 'error'}>{error.message}</Alert>}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={sending}
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <LogIn size={18} aria-hidden="true" />}
        >
          {sending ? 'Logging in…' : 'Log in'}
        </Button>

        <Typography variant="body2">
          No account yet? <Link component={RouterLink} to="/signup">Sign up</Link>
        </Typography>
      </Stack>
    </Box>
  )
}
