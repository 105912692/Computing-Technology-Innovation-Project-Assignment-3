// src/pages/HomePage.jsx - index page ("/").
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { CalendarDays, CheckCheck, CircleAlert } from 'lucide-react'

import { getHealth, getMessage } from '../api/client.js'
import Panel from '../components/common/Panel.jsx'
import Progress from '../components/common/Progress/Progress.jsx'
import Result from '../components/common/Result/Result.jsx'
import ResultDetails from '../components/common/Result/ResultDetails.jsx'

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
      <Button
        variant="contained"
        color="primary"
        startIcon={<DownloadIcon />}
        component="a"
        href="/downloads/downloadTest.txt" // Path to your file
        download
      >
      Download Test Txt
    </Button>

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
        <TabPanel value={tab} index={0}>
          <Result
            name={UrlTag}
            label="benign"
            confidence={progressValue}
            time={resultLaps}
            reasons="lorem ipsum dolor sit amet ..."
          />
          <Result
            name={UrlTag}
            label="phishing"
            confidence={31}
            time={resultLaps}
            reasons="lorem ipsum dolor sit amet ..."
          />
          </TabPanel>
        <TabPanel value={tab} index={1}>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Suscipit error nobis veritatis, eligendi saepe molestias nesciunt ullam exercitationem recusandae atque, necessitatibus quas odit culpa porro inventore possimus ab natus aliquid!</TabPanel>
        <TabPanel value={tab} index={2}>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Enim, earum? Culpa odit neque possimus soluta, temporibus esse eos nisi facere deserunt nostrum cum, modi officia illo, harum amet natus molestias.</TabPanel>
      </Box>
    </Stack>
  )
}