// src/hooks/useElementSize.js - measures an element and re-renders when its size changes.
// Copied from the Week 8 React Showcase (src/hooks/useElementSize.js). Charts use it to fit their container.
//
//   const [ref, { width }] = useElementSize()
//   return <div ref={ref}>{width > 0 && <svg width={width} … />}</div>
//
// The size is 0 x 0 until the first measurement (and while hidden), so always check `width > 0` before drawing.
import { useEffect, useState } from 'react'

export default function useElementSize() {
  const [node, setNode] = useState(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!node) return undefined
    // ResizeObserver calls this whenever the element's box changes size
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  return [setNode, size]   // setNode is a "callback ref"
}
