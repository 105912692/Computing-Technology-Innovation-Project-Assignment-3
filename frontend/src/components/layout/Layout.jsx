// src/components/layout/Layout.jsx - header, navigation and footer around every page
import { Suspense } from 'react'
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom'
import { AppBar, Avatar, Box, Button, CircularProgress, Container, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useColorScheme, useTheme } from '@mui/material/styles'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { ArrowLeftRight, FileText, LogIn, LogOut, Menu, Moon, Sun, UserCog, UserPlus } from 'lucide-react'
import defaultAvatar from '../../assets/images/Default_pfp.svg'

import DropdownMenu from '../common/DropdownMenu/DropdownMenu.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
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
  const navigate = useNavigate()   // hooks are called here, at the top of the component, never inside other functions
  const { user, logout } = useAuth()
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark'   // 'system' follows the OS setting
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'))   // phones (under 600px): one menu instead of the icons

  // ---------- Account menu (avatar in the header) ----------
  // Each function runs when its menu item is chosen. Which items show depends on isLoggedIn (below).
  function handleManageAccount() {
    navigate('/account')
    // the account page shows the user from AuthContext (TODO there: delete account)
  }
  function handleLogin() {
    navigate('/login')   // the URL path, not the file: App.jsx maps /login to the login page
    // the login page calls login() in AuthContext (POST /api/login, then GET /api/me)
  }
  function handleSignUp() {
    navigate('/signup')
    // the sign-up page calls signUp() (POST /api/users), then logs in
  }
  function handleSwitchAccount() {
    logout()             // forget the current token, then log in as someone else
    navigate('/login')
  }
  function handleLogout() {
    logout()             // forget the token (context/AuthContext.jsx)
    navigate('/')        // back to the home page
  }

  const accountItems = [
    { id: 'manage', label: 'Manage account', icon: UserCog, onSelect: handleManageAccount },
    { id: 'login', label: 'Log in', icon: LogIn, onSelect: handleLogin },
    { id: 'signup', label: 'Sign up', icon: UserPlus, onSelect: handleSignUp },
    { id: 'switch', label: 'Switch account', icon: ArrowLeftRight, onSelect: handleSwitchAccount },
    { id: 'divider-1', divider: true },
    { id: 'logout', label: 'Log out', icon: LogOut, onSelect: handleLogout, danger: true },
  ]

  const isLoggedIn = Boolean(user)   // from AuthContext: set by the login page, cleared by log out or when the token expires
  const LOGGED_OUT = ['login', 'signup']
  const accountItemsShow = accountItems.filter((item) =>
    isLoggedIn ? !LOGGED_OUT.includes(item.id) : LOGGED_OUT.includes(item.id)
  )

  // Logged out: Log in, Sign up.
  // Logged in: Manage account, Switch account, the divider, Log out.

  // ---------- Phone menu ----------
  // On phones the Documents icon, theme toggle and avatar menu are all in ONE dropdown:
  // the page items first, then a line, then the account items in their own section (same items as the avatar menu).
  const mobileItems = [
    { id: 'documents', label: 'Documents', icon: FileText, onSelect: () => navigate('/documents') },
    { id: 'theme', label, icon: isDark ? Sun : Moon, onSelect: () => setMode(isDark ? 'light' : 'dark') },
    { id: 'divider-account', divider: true },
    ...accountItemsShow,
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" component="header">
        <Toolbar component="nav" aria-label="Main">
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            Phishing URL Detection
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">Home</Button>
          {isMobile ? (
            /* Phones: everything else in one dropdown (mobileItems above) */
            <DropdownMenu label={user ? `Menu (logged in as ${user.user_name})` : 'Menu'} items={mobileItems} align="right">
              <Menu size={24} aria-hidden="true" />
            </DropdownMenu>
          ) : (
            <>
              {/* Documents page (pages/Documents.jsx) */}
              <Tooltip title="Documents">
                <IconButton color="inherit" component={RouterLink} to="/documents" aria-label="Documents">
                  <FileText size={22} aria-hidden="true" />
                </IconButton>
              </Tooltip>
              <Tooltip title={label}>
                <IconButton color="inherit" onClick={() => setMode(isDark ? 'light' : 'dark')} aria-label={label}>
                  {isDark ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
              {/* Account menu: the avatar is the button; the items and their functions are defined above */}
              <DropdownMenu label={user ? `Account options (logged in as ${user.user_name})` : 'Account options'} items={accountItemsShow} align="right">
                <Avatar src={defaultAvatar} alt="" sx={{ width: 32, height: 32 }} />
              </DropdownMenu>
            </>
          )}
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
