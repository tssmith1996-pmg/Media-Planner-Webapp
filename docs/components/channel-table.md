# Channel hierarchy implementation

The media plan page renders channels with a two-tier hierarchy. Each channel row summarises the
line items assigned to that channel, and expanding a row reveals all flightings with the
channel-specific columns required by trading and reporting teams.

## Column dictionary

`src/components/ChannelTable.tsx` now builds each channel's flighting table from a shared
`getColumnsForChannel(channel)` helper. The helper always emits the required columns—Vendor,
placement detail, objective, units planned, cost, and fees—while delegating to channel-specific
formatters for the placement and objective strings.

To add a new channel type:

1. Update `placementLabel`, `formatPlacementDetail`, `formatObjective`, or `formatUnits` with the
   new channel's nuances so the base columns surface the correct contextual values.
2. If the channel introduces a new extension payload, extend
   `extensionKeyByChannel` in `src/lib/channelExtensions.ts` so both the table and details modal can
   access the structured data.

## Lazy flighting queries

Channel expansion is powered by `useChannelFlightings(planId, channel)` from `src/api/plans.ts`.
The hook reads the plan from the store on demand, filters the line items for the requested channel
and caches the result for five minutes with React Query. The table only invokes the hook when a
channel is expanded, keeping the default render path lightweight.

## Flighting details modal

`FlightDetailsModal` presents the full payload in grouped sections. The modal reads the same
`extensionKeyByChannel` mapping to render channel-specific metadata, ensures currency and date
formatting use the `en-AU` locale, and uses the shared `Modal` primitive to trap focus and restore
it to the triggering disclosure button.

## Extending the experience

When adding support for a new channel type:

- Extend the `getColumnsForChannel` helpers (`placementLabel`, `formatPlacementDetail`,
  `formatObjective`, `formatUnits`) and the shared `extensionKeyByChannel` map as described above.
- Add representative fixtures to `src/tests/ChannelTable.test.tsx` so the unique column rendering is
  exercised in tests.
- Consider updating the `plans` seed to include at least one line item for the new channel so
  preview environments demonstrate the full hierarchy.

## Budget share & channel creation

Editable plans surface an **Add channel** action next to the table title. Triggering the dialog
provisions a minimal flight, audience, vendor, creative, tracking payload, and channel-specific
extension with placeholder values so planners can immediately start capturing details. Each summary
row now reports the channel's share of total planned budget (the new *Budget %* column) to replace
the retired summary sidebar.

## Pulsed scheduling

Flight rows expose an **Edit schedule** button that launches `FlightingScheduleDialog`. The dialog
presents a week-by-week selector so planners can capture pulsing behaviour—weeks toggle between
active and dark periods, and the dialog persists the selection to
`flight.active_periods_json`. Those pulse windows feed the channel summary rollups, the details
modal, and the block plan preview inside the export dialog.
