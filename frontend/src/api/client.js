// src/api/client.js
// Every call to the FastAPI back end. Errors come back as {error: {status, message, details}} (backend/app/errors.py).

// Empty in development: the Vite dev server forwards /api/* to FastAPI (vite.config.js).
// For a deployed back end set VITE_API_URL, e.g. https://api.example.com
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Error thrown for any failed request, carrying the back end's message and field details. */
export class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message)
    this.status = status    // 0 = the back end could not be reached
    this.details = details  // e.g. [{field: "body.url", message: "String should have at least 1 character"}]
  }

  /**
   * The 422 details as { fieldName: message } for a form, e.g. { user_email: 'Enter a valid email address' }.
   * "body.data_saved.label" -> "label" (the last part of the field path).
   */
  get fieldErrors() {
    const errors = {}
    for (const { field, message } of this.details) {
      const name = field.split('.').pop()
      if (!errors[name]) errors[name] = message.replace(/^Value error, /, '')
    }
    return errors
  }
}

/**
 * Sends a request to the back end and returns the parsed JSON.
 * @param {string} path - e.g. "/api/check"
 * @param {RequestInit & {token?: string}} [options] - method, body, etc.; token adds "Authorization: Bearer <token>"
 * @returns {Promise<any>} The response body (null for 204 No Content).
 * @throws {ApiError} When the back end returns an error or cannot be reached.
 */
async function request(path, { token, ...options } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),   // only sent when a token is given
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the back end running?')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body?.error ?? {}
    throw new ApiError(response.status, error.message ?? 'Something went wrong', error.details ?? [])
  }
  return body
}

/** GET /api/health - {status, model} */
export const getHealth = () => request('/api/health')

/** POST /api/check - {url, label, confidence, phishing_probability} */
export const checkUrl = (url) => request('/api/check', { method: 'POST', body: JSON.stringify({ url }) })

// ---------- Accounts (see backend/app/main.py) ----------

/** POST /api/users - sign up: {user_id, user_name, user_email} (409 if the email is taken) */
export const signUp = (name, email, password) =>
  request('/api/users', { method: 'POST', body: JSON.stringify({ user_name: name, user_email: email, password }) })

/** POST /api/login - {access_token, token_type} (401 wrong email or password, 429 too many attempts) */
export const logIn = (email, password) =>
  request('/api/login', { method: 'POST', body: JSON.stringify({ user_email: email, password }) })

/** GET /api/me (needs login) - {user_id, user_name, user_email} */
export const getMe = (token) => request('/api/me', { token })
