// src/utils/jwt.js - read a JSON Web Token in the browser (WITHOUT verifying it).
// Based on the Week 8 React Showcase (pages/fullstack-auth/jwt.js), cut down to what this app needs.
//
// A JWT is three base64url strings joined by dots: header.payload.signature
// Decoding needs no secret - it is just base64 - so the browser can READ the expiry time ("exp"),
// but only the server, which knows SECRET_KEY, can tell a genuine token from a forged one.
// So this is only used to know WHEN a token runs out; the back end still checks every request.

/** base64url -> text. base64url uses - and _ instead of + and /, and drops the = padding. */
function base64UrlDecode(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * The token's payload, e.g. { sub: '1', exp: 1792719558 }, or null if it is not a well-formed JWT.
 * @param {string} token
 * @returns {object|null}
 */
export function decodeJwtPayload(token) {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3) return null
  try {
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch {
    return null   // not base64 / not JSON
  }
}

/**
 * When the token expires, in milliseconds since 1970 (like Date.now()), or null if unknown.
 * @param {string} token
 * @returns {number|null}
 */
export function tokenExpiresAt(token) {
  const exp = decodeJwtPayload(token)?.exp
  return typeof exp === 'number' ? exp * 1000 : null
}
