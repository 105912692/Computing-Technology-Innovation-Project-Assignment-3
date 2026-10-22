// src/pages/HomePage.jsx - index page ("/").
import { useEffect, useState } from 'react'

import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { CalendarDays, CheckCheck, CircleAlert, DatabaseBackupIcon, File } from 'lucide-react'

import { checkUrl, getHealth, getMessage } from '../api/client.js'
import Panel from '../components/common/Panel.jsx'
import Progress from '../components/common/Progress/Progress.jsx'
import Result from '../components/common/Result/Result.jsx'
import ResultDetails from '../components/common/Result/ResultDetails.jsx'
import sampleHistory from '../data/sampleHistory.json'   // sample checks until real results are stored (Stage 3)
import FileUploader from '../components/common/FileUploader.jsx'
import useUrlHistory from '../hooks/useUrlHistory.js' 

// One tab's content. Hidden unless its tab is selected (based on the MUI Tabs example).
function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`home-tabpanel-${index}`}
      aria-labelledby={`home-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

// Links each tab to its panel for screen readers.
function tabProps(index) {
  return { id: `home-tab-${index}`, 'aria-controls': `home-tabpanel-${index}` }
}

export default function HomePage() {
  const { history, replaceHistory, mergeHistory, addEntry } = useUrlHistory()
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)
  const [text, setText] = useState('')
  const [apiMessage, setApiMessage] = useState(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [result, setResult] = useState(null)

  const MAX_URL_LENGTH = 2048

  // Usability hint only (the URL sent to the model is NOT changed): the model is most reliable on complete links,
  // because of how its training data was collected (see README "Model"). Shown while the typed text has no http(s)://.
  const missingScheme = text.trim() !== '' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim())

  useEffect(() => {
    getHealth().then(setHealth).catch((e) => setError(e.message))
    getMessage().then((data) => setApiMessage(data.message)).catch((e) => setError(e.message))
  }, [])

  function validate(value) {
    if (!value.trim()) return 'Enter a URL to check.'
    if (value.length > MAX_URL_LENGTH) return `The URL must be ${MAX_URL_LENGTH} characters or fewer.`
    return ''
  }

  const handleChange = (event) => {
    setText(event.target.value)
    setCheckError('')                                  // clear the old message while typing
  }

  async function handleSubmit(event) {
    event.preventDefault()                             // stop the browser reloading the page
    const problem = validate(text)
    if (problem) return setCheckError(problem)

    setChecking(true)
    setCheckError('')
    const started = performance.now()
    try {
      const checked = await checkUrl(text.trim())      // POST /api/check → { url, label, confidence }
      const seconds = Math.round((performance.now() - started) / 100) / 10   // e.g. 0.3
      const entry = addEntry({ ...checked, time: seconds, reasons: '' })   // saved to history + localStorage
      setResult(entry)                                 // remember THIS entry (it has the id and time) for the Panel
      setText('')
    } catch (error) {
      setCheckError(error.message)                     // e.g. "Request is not valid" or "Cannot reach the server"
    } finally {
      setChecking(false)
    }
  }

  // The entry from the most recent check, found by its id - so uploads, sorting or new entries can't swap it
  // for another one. If it has been deleted from the history, the Panel is hidden.
  const latest = result ? history.find((entry) => entry.id === result.id) ?? null : null
  const latestColour = latest?.label === 'phishing' ? 'error' : 'success'

  const shown = history.length > 0 ? history : sampleHistory 
  const tabLists = [
    // History,
    // History.filter((entry) => entry.label === 'benign'),
    // History.filter((entry) => entry.label === 'phishing'),

    shown,
    shown.filter((entry) => entry.label === 'benign'),
    shown.filter((entry) => entry.label === 'phishing'),
  ]

  // Turns the current list into a JSON file and downloads it as URL_History.json
  function downloadHistory() {
    const json = JSON.stringify(history, null, 2)                  // the list as nicely spaced JSON text
    const blob = new Blob([json], { type: 'application/json' })          // a file in memory
    const link = document.createElement('a')                             // a temporary download link
    link.href = URL.createObjectURL(blob)
    link.download = 'URL_History.json'                                   // the saved file's name
    link.click()
    URL.revokeObjectURL(link.href)                                       // free the memory afterwards
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">Home</Typography>

      {/* Connection Status */}
      {!health && !error && <Alert severity="info">Connecting to the back end...</Alert>}
      {health && <Alert severity="success">Back end connected (model: {health.model})</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {/* API test message */}
      {apiMessage && <Alert severity="info">{apiMessage}</Alert>}

      {/* URL input */}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'flex-start' } }}>
          <TextField
            id="url-input"
            label="URL to check"
            placeholder="e.g. paypal-account-verify.top/login"
            value={text}
            onChange={handleChange}
            error={Boolean(checkError)}
            helperText={
              checkError ||
              (missingScheme
                ? 'Tip: paste the full link (starting with https://). Short addresses like google.com are less reliable.'
                : ' ')                                      // ' ' keeps the space so the layout doesn't jump
            }
            fullWidth
            disabled={checking}
            slotProps={{
              htmlInput: { maxLength: MAX_URL_LENGTH },
              formHelperText: { sx: { color: !checkError && missingScheme ? 'warning.main' : undefined } },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={checking}
            startIcon={checking ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ minWidth: { sm: 140 }, height: 56 }}     // 56px = same height as the TextField
          >
            {checking ? 'Checking…' : 'Check'}
          </Button>
        </Stack>
      </Box>

      {/* upload */}

      {/* Download button */}
      <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadHistory}>
        Download history (JSON)
      </Button>

        <FileUploader onUpload={(data) => mergeHistory(data)} />

    {/* Latest result - the most prominent element (brief 2.1). Only shown after a check. */}
    {latest && (
      <Panel
        title={`Result - ${latest.label === 'phishing' ? 'Phishing' : 'Benign'}`}
        headerColor={`${latestColour}.main`}
        headerTextColor={`${latestColour}.contrastText`}
        icon={<CircleAlert size={18} aria-hidden="true" />}
      >
        <ResultDetails
          address={latest.url}
          time={latest.time}
          reasons={latest.reasons || 'No extra reasons available yet.'}
          confidence={Math.round(latest.confidence * 100)}
          colour={latestColour}
        />
      </Panel>
    )}

      {/* Tabs */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(event, newTab) => setTab(newTab)} aria-label="Home sections">
            <Tab label="ALL URLs" {...tabProps(0)} />
            <Tab label="Benign URLs" {...tabProps(1)} />
            <Tab label="Phishing URLs" {...tabProps(2)} />
          </Tabs>
        </Box>
        {/* Each tab shows the same list, filtered by label: one Result card per entry */}
        {tabLists.map((list, index) => (
          <TabPanel key={index} value={tab} index={index}>
            {list.length === 0
              ? <Typography color="text.secondary">No URLs here yet.</Typography>
              : list.map((entry) => <Result key={entry.id} data={entry} />)}
          </TabPanel>
        ))}
      </Box>
    </Stack>
  )
}