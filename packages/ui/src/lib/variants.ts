import type { CnFunction } from "cn"
import { createCn } from "cn/config"
import { createTV } from "tailwind-variants/config"

/*
 * The theme's own text sizes. Both class-merge engines only know Tailwind's steps, so without
 * this they read `text-control` as a colour and drop it beside `text-ink-muted`. An app with
 * sizes of its own extends this list in its own `cn`.
 */
export const MERGE_CONFIG = {
  extend: { theme: { text: ["2xs", "control", "copy", "figure"] } },
}

export const cn: CnFunction = createCn(MERGE_CONFIG)
export const variants = createTV({ twMergeConfig: MERGE_CONFIG })
export type { VariantProps } from "tailwind-variants"
