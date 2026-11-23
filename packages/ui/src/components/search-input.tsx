"use client"

import {
  type ComponentProps,
  type CompositionEvent,
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { CancelIcon, SearchIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { Input } from "./input"

type SearchInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  /**
   * Milliseconds the typing pauses before `onValueChange` runs, for a search that loads a list.
   * Enter, the clear button and an emptied field apply at once. Text an input method is still
   * composing waits until the composition ends. Left out, every key applies.
   */
  debounce?: number
}

type SearchFieldProps = Omit<SearchInputProps, "debounce">

function SearchField({ ref, value, onValueChange, className, ...props }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-muted" />

      <Input
        ref={inputRef}
        value={value}
        className="pr-9 pl-8.5"
        onChange={event => onValueChange(event.target.value)}
        {...props}
      />

      {value.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Clear search"
          prefix={<CancelIcon />}
          className="absolute top-1/2 right-0.5 -translate-y-1/2 rounded"
          onClick={() => {
            onValueChange("")
            inputRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}

interface DebouncedSearchFieldProps extends SearchFieldProps {
  debounce: number
}

/**
 * The field holds the typed text and hands it on after a pause. A value changed from outside
 * (Back, a link that clears the search) replaces the text; the field's own value coming back,
 * trimmed or not, does not, so a word typed since the last pause stays.
 */
function DebouncedSearchField({
  value,
  onValueChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  debounce,
  ...props
}: DebouncedSearchFieldProps) {
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  const [written, setWritten] = useState(value)
  const [urgent, setUrgent] = useState(false)
  // An input method (Japanese, Chinese, Korean) holds half-composed text until the reader
  // confirms a candidate, so nothing is handed on before the composition ends.
  const [composing, setComposing] = useState(false)

  if (value !== seen) {
    setSeen(value)

    if (value !== written && value !== written.trim()) {
      setText(value)
      setWritten(value)
    }
  }

  // Read as an event, so a callback the caller writes inline does not restart the pause.
  const write = useEffectEvent((next: string) => {
    setWritten(next)
    setUrgent(false)
    onValueChange(next)
  })

  useEffect(() => {
    if (text === written || composing) return

    const timer = setTimeout(() => write(text), urgent || !text ? 0 : debounce)
    return () => clearTimeout(timer)
  }, [text, written, urgent, composing, debounce])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)
    // An Enter that confirms a candidate belongs to the input method, not to the search.
    if (event.key === "Enter" && !event.defaultPrevented && !event.nativeEvent.isComposing) {
      setUrgent(true)
    }
  }

  function handleCompositionStart(event: CompositionEvent<HTMLInputElement>) {
    onCompositionStart?.(event)
    setComposing(true)
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    onCompositionEnd?.(event)
    setComposing(false)
  }

  return (
    <SearchField
      value={text}
      onValueChange={next => {
        setText(next)
        setUrgent(false)
      }}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      {...props}
    />
  )
}

/**
 * Text input with a leading search icon and a clear button once it holds a value. Labels and
 * placeholders come from the caller. Clearing puts focus back in the field, since the button
 * that held it unmounts with the value. With `debounce`, the search waits for a pause in the
 * typing; a `DataTable`'s state replaces the history entry for a changed search, so the pauses
 * leave one entry, not one per word.
 */
export function SearchInput({ debounce, ...props }: SearchInputProps) {
  if (debounce === undefined) return <SearchField {...props} />

  return <DebouncedSearchField debounce={debounce} {...props} />
}
