// src/components/common/DropdownMenu/DropdownMenu.jsx - a menu that opens from any button (WAI-ARIA menu button pattern).
// Based on the Week 8 React Showcase DropdownMenu (pages/components/demos/DropdownMenu.jsx), made reusable:
// the trigger content and the items come from props instead of being fixed.
//
// - useRef + a document "pointerdown" listener closes the menu when you click anywhere else. The listener is only
//   attached while the menu is open and is removed again in the effect's cleanup function.
// - Keyboard: Down / Up / Home / End move between items, Esc closes and gives focus back to the button,
//   Tab closes and lets focus move on. Down or Up on the closed button opens the menu.
// - Focus follows state: activeIndex lives in state, an effect moves DOM focus.
import { useEffect, useId, useRef, useState } from 'react'
import styles from './DropdownMenu.module.css'

/**
 * Props:
 *   children - what the button shows (text, an icon, an <Avatar> ...)
 *   label    - accessible name of the button, also shown as a tooltip, e.g. "Account options"
 *   items    - [{ id, label, icon, onSelect, danger }] or { id, divider: true } for a line
 *              icon: a lucide-react component; onSelect: called when the item is chosen; danger: red text
 *   align    - 'left' (default) or 'right': which edge of the button the menu lines up with
 */
export default function DropdownMenu({ children, label, items = [], align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])
  const id = useId()
  const actions = items.filter((item) => !item.divider)   // the focusable items only

  // 1. Click outside -> close. Only listen while open; always clean up.
  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(event) {
      if (!wrapperRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // 2. Whenever the menu is open, DOM focus follows the activeIndex state.
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  function openAt(index) {
    setActiveIndex(index)
    setOpen(true)
  }

  function close({ returnFocus = true } = {}) {
    setOpen(false)
    if (returnFocus) buttonRef.current.focus()
  }

  function handleButtonKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openAt(event.key === 'ArrowDown' ? 0 : actions.length - 1)
    }
  }

  function handleMenuKeyDown(event) {
    const last = actions.length - 1
    const moves = {
      ArrowDown: () => setActiveIndex((i) => (i === last ? 0 : i + 1)),
      ArrowUp: () => setActiveIndex((i) => (i === 0 ? last : i - 1)),
      Home: () => setActiveIndex(0),
      End: () => setActiveIndex(last),
      Escape: () => close(),
    }
    if (moves[event.key]) {
      event.preventDefault()
      moves[event.key]()
    } else if (event.key === 'Tab') {
      close({ returnFocus: false })
    }
  }

  // Close first, then run the item's own code (passed in by the parent, e.g. Layout.jsx)
  function choose(item) {
    close()
    item.onSelect?.()
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        id={`${id}-button`}
        className={styles.trigger}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => (open ? close() : openAt(0))}
        onKeyDown={handleButtonKeyDown}
      >
        {children}
      </button>

      {open && (
        <ul
          role="menu"
          id={`${id}-menu`}
          aria-labelledby={`${id}-button`}
          className={align === 'right' ? `${styles.menu} ${styles.alignRight}` : styles.menu}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item) => {
            if (item.divider) return <li key={item.id} role="separator" className={styles.divider} />
            const index = actions.indexOf(item)
            const Icon = item.icon
            return (
              <li key={item.id} role="none">
                <button
                  ref={(node) => {
                    itemRefs.current[index] = node
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={index === activeIndex ? 0 : -1}
                  className={item.danger ? `${styles.item} ${styles.danger}` : styles.item}
                  onClick={() => choose(item)}
                >
                  {Icon && <Icon size={16} aria-hidden="true" />}
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
