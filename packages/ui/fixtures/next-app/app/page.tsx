import { AuthCard } from "@underpin/ui/auth-card"
import { Badge } from "@underpin/ui/badge"
import { BarList } from "@underpin/ui/bar-list"
import { BreakdownCard } from "@underpin/ui/breakdown-card"
import { Button } from "@underpin/ui/button"
import { ButtonGroup } from "@underpin/ui/button-group"
import { Callout, CalloutText } from "@underpin/ui/callout"
import { Card, CardFooter, CardHeader, CardPanel } from "@underpin/ui/card"
import { CodeBlock } from "@underpin/ui/code-block"
import { Collapse } from "@underpin/ui/collapse"
import { DangerZoneCard } from "@underpin/ui/danger-zone-card"
import { DetailRow } from "@underpin/ui/detail-row"
import { EmptyState } from "@underpin/ui/empty-state"
import { EntityAvatar } from "@underpin/ui/entity-avatar"
import { ErrorState } from "@underpin/ui/error-state"
import { FactsCard } from "@underpin/ui/facts-card"
import { Favicon } from "@underpin/ui/favicon"
import { FormSection } from "@underpin/ui/form-section"
import { FormattedNumber } from "@underpin/ui/formatted-number"
import { Heading } from "@underpin/ui/heading"
import { IconSwap } from "@underpin/ui/icon-swap"
import { InlineAction } from "@underpin/ui/inline-action"
import { Input } from "@underpin/ui/input"
import { Kbd } from "@underpin/ui/kbd"
import { Nav, NavLabel, NavLink, NavSeparator } from "@underpin/ui/nav"
import { NavButtonSkeleton, NavIdentity } from "@underpin/ui/nav-button"
import { NotFound } from "@underpin/ui/not-found"
import { Page } from "@underpin/ui/page"
import { PerformanceCard } from "@underpin/ui/performance-card"
import { Ping } from "@underpin/ui/ping"
import { RailBottom, RailTop, Shell } from "@underpin/ui/shell"
import { Skeleton } from "@underpin/ui/skeleton"
import { Stack } from "@underpin/ui/stack"
import { StatStrip, StatStripItem } from "@underpin/ui/stat-strip"
import { Steps } from "@underpin/ui/steps"
import { Switch } from "@underpin/ui/switch"
import { TextLink } from "@underpin/ui/text-link"
import { Textarea } from "@underpin/ui/textarea"
import { Trend } from "@underpin/ui/trend"
import { ZonedTime } from "@underpin/ui/zoned-time"
import { DataTables } from "./data-tables"

// A 1×1 PNG inline, so one favicon loads with no request and the fixture covers the loaded state.
const LOADED_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

// A server component that renders every component without "use client", each through its own
// subpath, and one client component across the boundary. `check-next` reads the markers.
export default function Home() {
  return (
    <Page>
      <Heading>Server render marker</Heading>
      <Stack>
        <Badge>Badge marker</Badge>
        <Kbd>K</Kbd>
        <Ping />
        <TextLink href="/">Link marker</TextLink>
        <InlineAction>Inline action</InlineAction>
      </Stack>

      <ButtonGroup>
        <Button>Button marker</Button>
      </ButtonGroup>

      <Callout tone="warning">
        <CalloutText>Callout marker</CalloutText>
      </Callout>

      <Card>
        <CardHeader>Card header</CardHeader>
        <CardPanel>
          <DetailRow label="Detail">
            <FormattedNumber value={1234} format={value => `${value} visits`} />
          </DetailRow>
        </CardPanel>
        <CardFooter>Card footer</CardFooter>
      </Card>

      <BreakdownCard title="Breakdown marker">
        <BarList>
          <BarList.Body>
            <BarList.Row label="Row marker" value={3} max={4} />
          </BarList.Body>
        </BarList>
      </BreakdownCard>

      <CodeBlock>code marker</CodeBlock>
      <Collapse open>Collapse marker</Collapse>
      <EmptyState title="Empty marker" />
      <ErrorState title="Error marker" />
      <NotFound title="Not found marker" />
      <AuthCard title="Auth card marker" />
      <DangerZoneCard title="Danger zone marker">
        <p>Danger row</p>
      </DangerZoneCard>
      <FactsCard title="Facts marker" facts={[["Plan", "Pro"]]} />
      <EntityAvatar name="Server Render" />
      <Favicon src="/favicon.ico" name="example.com" size="lg" label="Favicon marker" />
      <Favicon src={LOADED_ICON} name="example.com" />

      <FormSection title="Form section marker">
        <Input aria-label="Input" />
        <Textarea aria-label="Textarea" />
        <Switch aria-label="Switch" />
      </FormSection>

      <IconSwap<"on" | "off"> value="on" marks={{ on: "On", off: "Off" }} />

      <Nav>
        <NavLabel>Nav marker</NavLabel>
        <NavSeparator />
        <NavIdentity name="Identity" detail="Detail" />
        <NavButtonSkeleton />
        <NavLink href="/queue" count={5} dot="warning">
          Review queue
        </NavLink>
      </Nav>

      <Shell
        top={
          <RailTop aria-label="Current workspace">
            <NavButtonSkeleton />
          </RailTop>
        }
        nav={
          <Nav aria-label="Workspace">
            <NavLink href="/reports">Reports</NavLink>
          </Nav>
        }
        footer={<RailBottom aria-label="Account" />}
      >
        Shell marker
      </Shell>

      <PerformanceCard
        strip={
          <StatStrip variant="track">
            <StatStripItem
              label="Performance marker"
              value={12}
              trend={<Trend id="trend-marker" change={0.06} />}
            />
          </StatStrip>
        }
        isLoading
      />
      <PerformanceCard
        series={[
          { id: "visitors", label: "Series marker", value: 34, trend: <Trend change={-0.02} /> },
        ]}
        isLoading
      />
      <ZonedTime date="2026-09-20T14:58:20.000Z" timeZone="Asia/Kolkata">
        Zoned marker
      </ZonedTime>

      <Skeleton />
      <Steps current={1} total={3} />
      <DataTables />
    </Page>
  )
}
