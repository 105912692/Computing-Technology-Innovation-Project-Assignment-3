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
}

/**
 * Sends a request to the back end and returns the parsed JSON.
 * @param {string} path - e.g. "/api/check"
 * @param {RequestInit} [options] - method, body, etc.
 * @returns {Promise<any>} The response body.
 * @throws {ApiError} When the back end returns an error or cannot be reached.
 */
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
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

/** GET /api/message - {message} */
export const getMessage = () => request('/api/message')

/** POST /api/check - {url, label, confidence, phishing_probability} */
export const checkUrl = (url) => request('/api/check', { method: 'POST', body: JSON.stringify({ url }) })
