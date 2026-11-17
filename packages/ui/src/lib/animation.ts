/**
 * Timing for the JS-driven chart updates, matching the CSS transitions. `easeOutExpo` is the
 * curve behind the `--ease-out-expo` CSS token; JS cannot read a Tailwind theme token, so the
 * curve is restated here, and a change to one is a change to both. The chart renderer honours
 * `prefers-reduced-motion` on its own.
 */
export const ANIMATION_DURATION = 250

export function easeOutExpo(progress: number) {
  return progress >= 1 ? 1 : 1 - 2 ** (-10 * progress)
}

/** The tween every chart moves with, in the shape the chart renderer's `motion()` takes. */
export const CHART_TRANSITION = {
  type: "tween",
  duration: ANIMATION_DURATION,
  easing: easeOutExpo,
} as const
