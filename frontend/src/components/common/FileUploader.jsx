// src/components/common/FileUploader.jsx - choose a URL_History.json file, check it, then hand the data to the parent.
import { useId, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'

const MAX_BYTES = 1_000_000   // 1 MB

// Status values: 'idle' | 'checking' | 'uploading' | 'success' | 'error'

// 1. Name/type check - quick, no reading needed
function isJsonFile(file) {
  return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
}

// 2. One saved check in the application's format
function isValidEntry(item) {
  return (
    item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.url === 'string' && item.url.length <= 2048 &&
    (item.label === 'benign' || item.label === 'phishing') &&
    typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1 &&
    // optional: files saved before phishingProbability was added don't have it (it is worked out on load)
    (item.phishingProbability === undefined ||
      (typeof item.phishingProbability === 'number' && item.phishingProbability >= 0 && item.phishingProbability <= 1)) &&
    typeof item.reasons === 'string' &&
    (typeof item.time === 'number' || item.time === null) &&        // downloads can have time: null
    typeof item.checkedAt === 'string' && !Number.isNaN(Date.parse(item.checkedAt))
  )
}

// 3. Read + parse + check the whole file. Returns the data, or throws a message for the user.
async function readHistoryFile(file) {
  let data
  try {
    data = JSON.parse(await file.text())          // file.text() replaces the FileReader code
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!Array.isArray(data)) throw new Error('The file must contain a list of saved checks.')
  if (!data.every(isValidEntry)) throw new Error("The file is not in the application's format.")
  return data
}

export default function FileUploader({ accept = '.json,application/json', onUpload }) {
  const id = useId()
  const [file, setFile] = useState(null)
  const [data, setData] = useState(null)        // the checked contents, ready to use
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  function showError(text) {
    setFile(null)
    setData(null)
    setStatus('error')
    setMessage(text)
  }

  async function handleFileChange(event) {     // async, so we can await the content check
    const chosen = event.target.files?.[0] ?? null
    setStatus('idle')
    setMessage('')
    setFile(null)
    setData(null)
    if (!chosen) return

    if (chosen.size > MAX_BYTES) return showError('The file must be under 1 MB.')
    if (!isJsonFile(chosen)) return showError('The file must be a .json file.')

    setStatus('checking')
    try {
      const checked = await readHistoryFile(chosen)
      setFile(chosen)
      setData(checked)
      setStatus('idle')
    } catch (error) {
      showError(error.message)
    }
  }

  async function handleUpload() {
    setStatus('uploading')
    try {
      await onUpload?.(data, file)              // the parent gets the already-checked data
      setStatus('success')
      setMessage(`${file.name} loaded: ${data.length} checks.`)
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Upload failed.')
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography component="label" htmlFor={id} sx={{ fontWeight: 600 }}>Load a saved history (URL_History.json)</Typography>
      <input id={id} type="file" accept={accept} onChange={handleFileChange} />

      {status === 'checking' && <Typography variant="body2">Checking file…</Typography>}
      {file && data && status !== 'uploading' && (
        <Button variant="contained" onClick={handleUpload} sx={{ alignSelf: 'flex-start' }}>Upload</Button>
      )}
      {status === 'uploading' && <Typography variant="body2">Uploading…</Typography>}
      {message && (
        <Typography variant="body2" color={status === 'error' ? 'error.main' : 'success.main'} role="status">
          {message}
        </Typography>
      )}
    </Box>
  )
}