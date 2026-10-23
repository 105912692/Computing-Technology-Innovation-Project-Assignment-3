// src/pages/HomePage.jsx - index page ("/").
import { useEffect, useState } from 'react'

import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { CalendarDays, CheckCheck, CircleAlert, DatabaseBackupIcon, File } from 'lucide-react'

import { checkUrl, getHealth } from '../api/client.js'
import Panel from '../components/common/Panel.jsx'
import Progress from '../components/common/Progress/Progress.jsx'
import Result from '../components/common/Result/Result.jsx'
import ResultDetails from '../components/common/Result/ResultDetails.jsx'
import sampleHistory from '../data/sampleHistory.json'   // sample checks until real results are stored (Stage 3)
import FileUploader from '../components/common/FileUploader.jsx'
import useUrlHistory from '../hooks/useUrlHistory.js' 
import { getPhishingRiskPercent } from '../utils/phishingRisk.js'

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

// DEVELOPMENT ONLY - set to false (or delete this and sampleHistory.json) before submission.
// true  = while nothing is saved, the tabs show the made-up example checks from src/data/sampleHistory.json
//         (handy for styling cards and building the charts without checking URLs each time).
// false = the tabs show only real saved checks ("No URLs here yet." when empty).
// The samples are also never shown in a production build (`npm run build`), even if this is left true.
const historyDevToggle = true
const SHOW_SAMPLE_HISTORY = historyDevToggle && import.meta.env.DEV

// Links each tab to its panel for screen readers.
function tabProps(index) {
  return { id: `home-tab-${index}`, 'aria-controls': `home-tabpanel-${index}` }
}

export default function HomePage() {
  const { history, replaceHistory, mergeHistory, addEntry, clearHistory } = useUrlHistory()
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)
  const [text, setText] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [result, setResult] = useState(null)
  const [isVisible, setIsVisible] = useState(true)

  const MAX_URL_LENGTH = 2048

  // Usability hint only (the URL sent to the model is NOT changed): the model is most reliable on complete links,
  // because of how its training data was collected (see README "Model"). Shown while the typed text has no http(s)://.
  const missingScheme = text.trim() !== '' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim())

  useEffect(() => {
    getHealth().then(setHealth).catch((e) => setError(e.message))
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
      const checked = await checkUrl(text.trim())      // POST /api/check → { url, label, confidence, phishing_probability }
      const ms = Math.round(performance.now() - started)        // e.g. 37
      const entry = addEntry({ ...checked, time: ms, reasons: '' })  // saved to history + localStorage
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

  const shown = history.length === 0 && SHOW_SAMPLE_HISTORY ? sampleHistory : history   // samples only in development
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

  // Labels for each tab, used by "Clear" (index matches the tab order)
  const TAB_LABELS = [null, 'benign', 'phishing']        // null = ALL URLs
  const TAB_NAMES = ['all', 'benign', 'phishing']

  function clearAll() {
    if (window.confirm('Delete ALL saved checks? This cannot be undone.')) clearHistory()
  }

  // Removes only the entries shown in the current tab (on "ALL URLs" this is the same as clearAll)
  function clearSection(tabIndex) {
    const label = TAB_LABELS[tabIndex]
    if (!label) return clearAll()
    if (window.confirm(`Delete all ${label} checks? This cannot be undone.`)) {
      replaceHistory(history.filter((entry) => entry.label !== label))   // keep everything else
    }
  }

  // Only real saved checks can be cleared (not the sample list shown when history is empty)
  const sectionCount = TAB_LABELS[tab] ? history.filter((e) => e.label === TAB_LABELS[tab]).length : history.length

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h1">Home</Typography>

      {/* Connection Status */}
      {!health && !error && <Alert severity="info">Connecting to the back end...</Alert>}
      {health && <Alert severity="success">Back end connected (model: {health.model})</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

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
          reasons={latest.reasons}
          risk={getPhishingRiskPercent(latest)}
          colour={latestColour}
        />
      </Panel>
    )}

    {/* Clear buttons - only active when there are saved checks to delete */}
    <Stack direction="row" spacing={1}>
      <Button color="error" variant="outlined" onClick={clearAll} disabled={history.length === 0}>
        Clear all
      </Button>
      {/* Only on the Benign / Phishing tabs - on ALL URLs it would do the same as "Clear all" */}
      {tab !== 0 && (
        <Button color="error" variant="text" onClick={() => clearSection(tab)} disabled={sectionCount === 0}>
          Clear {TAB_NAMES[tab]}
        </Button>
      )}
    </Stack>

    {/* While nothing is saved, the tabs show sample checks - say so, so the disabled buttons make sense */}
    {history.length === 0 && SHOW_SAMPLE_HISTORY && (
      <Typography variant="body2" color="text.secondary">
        Showing example checks. They are not saved and cannot be cleared - check a URL to start your own history.
      </Typography>
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