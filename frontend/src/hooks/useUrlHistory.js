// src/hooks/useUrlHistory.js - the URL check history: create, read, update and delete entries.
// Lives only in this browser (React state + localStorage). It is never sent to the back end.
//
// One entry:
//   { id, url, label: 'phishing' | 'benign', confidence: 0-1, reasons, time, checkedAt }
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'urlHistory'
const MAX_ENTRIES = 200      // keeps localStorage small (it holds about 5 MB per site)
const LABELS = ['phishing', 'benign']

// Turn anything (API result, form input, imported JSON) into a clean entry, or null if it is not usable.
// Imported files and localStorage can be edited by hand, so nothing is trusted as-is.
function toEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const url = typeof raw.url === 'string' ? raw.url.trim().slice(0, 2048) : ''
  if (!url) return null
  const confidence = Number(raw.confidence)
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    url,
    label: LABELS.includes(raw.label) ? raw.label : 'benign',
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    reasons: typeof raw.reasons === 'string' ? raw.reasons.slice(0, 5000) : '',
    time: Number.isFinite(Number(raw.time)) ? Number(raw.time) : null,
    checkedAt: typeof raw.checkedAt === 'string' ? raw.checkedAt : new Date().toISOString(),
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

function loadFromStorage() {
  try {
    return toList(JSON.parse(localStorage.getItem(STORAGE_KEY)))
  } catch {
    return []   // nothing saved yet, storage blocked, or corrupted JSON
  }
}

/**
 * The URL history and functions to change it.
 *
 * @returns {{
 *   history: object[],                        list of entries, newest first
 *   addEntry: (data: object) => object|null,  CREATE - returns the saved entry (with its new id)
 *   getEntry: (id: string) => object|undefined, READ one entry
 *   updateEntry: (id: string, changes: object) => void, UPDATE any fields of one entry
 *   removeEntry: (id: string) => void,        DELETE one entry
 *   clearHistory: () => void,                 DELETE all
 *   replaceHistory: (list: object[]) => void, replace everything, e.g. from an imported URL_History.json
 * }}
 */
export default function useUrlHistory() {
  const [history, setHistory] = useState(loadFromStorage)

  // Save to localStorage whenever the list changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      /* storage full or blocked: the list still works for this visit */
    }
  }, [history])

  // CREATE: add to the top of the list
  const addEntry = useCallback((data) => {
    const entry = toEntry({ ...data, id: undefined, checkedAt: data?.checkedAt })
    if (entry) setHistory((list) => [entry, ...list].slice(0, MAX_ENTRIES))
    return entry
  }, [])

  // READ: one entry by id
  const getEntry = useCallback((id) => history.find((entry) => entry.id === id), [history])

  // UPDATE: change any fields of one entry (the id cannot be changed)
  const updateEntry = useCallback((id, changes) => {
    setHistory((list) =>
      list.map((entry) => (entry.id === id ? toEntry({ ...entry, ...changes, id }) ?? entry : entry)),
    )
  }, [])

  // DELETE: one entry, or all
  const removeEntry = useCallback((id) => setHistory((list) => list.filter((entry) => entry.id !== id)), [])
  const clearHistory = useCallback(() => setHistory([]), [])

  // Replace everything (e.g. after importing a URL_History.json file)
  const replaceHistory = useCallback((list) => setHistory(toList(list)), [])

  return { history, addEntry, getEntry, updateEntry, removeEntry, clearHistory, replaceHistory }
}
