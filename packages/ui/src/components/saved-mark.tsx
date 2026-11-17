"use client"

import { type ReactNode, useEffect, useState } from "react"
import { CheckIcon } from "../lib/icons"
import { cn } from "../lib/variants"

/*
 * Both states stay mounted and change by transition, so a save during the fade-out turns it
 * around. The exit is quicker and plainer than the enter; reduced motion keeps the fade alone.
 */
const markClasses = [
  "inline-flex items-center gap-1 font-medium text-success-ink text-xs",
  "transition-[opacity,filter,translate] motion-reduce:transition-opacity",
]
const markShownClasses = "opacity-100 blur-none translate-x-0 duration-200 ease-swap"
const markHiddenClasses = [
  "pointer-events-none opacity-0 blur-[4px] -translate-x-1 duration-150 ease-out",
  "motion-reduce:blur-none motion-reduce:translate-x-0",
]

const iconClasses = "size-3.5 transition-[scale] duration-200 ease-swap motion-reduce:scale-100"

interface SavedMarkProps {
  /** A count the caller bumps after each save; every change shows the mark again. */
  saves: number
  /** How long the mark stays, in milliseconds. */
  duration?: number
  label?: ReactNode
  className?: string
}

/**
 * The note an autosaved control shows beside its label for a moment after each save. Screen
 * readers hear it through a status region instead of the visible mark.
 */
export function SavedMark({ saves, duration = 2000, label = "Saved", className }: SavedMarkProps) {
  const [visible, setVisible] = useState(false)
  const [seen, setSeen] = useState(saves)

  // A changed count shows the mark; the first render only records the count.
  if (saves !== seen) {
    setSeen(saves)
    setVisible(true)
  }

  // Keyed on the count too, so a save while shown restarts the timer.
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [visible, saves, duration])

  return (
    <span className={cn("inline-flex items-center align-middle", className)}>
      <span aria-hidden className={cn(markClasses, visible ? markShownClasses : markHiddenClasses)}>
        <CheckIcon className={cn(iconClasses, visible ? "scale-100" : "scale-[0.25]")} />
        {label}
      </span>

      <output className="sr-only">{visible && label}</output>
    </span>
  )
}
