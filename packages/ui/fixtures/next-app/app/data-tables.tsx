"use client"

import { DataTable, DataTableRowLink } from "@underpin/ui/data-table"
import { createDataTableColumnHelper, type DataTableState } from "@underpin/ui/data-table-state"
import { TableCell, TableIdentityCell, TableNumberCell } from "@underpin/ui/table"
import { useState } from "react"

interface Site {
  id: string
  name: string
  visitors: number
  plan: string
}

const SITES: Site[] = [
  { id: "site_1", name: "Paged data table marker", visitors: 1204, plan: "Pro" },
  { id: "site_2", name: "linear.app", visitors: 980, plan: "Team" },
]

const EVENTS: Site[] = [
  { id: "event_1", name: "Infinite data table marker", visitors: 3, plan: "Free" },
]

const helper = createDataTableColumnHelper<Site>()

const COLUMNS = helper.columns([
  helper.accessor("name", {
    header: "Site",
    enableHiding: false,
    meta: { sortable: true },
    cell: ({ getValue }) => (
      <TableIdentityCell title={<DataTableRowLink>{getValue()}</DataTableRowLink>} />
    ),
  }),
  helper.accessor("visitors", {
    header: "Visitors",
    meta: { align: "end", width: "6rem", sortable: true },
    cell: ({ getValue }) => <TableNumberCell>{getValue()}</TableNumberCell>,
  }),
  helper.accessor("plan", {
    header: "Plan",
    meta: { width: "8rem", priority: "medium" },
    cell: ({ getValue }) => <TableCell>{getValue()}</TableCell>,
  }),
])

function getSiteId(site: Site) {
  return site.id
}

function loadMore() {}

// A client component across the server boundary: one `DataTable` in each footer mode.
export function DataTables() {
  const [state, setState] = useState<DataTableState>({ page: 1, perPage: 25 })

  return (
    <>
      <DataTable
        aria-label="Sites"
        columns={COLUMNS}
        data={SITES}
        getRowId={getSiteId}
        getRowHref={site => `/sites/${site.id}`}
        state={state}
        pagination={{ type: "pages", total: 60 }}
        enableRowSelection
        onStateChange={setState}
      />
      <DataTable
        aria-label="Events"
        columns={COLUMNS}
        data={EVENTS}
        getRowId={getSiteId}
        size="compact"
        state={{}}
        pagination={{
          type: "infinite",
          hasMore: false,
          isLoadingMore: false,
          onLoadMore: loadMore,
        }}
        onStateChange={() => {}}
      />
    </>
  )
}
