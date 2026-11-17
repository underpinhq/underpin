import { HugeiconsIcon, type HugeiconsProps, type IconSvgElement } from "@hugeicons/react"
import { type ComponentType, memo } from "react"

export type IconProps = Omit<HugeiconsProps, "icon" | "altIcon" | "showAlt">
export type IconComponent = ComponentType<IconProps>

/**
 * Wraps a Hugeicons definition as a plain icon component, so call sites render `<CheckIcon />`.
 * The package ships no icon registry of its own: icon choice belongs to each consuming app,
 * which names every glyph it renders once with this helper.
 *
 * Sized to `1em`, so a `size-*` class or the surrounding font size drives it, at the 1.75
 * stroke of the design's icon grid. Decorative by default, since an icon almost always sits
 * beside the label that already names it; an icon that carries the meaning on its own
 * overrides with `aria-hidden={false}`, `role="img"` and an `aria-label`. `defaults` sets props
 * every use of one glyph shares. Memoised, since a glyph almost never changes with the
 * component that renders it.
 */
export function icon(def: IconSvgElement, name: string, defaults?: IconProps): IconComponent {
  function Icon(props: IconProps) {
    return (
      <HugeiconsIcon
        icon={def}
        size="1em"
        strokeWidth={1.75}
        aria-hidden={true}
        focusable="false"
        {...defaults}
        {...props}
      />
    )
  }

  Icon.displayName = name

  return memo(Icon)
}
