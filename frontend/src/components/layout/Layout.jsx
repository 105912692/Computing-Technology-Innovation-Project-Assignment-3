// src/components/layout/Layout.jsx - header, navigation and footer around every page
import { Suspense } from 'react'
import { Outlet, Link as RouterLink } from 'react-router-dom'
import { AppBar, Box, Button, CircularProgress, Container, IconButton, Toolbar, Tooltip, Typography } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'

import ErrorBoundary from '../common/ErrorBoundary.jsx'

// Shown while a page's code is downloading (usually only a moment, and only on the first visit)
function PageLoader() {
  return (
    <Box role="status" aria-label="Loading page" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  )
}

export default function Layout() {
  const { mode, systemMode, setMode } = useColorScheme()
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark'   // 'system' follows the OS setting
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" component="header">
        <Toolbar component="nav" aria-label="Main">
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Phishing URL Detection
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">Home</Button>
          <Tooltip title={label}>
            <IconButton color="inherit" onClick={() => setMode(isDark ? 'light' : 'dark')} aria-label={label}>
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="md" sx={{ py: 4, flex: 1 }}>
        {/* ErrorBoundary: fallback instead of a blank screen if a page crashes (or its code fails to download).
            Suspense: shows a spinner while a lazy-loaded page's code is downloading (see App.jsx). */}
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </Container>

      <Box component="footer" sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">COS30049 Assignment 3</Typography>
      </Box>
    </Box>
  )
}
