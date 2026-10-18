// src/components/common/ErrorBoundary.jsx
// Catches errors thrown while rendering the pages inside it and shows a fallback instead of a blank screen.
// Error boundaries still need a class component: there is no hook for getDerivedStateFromError.
import { Component } from 'react'
import { Alert, Button, Stack } from '@mui/material'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      // No error details on screen: users get a plain message, developers get the console log
      return (
        <Stack spacing={2} role="alert">
          <Alert severity="error">Something went wrong on this page.</Alert>
          <Button variant="contained" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </Stack>
      )
    }
    return this.props.children
  }
}
