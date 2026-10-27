// src/hooks/useThresholdDrag.js - everything that MOVES a threshold line on a chart:
// d3.drag (mouse + touch), a click / tap on the plot, and the arrow keys on the focusable role="slider" handle.
// Adapted from the Week 8 React Showcase (src/pages/d3-ml/demos/threshold/useThresholdDrag.js).
//
// d3.drag is attached to React-rendered elements as a BEHAVIOUR only: it listens to pointer events and calls
// onThresholdChange - it never edits the DOM, so React and D3 never fight.
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

const clamp01 = (value) => Math.max(0, Math.min(1, value))

/**
 * @param {Function} x - the chart's d3.scaleLinear (0-1 -> pixels)
 * @param {number} threshold - the current threshold (0-1)
 * @param {Function} onThresholdChange - called with the new threshold (0-1)
 */
export default function useThresholdDrag(x, threshold, onThresholdChange) {
  const overlayRef = useRef(null)          // the plot's drag surface
  const handleRef = useRef(null)           // the line + its "50%" handle
  const thresholdRef = useRef(threshold)   // the latest threshold, for the touch filter below
  const [dragging, setDragging] = useState(false)

  useEffect(() => { thresholdRef.current = threshold }, [threshold])

  // Re-bound whenever the scale changes, so the handler never uses an old x
  useEffect(() => {
    if (!overlayRef.current) return undefined
    const toThreshold = (event) => onThresholdChange(clamp01(x.invert(event.x)))
    const drag = d3.drag()
      // Mouse: press anywhere in the plot. Touch: only near the line, so a swipe still scrolls the page.
      .filter((event) => (event.type === 'touchstart'
        ? Math.abs(d3.pointer(event.touches[0], overlayRef.current)[0] - x(thresholdRef.current)) < 24
        : !event.ctrlKey && !event.button))
      .on('start', (event) => { setDragging(true); toThreshold(event) })
      .on('drag', toThreshold)
      .on('end', () => setDragging(false))
    const targets = d3.selectAll([overlayRef.current, handleRef.current]).call(drag)
    d3.select(overlayRef.current).style('touch-action', 'pan-y')   // let vertical swipes scroll again
    return () => targets.on('.drag', null)                          // remove the listeners on cleanup
  }, [x, onThresholdChange])

  // A tap anywhere on the plot moves the line there
  function handleSurfaceClick(event) {
    onThresholdChange(clamp01(x.invert(d3.pointer(event.nativeEvent, event.currentTarget)[0])))
  }

  // Keyboard support for the role="slider" handle (Shift = bigger steps)
  function handleKeyDown(event) {
    const steps = { ArrowLeft: -0.01, ArrowDown: -0.01, ArrowRight: 0.01, ArrowUp: 0.01, PageDown: -0.1, PageUp: 0.1 }
    let next = null
    if (event.key in steps) next = threshold + steps[event.key] * (event.shiftKey ? 5 : 1)
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = 1
    if (next === null) return
    event.preventDefault()
    onThresholdChange(clamp01(next))
  }

  return { overlayRef, handleRef, dragging, handleSurfaceClick, handleKeyDown }
}
