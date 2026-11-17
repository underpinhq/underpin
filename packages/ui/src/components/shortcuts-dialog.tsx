"use client"

import { useRef, useState } from "react"
import { eyebrowClasses } from "../lib/classes"
import { matchesMedia, POINTER_FINE } from "../lib/media"
import { formatKeys, useShortcutList } from "../lib/shortcuts"
import { cn } from "../lib/variants"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "./dialog"
import { EmptyState } from "./empty-state"
import { SearchInput } from "./search-input"
import { ShortcutKeys } from "./shortcut-keys"

interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The one reference list of every shortcut mounted right now, read straight off the registry in
 * `lib/shortcuts`. Nothing to wire: whatever a page registers shows up here, grouped.
 */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const groups = useShortcutList()
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const query = search.trim().toLowerCase()

  const matches = groups
    .map(group => ({
      group: group.group,
      shortcuts: group.shortcuts.filter(shortcut => {
        const haystack = [shortcut.label, group.group, ...formatKeys(shortcut.keys)]
        return haystack.join(" ").toLowerCase().includes(query)
      }),
    }))
    .filter(group => group.shortcuts.length > 0)

  // The search is scoped to one visit: whatever was typed goes when the dialog is dismissed.
  function handleOpenChange(next: boolean) {
    if (!next) setSearch("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="2xl"
        instant
        // The sheet on a phone is a coarse-pointer surface: focusing the field there throws up
        // the on-screen keyboard over the list it is meant to filter.
        initialFocus={() => (matchesMedia(POINTER_FINE) ? searchRef.current : true)}
      >
        {/* Sticky rather than a fixed-height scrolling body: a multi-column box with a capped
            height spills into a THIRD column and scrolls sideways, so the list keeps its natural
            height, the popup does the scrolling, and the header rides along. */}
        <DialogHeader
          bordered
          className="sticky top-0 z-20 bg-surface"
          title="Keyboard shortcuts"
          description="Press ? anywhere to open this list."
        />

        <div className="border-b bg-surface px-6 py-3">
          <SearchInput
            ref={searchRef}
            value={search}
            onValueChange={setSearch}
            placeholder="Search shortcuts"
            aria-label="Search shortcuts"
          />
        </div>

        <div className="gap-x-10 px-6 py-5 sm:columns-2">
          {matches.length === 0 ? (
            <EmptyState variant="inline" title="No shortcuts match" />
          ) : (
            matches.map(group => (
              <div key={group.group} className="mb-5 break-inside-avoid last:mb-0">
                <p className={cn(eyebrowClasses, "mb-1")}>{group.group}</p>

                {group.shortcuts.map(shortcut => (
                  <div
                    key={`${shortcut.keys} ${shortcut.label}`}
                    className="flex items-center justify-between gap-6 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink-secondary">{shortcut.label}</span>

                    <ShortcutKeys keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Desktop only: a sheet closes by its X or a swipe, so a band across its foot would
            only take room from the list. Sticky like the header, since the popup itself is
            what scrolls here. */}
        <DialogFooter className="sticky bottom-0 z-20 max-sm:hidden">
          <DialogClose variant="primary">Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
