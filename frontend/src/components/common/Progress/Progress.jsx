// src/components/common/Progress/Progress.jsx - circular percentage ring (e.g. the model's confidence).
import './Progress.css'

/**
 * Shows a value from 0 to 100 as a filled ring with the number in the middle.
 *
 * Props:
 *   value - the percentage to show (clamped to 0-100)
 *   label - what the ring measures, read out by screen readers
 *   color - optional ring colour, e.g. 'var(--mui-palette-error-main)' for phishing
 */
export default function Progress({ value, label = 'Progress', color }) {
    const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))

    return (
        <div
        className="progress"
        style={{ '--progress': `${percent}%`, ...(color && { '--color': color }) }}  // React sets the CSS variables directly
        data-value={percent}
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        />
    )
}
