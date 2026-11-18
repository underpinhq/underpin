import { createElement, type ReactNode, useState } from "react"
import { LINE_GLYPHS, OS_MARKS } from "./generated/glyphs.js"
import { useBrowserLogo, useFlag } from "./images.js"
import { DEVICE_TYPES, findOsMark } from "./names.js"

interface IconProps {
  /** The width and height in pixels. Defaults to 16. */
  size?: number
  className?: string
  /**
   * An accessible name. Without one the icon is decorative (`aria-hidden`), which suits an icon
   * beside its own label.
   */
  title?: string
}

interface FallbackProps {
  /** Rendered instead of the package's own glyph when there is no image, such as your own icon. */
  fallback?: ReactNode
}

function getAccessibilityProps(title: string | undefined) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true }
}

/** Lucide writes SVG attributes in kebab case. React wants camel case for the multi-word ones. */
function toReactAttributes(attributes: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  )
}

interface LineGlyphProps extends IconProps {
  name: string
}

/** A stroked 24×24 glyph from Lucide, in the current text color. */
function LineGlyph({ name, size = 16, className, title }: LineGlyphProps) {
  const elements = LINE_GLYPHS[name] ?? []

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...getAccessibilityProps(title)}
    >
      {elements.map(({ tag, attributes }, index) =>
        createElement(tag, { key: index, ...toReactAttributes(attributes) }),
      )}
    </svg>
  )
}

interface PlaceholderProps {
  width: number
  height: number
  className?: string
  title?: string
}

/**
 * A space of the icon's size, so a row keeps its layout while an image loads. With a `title` it
 * keeps the icon's accessible name.
 */
function Placeholder({ width, height, className, title }: PlaceholderProps) {
  return (
    <span
      style={{ display: "inline-block", width, height }}
      className={className}
      {...getAccessibilityProps(title)}
    />
  )
}

interface DataImageProps extends PlaceholderProps {
  src: string
  onError?: () => void
}

/** An image that loads lazily. It is decorative unless it has a `title`. */
function DataImage({ src, width, height, className, title, onError }: DataImageProps) {
  return (
    <img
      src={src}
      alt={title ?? ""}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={onError}
    />
  )
}

export interface BrowserIconProps extends IconProps, FallbackProps {
  /** A browser name, as `parseUserAgent` returns it: "Chrome", "Mobile Safari". */
  name: string | null | undefined
}

/**
 * A browser's logo, or a browser-window glyph for a browser without one. Each logo is its own
 * module, so a page loads only the logos it shows.
 */
export function BrowserIcon({
  name,
  size = 16,
  className,
  title,
  fallback,
}: BrowserIconProps): ReactNode {
  const logo = useBrowserLogo(name)

  if (logo === undefined) {
    return <Placeholder width={size} height={size} className={className} title={title} />
  }

  if (logo) {
    return <DataImage src={logo} width={size} height={size} className={className} title={title} />
  }

  return fallback ?? <LineGlyph name="browser" size={size} className={className} title={title} />
}

export interface OsIconProps extends IconProps, FallbackProps {
  /** An OS name, as `parseUserAgent` returns it: "macOS", "Android". */
  name: string | null | undefined
}

/** An operating system's mark in the current text color, or a desktop glyph for an OS without one. */
export function OsIcon({ name, size = 16, className, title, fallback }: OsIconProps): ReactNode {
  const mark = name ? findOsMark(name) : undefined
  const paths = mark ? OS_MARKS[mark] : undefined

  if (!paths) {
    return fallback ?? <LineGlyph name="desktop" size={size} className={className} title={title} />
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...getAccessibilityProps(title)}
    >
      {paths.map(path => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

export interface DeviceIconProps extends IconProps {
  /** A device type, as `parseUserAgent` returns it: "desktop", "mobile", "tablet". */
  type: string | null | undefined
}

/** A device type's glyph in the current text color. An unknown type gets the desktop glyph. */
export function DeviceIcon({ type, size = 16, className, title }: DeviceIconProps): ReactNode {
  const name = type && DEVICE_TYPES.includes(type) && type !== "embedded" ? type : "desktop"

  return <LineGlyph name={name} size={size} className={className} title={title} />
}

export interface FlagProps extends IconProps, FallbackProps {
  /** An ISO 3166-1 alpha-2 code, any case. Empty for a visit with no country. */
  code: string | null | undefined
}

/**
 * A 4:3 country flag from flag-icons, `size` pixels wide. A globe stands in for a missing code or
 * a code without a flag. Each flag is its own module, so a page loads only the flags it shows.
 */
export function Flag({ code, size = 16, className, title, fallback }: FlagProps): ReactNode {
  const flag = useFlag(code)
  const height = Math.round((size * 3) / 4)

  if (flag === undefined) {
    return <Placeholder width={size} height={height} className={className} title={title} />
  }

  if (flag) {
    return <DataImage src={flag} width={size} height={height} className={className} title={title} />
  }

  return fallback ?? <LineGlyph name="globe" size={size} className={className} title={title} />
}

export interface FaviconProps extends IconProps, FallbackProps {
  /** The site's domain, such as "example.com". */
  domain: string | null | undefined
  /**
   * Your own favicon endpoint, as a URL or a function of the domain, such as
   * ``domain => `/api/favicon/${domain}` ``. Serve it from your origin with
   * `@underpin/favicon`: this component never builds a third-party URL.
   */
  src: string | ((domain: string) => string)
}

/** The favicon URL for a domain, or an empty string without a domain. */
function getFaviconUrl(domain: string | null | undefined, src: FaviconProps["src"]): string {
  if (!domain) {
    return ""
  }

  return typeof src === "function" ? src(domain) : src
}

/** A site's favicon from your own endpoint, or a globe when it has none or fails to load. */
export function Favicon({
  domain,
  src,
  size = 16,
  className,
  title,
  fallback,
}: FaviconProps): ReactNode {
  const url = getFaviconUrl(domain, src)
  const [failedUrl, setFailedUrl] = useState<string>()

  if (!url || failedUrl === url) {
    return fallback ?? <LineGlyph name="globe" size={size} className={className} title={title} />
  }

  return (
    <DataImage
      src={url}
      width={size}
      height={size}
      className={className}
      title={title}
      onError={() => setFailedUrl(url)}
    />
  )
}
