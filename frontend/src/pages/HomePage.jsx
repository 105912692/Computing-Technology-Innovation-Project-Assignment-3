// src/pages/HomePage.jsx - index page ("/").
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { CalendarDays, CheckCheck, CircleAlert, DatabaseBackupIcon, File } from 'lucide-react'

import { getHealth, getMessage } from '../api/client.js'
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
  const { history, replaceHistory, mergeHistory } = useUrlHistory()
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)
  const [text, setText] = useState('')
  const [apiMessage, setApiMessage] = useState(null)

  useEffect(() => {
    getHealth().then(setHealth).catch((e) => setError(e.message))
    getMessage().then((data) => setApiMessage(data.message)).catch((e) => setError(e.message))
  }, [])

  const handleChange = (event) => {
    setText(event.target.value);
  };

  const handleClick = () => {
    alert(`Button clicked! Current text: ${text}`);
  };

  const progressValue = 30;

  const UrlTag = 'google.com';

  const resultLaps = 2;

  // Returns the palette name for a result ('error' = red, 'success' = green). Used in three formats below:
  // 'error.main' (MUI sx), 'error.contrastText' (readable text on it) and var(--mui-palette-error-main) (CSS).
  // Placeholder rule for now; with a real result use: result.label === 'phishing' ? 'error' : 'success'
  const resultColour = (value) => (value > 30 ? 'error' : 'success')

  const resultTag = (value) => (value > 30 ? 'Phishing' : 'Benign')

  // The list shown in each tab: 0 = all, 1 = benign only, 2 = phishing only

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

      {/*Inputs */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', width: '100%'}}>
        <div style={{ flex: '0 0 80%', bgcolor: 'background.paper' }}>
          <input
            id="text-input"
            type="text" 
            value={text} 
            onChange={handleChange} 
            placeholder="Type something..."
            style={{ width: '100%', height: '100%'}}
          />
          </div>
        <div style={{ flex: '1',  bgcolor: 'action.hover' }}>
          <button 
            onClick={handleClick}
            style={{ width: '100%', height: '100%'}}
          >
            Click Me
          </button>
          </div>
      </div>

      {/* upload */}

      {/* Download button */}
      <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadHistory}>
        Download history (JSON)
      </Button>

        <FileUploader onUpload={(data) => mergeHistory(data)} />

    {/* Panel example: title, icon, actions, children and footer are all optional slots */}
      <Panel
        title={`Result - ${resultTag(progressValue)}`}
        headerColor={`${resultColour(progressValue)}.main`}
        headerTextColor={`${resultColour(progressValue)}.contrastText`}
        icon={<CircleAlert size={18} aria-hidden="true" />}
      >
        <ResultDetails
          address={UrlTag}
          time={resultLaps}
          reasons="lorem ipsum dolor sit amet ..."
          confidence={progressValue}
          colour={resultColour(progressValue)}
        />
      </Panel>

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