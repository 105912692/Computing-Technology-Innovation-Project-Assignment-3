// src/hooks/useUrlHistory.js - the URL check history: create, read, update and delete entries.
// Kept in this browser (React state + localStorage) AND, while logged in, in the account (history_data in PostgreSQL),
// so both always show the same list:
//   - Logging in merges them: checks made while logged out are uploaded, the account's checks are downloaded.
//   - While logged in, every add / delete / clear is also sent to the back end.
//   - Checks deleted while logged out (or while the back end was unreachable) are remembered and deleted from
//     the account at the next login, so they don't come back.
//
// One entry:
//   { id, url, label: 'phishing' | 'benign', confidence: 0-1, phishingProbability: 0-1, reasons, time, checkedAt,
//     historyId, owner }
//   historyId - the row's id in history_data (null until it is saved to an account)
//   owner     - the user_id of the account it is saved in (null = made while logged out, not uploaded yet)
import { useCallback, useEffect, useRef, useState } from 'react'

import { clearSavedHistory, deleteHistoryEntry, getHistory, saveHistory } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getPhishingProbability } from '../utils/phishingRisk.js'

const STORAGE_KEY = 'urlHistory'
const PENDING_KEY = 'urlHistory.pendingDeletes'   // [{ owner, historyId }] still to delete from an account
const MAX_ENTRIES = 200      // keeps localStorage small (it holds about 5 MB per site)
const LABELS = ['phishing', 'benign']

// Turn anything (API result, form input, imported JSON, a row from the account) into a clean entry, or null if it
// is not usable. Imported files and localStorage can be edited by hand, so nothing is trusted as-is.
function toEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const url = typeof raw.url === 'string' ? raw.url.trim().slice(0, 2048) : ''
  if (!url) return null
  const confidence = Number(raw.confidence)
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 64) : crypto.randomUUID(),
    url,
    label: LABELS.includes(raw.label) ? raw.label : 'benign',
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    // Same 0-1 scale for every entry; worked out from label + confidence for older entries/files without it
    phishingProbability: getPhishingProbability({ ...raw, label: LABELS.includes(raw.label) ? raw.label : 'benign' }),
    reasons: typeof raw.reasons === 'string' ? raw.reasons.slice(0, 5000) : '',
    time: Number.isFinite(Number(raw.time)) && raw.time !== null ? Number(raw.time) : null,
    checkedAt: typeof raw.checkedAt === 'string' ? raw.checkedAt : new Date().toISOString(),
    historyId: Number.isInteger(raw.historyId) ? raw.historyId : null,
    owner: Number.isInteger(raw.owner) ? raw.owner : null,
  }
}

// Clean a whole list: drop unusable entries and duplicate ids, keep the newest MAX_ENTRIES
function toList(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  return raw
    .map(toEntry)
    .filter((entry) => entry && !seen.has(entry.id) && seen.add(entry.id))
    .slice(0, MAX_ENTRIES)
}

const newestFirst = (a, b) => b.checkedAt.localeCompare(a.checkedAt)   // ISO dates sort as text

// What is sent to the back end: the fields SavedCheck in backend/app/schemas.py accepts (no historyId / owner).
function toSavedCheck(entry) {
  return {
    id: entry.id,
    url: entry.url,
    label: entry.label,
    confidence: entry.confidence,
    phishingProbability: entry.phishingProbability,
    reasons: entry.reasons,
    time: entry.time === null ? null : Math.round(entry.time),   // the back end stores whole milliseconds
    checkedAt: entry.checkedAt,
  }
}

// A row from GET/POST /api/history -> an entry. Rows saved without an id (e.g. from /docs) get one from the row id.
function fromRow(row, owner) {
  return toEntry({ ...row.data_saved, id: row.data_saved?.id ?? `row-${row.history_id}`, historyId: row.history_id, owner })
}

// localStorage can throw (private mode, blocked site data) - never let that break the list.
function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: the list still works for this visit */
  }
}
const readPending = () => (Array.isArray(readJson(PENDING_KEY)) ? readJson(PENDING_KEY) : [])

/**
 * The URL history and functions to change it.
 *
 * @returns {{
 *   history: object[],                        list of entries, newest first
 *   addEntry: (data: object) => object|null,  CREATE - returns the saved entry (with its new id)
 *   getEntry: (id: string) => object|undefined, READ one entry
 *   updateEntry: (id: string, changes: object) => void, UPDATE any fields of one entry (this browser only)
 *   removeEntry: (id: string) => void,        DELETE one entry
 *   clearHistory: () => void,                 DELETE all
 *   replaceHistory: (list: object[]) => void, replace everything (entries left out are deleted, new ones saved)
 *   mergeHistory: (list: object[]) => void,   add entries from an imported URL_History.json
 * }}
 */
export default function useUrlHistory() {
  const { user, authRequest } = useAuth()
  const [history, setHistory] = useState(() => toList(readJson(STORAGE_KEY)))
  const userId = user?.user_id ?? null

  // Save to localStorage whenever the list changes
  useEffect(() => {
    writeJson(STORAGE_KEY, history)
  }, [history])

  // The current list for async code that finishes LATER (the sync below)
  const historyRef = useRef(history)
  useEffect(() => {
    historyRef.current = history
  }, [history])

  // Remember an account row to delete later (logged out, or the request failed)
  const rememberDelete = useCallback((owner, historyId) => {
    writeJson(PENDING_KEY, [...readPending(), { owner, historyId }])
  }, [])

  // Delete saved entries from the account now if possible, otherwise at the next login
  const forgetSaved = useCallback((entries) => {
    for (const entry of entries) {
      if (entry.historyId === null) continue
      if (userId !== null && entry.owner === userId) {
        authRequest((token) => deleteHistoryEntry(entry.historyId, token))
          .catch((error) => { if (error.status !== 404) rememberDelete(entry.owner, entry.historyId) })
      } else {
        rememberDelete(entry.owner, entry.historyId)
      }
    }
  }, [userId, authRequest, rememberDelete])

  // Save new entries to the account (logged in only). If it fails they stay owner: null and are sent at the next login.
  const upload = useCallback((entries) => {
    if (userId === null) return
    for (const entry of entries) {
      authRequest((token) => saveHistory(toSavedCheck(entry), token))
        .then((row) => setHistory((list) =>
          list.map((e) => (e.id === entry.id ? { ...e, historyId: row.history_id, owner: userId } : e))))
        .catch(() => { /* not saved yet: uploaded at the next login */ })
    }
  }, [userId, authRequest])

  // ---------- Merge with the account when someone logs in ----------
  const syncedUser = useRef(null)
  useEffect(() => {
    if (userId === null) {
      syncedUser.current = null
      return
    }
    if (syncedUser.current === userId) return   // once per login (StrictMode runs effects twice in development)
    syncedUser.current = userId

    async function syncWithAccount() {
      // 1. Deletes made while logged out
      const pending = readPending()
      for (const { historyId } of pending.filter((p) => p.owner === userId)) {
        await authRequest((token) => deleteHistoryEntry(historyId, token)).catch((error) => {
          if (error.status !== 404) throw error   // 404 = already gone
        })
      }
      writeJson(PENDING_KEY, readPending().filter((p) => p.owner !== userId))

      // 2. What the account has, by front-end id
      const rows = await authRequest(getHistory)
      const saved = new Map(rows.map((row) => [row.data_saved?.id ?? `row-${row.history_id}`, row]))

      // 3. Upload checks made while logged out
      for (const entry of historyRef.current.filter((e) => e.owner === null && !saved.has(e.id))) {
        saved.set(entry.id, await authRequest((token) => saveHistory(toSavedCheck(entry), token)))
      }

      // 4. The list becomes the account's list. Dropped: entries deleted from this account elsewhere, and entries
      //    of another account (e.g. after "Switch account" - they are still in that account).
      setHistory((current) => {
        const fromAccount = [...saved.values()].map((row) => fromRow(row, userId))
        const accountIds = new Set(fromAccount.map((entry) => entry.id))
        const addedDuringSync = current.filter((e) => e.owner === null && !accountIds.has(e.id))   // upload() sends these
        return [...addedDuringSync, ...fromAccount].sort(newestFirst).slice(0, MAX_ENTRIES)
      })
    }

    syncWithAccount().catch(() => {
      syncedUser.current = null   // back end unreachable: try again on the next login
    })
  }, [userId, authRequest])

  // CREATE: add to the top of the list (and to the account when logged in)
  const addEntry = useCallback((data) => {
    const entry = toEntry({ ...data, id: undefined, checkedAt: data?.checkedAt, historyId: null, owner: null })
    if (entry) {
      setHistory((list) => [entry, ...list].slice(0, MAX_ENTRIES))
      upload([entry])
    }
    return entry
  }, [upload])

  // READ: one entry by id
  const getEntry = useCallback((id) => history.find((entry) => entry.id === id), [history])

  // UPDATE: change any fields of one entry (the id cannot be changed). This browser only: the back end has no
  // update route, so a change to an entry that is already in the account is not sent.
  const updateEntry = useCallback((id, changes) => {
    setHistory((list) =>
      list.map((entry) => (entry.id === id ? toEntry({ ...entry, ...changes, id }) ?? entry : entry)),
    )
  }, [])

  // DELETE: one entry
  const removeEntry = useCallback((id) => {
    forgetSaved(historyRef.current.filter((entry) => entry.id === id))
    setHistory((list) => list.filter((entry) => entry.id !== id))
  }, [forgetSaved])

  // DELETE: all (the whole account history too, when logged in)
  const clearHistory = useCallback(() => {
    const removed = historyRef.current
    if (userId !== null) {
      authRequest(clearSavedHistory).catch(() => forgetSaved(removed.filter((e) => e.owner === userId)))
      forgetSaved(removed.filter((e) => e.owner !== userId))   // entries of another account: at its next login
    } else {
      forgetSaved(removed)
    }
    setHistory([])
  }, [userId, authRequest, forgetSaved])

  // Replace everything (e.g. "Clear phishing" keeps the rest): entries left out are deleted, new ones saved.
  const replaceHistory = useCallback((list) => {
    const next = toList(list)
    const nextIds = new Set(next.map((entry) => entry.id))
    const currentIds = new Set(historyRef.current.map((entry) => entry.id))
    forgetSaved(historyRef.current.filter((entry) => !nextIds.has(entry.id)))
    upload(next.filter((entry) => !currentIds.has(entry.id) && entry.owner === null))
    setHistory(next)
  }, [forgetSaved, upload])

  // Add entries from an imported file to the current list.
  // Entries whose id is already in the list are skipped, so uploading the same file twice adds nothing.
  // Imported entries are treated as new (a file can't say which account they belong to), so they are saved when logged in.
  const mergeHistory = useCallback((list) => {
    const existingIds = new Set(historyRef.current.map((entry) => entry.id))
    const added = toList(list)
      .filter((entry) => !existingIds.has(entry.id))
      .map((entry) => ({ ...entry, historyId: null, owner: null }))
    setHistory((current) => [...added, ...current].sort(newestFirst).slice(0, MAX_ENTRIES))
    upload(added)
  }, [upload])

  return { history, addEntry, getEntry, updateEntry, removeEntry, clearHistory, replaceHistory, mergeHistory }
}
