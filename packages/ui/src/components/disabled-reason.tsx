"use client"

import {
  cloneElement,
  type ComponentProps,
  type PointerEvent,
  type ReactElement,
  type SyntheticEvent,
  useId,
} from "react"
import { formatIdList } from "../lib/aria"
import { showTooltip, Tooltip } from "./tooltip"

type BaseUIEvent = SyntheticEvent & { preventBaseUIHandler?: () => void }

/**
 * Stops the handler a Base UI trigger runs after this one. A menu or a select opens on
 * mousedown or an arrow key, not only on a click.
 */
function stopBaseUI(event: BaseUIEvent) {
  event.preventBaseUIHandler?.()
}

/**
 * What a control needs to carry its reason: the id for its `Tooltip`, its `aria-describedby`
 * with the reason added, the hidden element holding the reason, and a pointer-up handler that
 * opens the tooltip on a tap, for a control kept `disabled`, which never turns a tap into a click.
 */
export function useDisabledReason(reason: string | undefined, describedBy?: string) {
  const id = useId()
  const triggerId = `${id}-trigger`

  function onPointerUp(event: PointerEvent) {
    if (reason && event.pointerType !== "mouse") showTooltip(triggerId)
  }

  return {
    triggerId,
    describedBy: formatIdList(describedBy, !!reason && id),
    onPointerUp,
    reasonText: reason && (
      <span id={id} hidden>
        {reason}
      </span>
    ),
  }
}

interface DisabledReasonProps {
  /** Why the control cannot run. Left empty, the control renders as it is. */
  reason?: string
  side?: ComponentProps<typeof Tooltip>["side"]
  children: ReactElement<{ "aria-describedby"?: string }>
}

/**
 * Keeps a control that cannot run in place and says why. The control takes `aria-disabled`
 * instead of `disabled`, so it still takes focus and the pointer: a screen reader reads the
 * reason through `aria-describedby`, a pointer or a keyboard focus gets it in a tooltip, and a
 * tap opens the tooltip too. A click, or the Enter or Space that becomes one, does nothing
 * while the reason stands, a link or a Base UI trigger included. A text field under a reason
 * also needs `readOnly`, which only its own component can set.
 */
export function DisabledReason({ reason, side = "top", children }: DisabledReasonProps) {
  const { triggerId, describedBy, reasonText } = useDisabledReason(
    reason,
    children.props["aria-describedby"],
  )

  if (!reason) return children

  return (
    <>
      <Tooltip id={triggerId} tooltip={reason} side={side}>
        {cloneElement(children, {
          disabled: false,
          "aria-disabled": true,
          "aria-describedby": describedBy,
          onClick: (event: BaseUIEvent) => {
            event.preventDefault()
            stopBaseUI(event)
            showTooltip(triggerId)
          },
          onMouseDown: stopBaseUI,
          onKeyDown: stopBaseUI,
        } as Record<string, unknown>)}
      </Tooltip>

      {reasonText}
    </>
  )
}
