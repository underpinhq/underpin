"use client"

import { type ComponentProps, useImperativeHandle, useRef } from "react"
import { CancelIcon, SearchIcon } from "../lib/icons"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { Input } from "./input"

type SearchInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
}

/**
 * Text input with a leading search icon and a clear button once it holds a value. Labels and
 * placeholders come from the caller. Clearing puts focus back in the field, since the button
 * that held it unmounts with the value.
 */
export function SearchInput({ ref, value, onValueChange, className, ...props }: SearchInputProps) {
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
