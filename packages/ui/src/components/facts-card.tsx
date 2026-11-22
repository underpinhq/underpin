import type { ReactNode } from "react"
import { Card } from "./card"
import { CopyButton } from "./copy-button"
import { DetailRow } from "./detail-row"
import { FormSection } from "./form-section"
import { RelativeTime, type RelativeTimeProps } from "./relative-time"

/** The stamps every record carries, shown under the facts in a block of their own. */
export interface FactsCardRecord {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  /** Defaults to "ID". */
  idLabel?: string
  /** Defaults to "Created". */
  createdLabel?: string
  /** Defaults to "Updated". */
  updatedLabel?: string
}

export interface FactsCardProps {
  title: ReactNode
  description?: ReactNode
  /** Label and value, in reading order. A null or undefined value reads as a dash. */
  facts?: [string, ReactNode][]
  /** The record's ID, with copy, then when it was created and last updated. */
  record?: FactsCardRecord
  /** The clock and language `RelativeTime` reads the record's stamps in; plain data. */
  time?: Pick<RelativeTimeProps, "locale" | "timeZone" | "hourCycle">
  /** Renders a record stamp in place of `RelativeTime`, e.g. with a product's own clocks. */
  renderTime?: (date: Date) => ReactNode
  actions?: ReactNode
}

export interface CopyFactProps {
  value: string
  /** The copy button's tooltip. */
  tooltip?: ReactNode
}

interface FactListProps {
  facts: [string, ReactNode][]
}

interface RecordTimeProps extends Pick<FactsCardProps, "time" | "renderTime"> {
  date: Date | string
}

function FactList({ facts }: FactListProps) {
  return (
    <dl className="py-3 text-xs">
      {facts.map(([label, value], index) => (
        // Facts are positional, and two may share a label, so the label cannot be the key.
        // oxlint-disable-next-line react/no-array-index-key
        <DetailRow key={index} density="compact" label={label}>
          {value ?? "–"}
        </DetailRow>
      ))}
    </dl>
  )
}

function RecordTime({ date, time, renderTime }: RecordTimeProps) {
  if (renderTime) return renderTime(new Date(date))
  return <RelativeTime date={date} {...time} />
}

/** A machine value in a facts card, in mono, with its copy button hanging into the row's end. */
export function CopyFact({ value, tooltip }: CopyFactProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="font-mono">{value}</span>
      <CopyButton value={value} tooltip={tooltip} variant="ghost" size="xs" className="-mr-1.5" />
    </span>
  )
}

/**
 * A card of read-only facts about one record, for a detail page's side column: compact label
 * and value rows, and with `record`, a closing block of the ID, Created and Updated.
 */
export function FactsCard({
  title,
  description,
  facts = [],
  record,
  time,
  renderTime,
  actions,
}: FactsCardProps) {
  return (
    <Card>
      <FormSection title={title} description={description} actions={actions}>
        {facts.length > 0 && <FactList facts={facts} />}
        {record && (
          <FactList
            facts={[
              [record.idLabel ?? "ID", <CopyFact key="id" value={record.id} />],
              [
                record.createdLabel ?? "Created",
                <RecordTime
                  key="created"
                  date={record.createdAt}
                  time={time}
                  renderTime={renderTime}
                />,
              ],
              [
                record.updatedLabel ?? "Updated",
                <RecordTime
                  key="updated"
                  date={record.updatedAt}
                  time={time}
                  renderTime={renderTime}
                />,
              ],
            ]}
          />
        )}
      </FormSection>
    </Card>
  )
}
