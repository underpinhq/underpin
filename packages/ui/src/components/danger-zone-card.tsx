import type { ComponentProps, ReactNode } from "react"
import { Card } from "./card"
import { FormSection } from "./form-section"

export interface DangerZoneCardProps extends ComponentProps<typeof FormSection> {
  /** The `DangerRow`s, one per action. */
  children: ReactNode
}

/**
 * The last card of a settings page: the actions nothing brings back, one `DangerRow` each. The
 * card itself stays neutral; each row's danger button carries the warning, so the red marks
 * only what acts.
 */
export function DangerZoneCard({
  title = "Danger zone",
  description = "Actions that cannot be undone.",
  children,
  ...props
}: DangerZoneCardProps) {
  return (
    <Card>
      <FormSection title={title} description={description} {...props}>
        {children}
      </FormSection>
    </Card>
  )
}
