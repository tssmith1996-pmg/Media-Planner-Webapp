# Channel hierarchy implementation

The media plan page renders channels with a two-tier hierarchy. Each channel row summarises the
line items assigned to that channel, and expanding a row reveals all flightings with the
channel-specific columns required by trading and reporting teams.

## Summary column dictionary

`SUMMARY_COLUMNS` in `src/components/ChannelTable.tsx` defines the channel-level summary layout. The
first eight columns—Channel, Vendor/Platform, Start, End, Pricing Model, Rate, Units, and Cost
(Planned)—remain sticky while scrolling. Goal/KPI and Audience round out the core dataset, and the
Audience column now resolves to a single aggregated label so the top-level view stays comparable
across channels. The final column keeps the **View flightings** control aligned to the right edge.

`buildChannelSummaries` aggregates the raw line items to populate those columns: it rolls up start
and end dates, calculates totals, and normalises the vendor, audience, and KPI values. Channel-
specific attributes are no longer surfaced at this tier, keeping the first row lightweight while the
detailed breakouts live in the expandable section.

## Flighting column dictionary

Expanded rows render the flighting table defined by `getColumnsForChannel(channel)`. The helper
pulls the channel-specific configuration from `CHANNEL_SPECIFIC_COLUMNS` and appends the shared
financial columns (Vendor/Platform, Start, End, Objective, Units, Cost, Fees). Each channel mapping
lives close to the component so reviewers can see which extension fields drive the hierarchy, and
reusable formatters handle localisation (dates, currency, percentages) along with boolean and count
conversions.

To add a new channel type:

1. Extend `CHANNEL_SPECIFIC_COLUMNS` with the desired column metadata, reusing the helper formatters
   (e.g. `formatBoolean`, `formatFlightWindow`) where possible so values stay consistent.
2. Update `formatObjective` and/or `formatUnits` if the new channel requires a bespoke label in the
   shared financial columns.
3. If the channel introduces a new extension payload, extend
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

- Extend `CHANNEL_SPECIFIC_COLUMNS` (or the relevant builder such as `buildAudioColumns`) alongside
  `formatObjective`/`formatUnits`, and update the shared `extensionKeyByChannel` map as described
  above.
- Add representative fixtures to `src/tests/ChannelTable.test.tsx` so the unique column rendering is
  exercised in tests.
- Consider updating the `plans` seed to include at least one line item for the new channel so
  preview environments demonstrate the full hierarchy.

## Channel creation

Editable plans surface an **Add channel** action next to the table title. Triggering the dialog
provisions a minimal flight, audience, vendor, creative, tracking payload, and channel-specific
extension with placeholder values so planners can immediately start capturing details.

## Pulsed scheduling

Flight rows expose an **Edit schedule** button that launches `FlightingScheduleDialog`. The dialog
presents a week-by-week selector so planners can capture pulsing behaviour—weeks toggle between
active and dark periods, and the dialog persists the selection to
`flight.active_periods_json`. Those pulse windows feed the channel summary rollups, the details
modal, and the block plan preview inside the export dialog.
