// src/components/layout/Layout.jsx - header, navigation and footer around every page
import { Outlet, Link as RouterLink } from 'react-router-dom'
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'

import ErrorBoundary from '../common/ErrorBoundary.jsx'

export default function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" component="header">
        <Toolbar component="nav" aria-label="Main">
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Phishing URL Detection
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">Home</Button>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="md" sx={{ py: 4, flex: 1 }}>
        {/* Fallback instead of a blank screen if a page crashes */}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Container>

      <Box component="footer" sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">COS30049 Assignment 3</Typography>
      </Box>
    </Box>
  )
}
