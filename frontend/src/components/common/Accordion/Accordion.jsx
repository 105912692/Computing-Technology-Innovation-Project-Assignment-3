// src/components/common/Accordion/Accordion.jsx - expandable sections.
// Based on the Week 8 React Showcase Accordion (pages/components/demos/Accordion.jsx).
import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './Accordion.module.css'

/**
 * Props:
 *   items         - [{ id, title, content }] ; content can be text or JSX
 *   allowMultiple - true = several sections open at once (default: one at a time)
 *   defaultOpen   - ids open at the start, e.g. ['reasons']
 */
export default function Accordion({ items = [], allowMultiple = false, defaultOpen = [] }) {
  const [openIds, setOpenIds] = useState(defaultOpen)
  const baseId = useId()

  function toggle(id) {
    setOpenIds((current) => {
      if (current.includes(id)) return current.filter((openId) => openId !== id)  // close it
      return allowMultiple ? [...current, id] : [id]                               // open it
    })
  }

  return (
    <div className={styles.accordion}>
      {items.map((item) => {
        const open = openIds.includes(item.id)
        const buttonId = `${baseId}-button-${item.id}`
        const panelId = `${baseId}-panel-${item.id}`
        return (
          <div key={item.id} className={styles.item}>
            <h3 className={styles.heading}>
              <button type="button" id={buttonId} className={styles.trigger}
                aria-expanded={open} aria-controls={panelId} onClick={() => toggle(item.id)}>
                {item.title}
                <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
              </button>
            </h3>
            {/* Stays in the page so CSS can animate it; inert hides it from Tab and screen readers when closed */}
            <div id={panelId} role="region" aria-labelledby={buttonId}
              className={styles.panel} data-open={open} inert={!open}>
              <div className={styles.panelInner}>
                <div className={styles.content}>{item.content}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}