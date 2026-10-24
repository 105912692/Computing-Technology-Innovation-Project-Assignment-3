// src/context/AuthContext.jsx - ONE place in the app that knows who is logged in.
// Based on the Week 8 React Showcase (pages/fullstack-auth/AuthContext.jsx), with the demo-only parts
// (demo accounts, custom token lifetimes, toasts) left out and adapted to this back end
// (JSON login with user_email, the user comes from GET /api/me).
//
//   <AuthProvider> ... </AuthProvider>     wraps the app in main.jsx
//   const { user, token, login, logout, authRequest } = useAuth()
//
// Why a context? The header menu, the login page, the account page ... all need the same user and token.
// Passing them down through every component as props ("prop drilling") gets messy.
//
// Where is the token kept?
//   - By default only in React STATE (memory): it is gone after a reload, and it is not sitting in storage
//     where an injected script (XSS) could read it.
//   - If the user ticks "Keep me logged in", ALSO in sessionStorage, so a reload keeps them logged in
//     (cleared when the tab closes). The token itself expires after 30 minutes either way (backend settings.py).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { ApiError, getMe, logIn } from '../api/client.js'
import { tokenExpiresAt } from '../utils/jwt.js'

const STORAGE_KEY = 'auth.session'

const AuthContext = createContext(null)

// sessionStorage can throw (private mode, blocked site data) - never let that crash the app.
function readStoredSession() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (stored?.token && stored.expiresAt > Date.now()) return stored   // ignore expired leftovers
  } catch {
    /* no storage available */
  }
  return null
}

function writeStoredSession(session) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no storage available */
  }
}

export function AuthProvider({ children }) {
  // Lazy initialisers (a function, not a value) run only on the FIRST render.
  const [session, setSession] = useState(readStoredSession)            // { token, user, expiresAt } or null
  const [persist, setPersist] = useState(() => readStoredSession() !== null)
  const [notice, setNotice] = useState(null)                           // why we were logged out (shown on /login)

  // Effect = keep something OUTSIDE React (sessionStorage) in sync with state.
  useEffect(() => {
    writeStoredSession(persist ? session : null)
  }, [persist, session])

  // The current token for async code that finishes LATER (see authRequest below).
  const tokenRef = useRef(session?.token ?? null)
  useEffect(() => {
    tokenRef.current = session?.token ?? null
  }, [session])

  const logout = useCallback((reason = null) => {
    // Logging out of a JWT app = forgetting the token. The server keeps no session,
    // so the token itself stays valid until "exp" (another reason to keep it short-lived).
    setSession(null)
    setNotice(reason)
  }, [])

  /**
   * Logs in, then asks the back end who the token belongs to.
   * Throws ApiError (401 wrong email or password, 429 too many attempts) for the form to show.
   */
  const login = useCallback(async (email, password, { remember = false } = {}) => {
    const { access_token: token } = await logIn(email, password)
    const user = await getMe(token)
    setPersist(remember)
    setSession({ token, user, expiresAt: tokenExpiresAt(token) ?? Date.now() + 30 * 60 * 1000 })
    setNotice(null)
    return user
  }, [])

  // Log out automatically when the token runs out, so the menu never shows "logged in" with a dead token.
  useEffect(() => {
    if (!session) return undefined
    const timer = setTimeout(
      () => logout('Your session has expired. Please log in again.'),
      Math.max(0, session.expiresAt - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [session, logout])

  const token = session?.token ?? null

  /**
   * authRequest(call) - runs an API call that needs login, e.g. authRequest((token) => getHistory(token)).
   * If the server answers 401 (expired, forged or unknown token, or the account was deleted) we log out.
   */
  const authRequest = useCallback(
    async (call) => {
      try {
        return await call(token)
      } catch (error) {
        // Only if the token that failed is STILL the current one: a slow, stale request must not end a newer session.
        if (error instanceof ApiError && error.status === 401 && token && token === tokenRef.current) {
          logout('Your session has ended. Please log in again.')
        }
        throw error
      }
    },
    [token, logout],
  )

  const clearNotice = useCallback(() => setNotice(null), [])

  // useMemo: components using the context only re-render when something in the value really changed.
  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token,
      expiresAt: session?.expiresAt ?? null,
      notice,
      login,
      logout,
      authRequest,
      clearNotice,
    }),
    [session, token, notice, login, logout, authRequest, clearNotice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return context
}
