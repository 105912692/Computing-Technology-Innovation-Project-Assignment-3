// src/utils/accountRules.js - the same rules the back end checks (UserCreate / LoginRequest in backend/app/schemas.py).
// Checking in the browser is only for a friendlier form: the back end checks again, because anyone can skip the browser.
// Keep these in sync with schemas.py.

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const NAME_MAX = 20
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

/**
 * Problems with an email address, or '' if it is fine.
 * @param {string} email
 * @returns {string}
 */
export function emailError(email) {
  if (!email.trim()) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.'
  return ''
}
