"use client"

import {
  type Announcements,
  closestCenter,
  DndContext,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  DragOverlay,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  type PointerSensorProps,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  type AnimateLayoutChanges,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type TouchEvent,
  use,
  useState,
} from "react"
import { GripIcon } from "../lib/icons"
import { cn } from "../lib/variants"

/**
 * What picks an item up. `box`: the whole item for a pointer, after some movement so a click
 * still reaches its links, and the grip for the keyboard, which then drags it with the arrow
 * keys. `handle`: only the grip, for an item full of fields the pointer has to keep. The arrow
 * keys on that grip move the item one place at once, with no pick-up: a dialog stops arrow keys
 * at its popup, short of the document a keyboard drag listens on. `both`: the whole item as in
 * `box`, except that a finger on the grip lifts it after 2px of movement rather than a long
 * press, and the arrow keys on the grip move it one place, as in `handle`.
 */
export type SortableActivator = "box" | "handle" | "both"

/** What a `SortableList` tells the items inside it. */
interface SortableListSettings {
  activator: SortableActivator
  /** Whether a lifted copy follows the pointer while the item stays behind as its slot. */
  lifted: boolean
  /** Moves the item one place up (-1) or down (1), for the arrow keys on a stepping grip. */
  step: (id: string, offset: -1 | 1) => void
}

const SortableListContext = createContext<SortableListSettings>({
  activator: "handle",
  lifted: false,
  step: () => {},
})

/**
 * The lifted copy's flight into the slot it was dropped on, while the item's own box waits
 * hidden there. It reaches the new slot only when the drop and the new order render together.
 */
const DROP_ANIMATION: DropAnimation = {
  duration: 250,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } }),
}

/** Marks the grip, so a finger that starts on it skips the long press the whole item waits for. */
const GRIP_ATTRIBUTE = "data-sortable-grip"

function isOnGrip(event: Event) {
  return event.target instanceof Element && event.target.closest(`[${GRIP_ATTRIBUTE}]`) !== null
}

/**
 * The finger for a `both` list. On the grip it lifts the item after 2px of movement, so a tap
 * stays a tap; anywhere else it waits for the long press, so a swipe still scrolls.
 */
class GripTouchSensor extends TouchSensor {
  constructor(props: PointerSensorProps) {
    const options = isOnGrip(props.event)
      ? { ...props.options, activationConstraint: { distance: 2 } }
      : props.options
    super({ ...props, options })
  }
}

/**
 * Keeps a row that moves itself on its column and inside its parent element, so it never slides
 * over the label above the list or the button below it. The parent is the list's own box: a
 * caller wraps the rows in one.
 */
function keepInList({ transform, draggingNodeRect, containerNodeRect }: Parameters<Modifier>[0]) {
  if (!draggingNodeRect || !containerNodeRect) return { ...transform, x: 0 }
  const top = containerNodeRect.top - draggingNodeRect.top
  const bottom = containerNodeRect.bottom - draggingNodeRect.bottom
  return { ...transform, x: 0, y: Math.min(Math.max(transform.y, top), bottom) }
}

/**
 * Animates the items that make room, but not the one just dropped under a lifted copy, which
 * would slide in from its old slot while the copy flies into its new one.
 */
function animateUnderLiftedCopy(args: Parameters<AnimateLayoutChanges>[0]) {
  if (args.wasDragging) return false
  return defaultAnimateLayoutChanges(args)
}

interface SortableListProps {
  /** Every item's id, in the order the items show. */
  ids: string[]
  /** Whether the items stack as rows or wrap as a grid. */
  layout: "list" | "grid"
  /** What an item is called in what the screen reader hears: "site", "step". */
  noun: string
  /** What the screen reader names the item at an index. */
  describe: (index: number) => string | undefined
  activator: SortableActivator
  /** No item moves while true, and the handles stop answering. */
  disabled?: boolean
  /**
   * The copy that follows the pointer, while the item's own box stays behind as its slot.
   * Without one, the item itself moves.
   */
  renderOverlay?: (index: number) => ReactNode
  onMove: (from: number, to: number) => void
  children: ReactNode
}

/**
 * Lets the reader drag a list into their own order. A pointer that picks up a whole item does so
 * once it moves 6px, so a click still reaches the item's links, and a finger after a 250ms
 * press, so a swipe still scrolls. A grip in a `handle` list, and a finger on the grip in a
 * `both` list, picks its item up after 2px, since the grip does nothing else.
 * The keyboard always starts from the grip: in a `box` list it drags the item, in the others it
 * moves the item one place per arrow key. Each item reads its part through `useSortableItem`.
 */
export function SortableList({
  ids,
  layout,
  noun,
  describe,
  activator,
  disabled,
  renderOverlay,
  onMove,
  children,
}: SortableListProps) {
  const [activeId, setActiveId] = useState<string>()
  // What the screen reader hears after an arrow key moves a grip's item.
  const [stepped, setStepped] = useState("")
  // Whether the whole item takes a pointer, and whether the arrow keys drag it rather than step.
  const box = activator !== "handle"
  const keyboardDrags = activator === "box"
  const keyboard = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: box ? 6 : 2 } }),
    useSensor(activator === "both" ? GripTouchSensor : TouchSensor, {
      activationConstraint: box ? { delay: 250, tolerance: 5 } : { distance: 2 },
    }),
    keyboardDrags ? keyboard : undefined,
  )

  function at(id: UniqueIdentifier) {
    const index = ids.indexOf(String(id))
    return `${describe(index) ?? `The ${noun}`}, position ${index + 1} of ${ids.length}`
  }

  const announcements: Announcements = {
    onDragStart: event => `Picked up ${at(event.active.id)}.`,
    onDragOver: event => (event.over ? `Over ${at(event.over.id)}.` : undefined),
    onDragEnd: event =>
      event.over ? `Dropped the ${noun} at ${at(event.over.id)}.` : `The ${noun} was dropped.`,
    onDragCancel: () => "Move cancelled.",
  }

  const instructions = keyboardDrags
    ? [
        `To pick up a ${noun}, press Space or Enter.`,
        "Use the arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel.",
      ].join(" ")
    : `To move the ${noun} up or down, press the arrow keys.`

  function step(id: string, offset: -1 | 1) {
    if (disabled) return
    const from = ids.indexOf(id)
    const to = from + offset
    if (from < 0 || to < 0 || to >= ids.length) return
    onMove(from, to)
    setStepped(`Moved ${describe(from) ?? `the ${noun}`} to position ${to + 1} of ${ids.length}.`)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={layout === "list" && !renderOverlay ? [keepInList] : undefined}
      // In the body rather than in place, so a divided list card draws no line above the
      // screen reader's hidden text. A server render has no body, and dnd-kit draws its live
      // region only once mounted.
      accessibility={{
        announcements,
        container: typeof document === "undefined" ? undefined : document.body,
        screenReaderInstructions: { draggable: instructions },
      }}
      onDragStart={event => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(undefined)}
      onDragEnd={event => {
        setActiveId(undefined)
        if (!event.over) return
        const from = ids.indexOf(String(event.active.id))
        const to = ids.indexOf(String(event.over.id))
        if (from < 0 || to < 0 || from === to) return
        onMove(from, to)
      }}
    >
      <SortableListContext value={{ activator, lifted: !!renderOverlay, step }}>
        <SortableContext
          items={ids}
          strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}
          disabled={disabled}
        >
          {children}
        </SortableContext>
      </SortableListContext>

      {!keyboardDrags && (
        <span aria-live="assertive" className="sr-only">
          {stepped}
        </span>
      )}

      {renderOverlay && (
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeId !== undefined && renderOverlay(ids.indexOf(activeId))}
        </DragOverlay>
      )}
    </DndContext>
  )
}

/**
 * One item's part in a `SortableList`: the props for the box that moves (`box`) and for its grip
 * (`handle`, which `DragHandle` takes as `sortable`), and whether it is the one being dragged.
 */
export function useSortableItem(id: string) {
  const { activator, lifted, step } = use(SortableListContext)
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: lifted ? animateUnderLiftedCopy : defaultAnimateLayoutChanges,
  })

  const pointer = {
    onMouseDown: (event: MouseEvent) => listeners?.onMouseDown?.(event),
    onTouchStart: (event: TouchEvent) => listeners?.onTouchStart?.(event),
  }

  return {
    isDragging,
    box: {
      ref: setNodeRef,
      style: { transform: CSS.Translate.toString(transform), transition },
      ...(activator !== "handle" && pointer),
    },
    handle: {
      ref: setActivatorNodeRef,
      ...attributes,
      ...(activator === "handle" && pointer),
      [GRIP_ATTRIBUTE]: "",
      onKeyDown: (event: KeyboardEvent) => {
        if (activator === "box") {
          listeners?.onKeyDown?.(event)
          return
        }
        const offset = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : undefined
        if (!offset) return
        event.preventDefault()
        step(id, offset)
      },
    },
  }
}

export type SortableItem = ReturnType<typeof useSortableItem>

interface DragHandleProps {
  /** What the grip moves, for the screen reader: "Reorder Pricing". */
  label: string
  /** The item's part from `useSortableItem`; without one the grip draws but does nothing. */
  sortable: SortableItem | undefined
  className?: string
  /** A press that ends without a drag, by pointer, finger or key. */
  onClick?: MouseEventHandler<HTMLButtonElement>
  /** A press with another button than the main one, such as a middle click. */
  onAuxClick?: MouseEventHandler<HTMLButtonElement>
}

/**
 * The grip that moves its item, by the keyboard always, by the pointer in a list whose
 * `activator` is `handle`, and by the finger in a `handle` or `both` list. A phone sheet leaves
 * a drag that starts on it alone, rather than taking it as a swipe to close.
 */
export function DragHandle({ label, sortable, className, onClick, onAuxClick }: DragHandleProps) {
  return (
    <button
      type="button"
      {...sortable?.handle}
      aria-label={label}
      data-base-ui-swipe-ignore=""
      className={cn(
        "flex shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-ink-muted active:cursor-grabbing",
        className,
      )}
      onClick={onClick}
      onAuxClick={onAuxClick}
    >
      <GripIcon className="size-4" />
    </button>
  )
}
