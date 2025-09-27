import { z } from 'zod';
import { createId } from './id';

const isoDate = z
  .string()
  .min(10)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid ISO date' });

export const approvalActionSchema = z.enum([
  'created',
  'edited',
  'submitted',
  'approved',
  'rejected',
  'reverted',
  'duplicated',
]);

export type ApprovalAction = z.infer<typeof approvalActionSchema>;

export const approvalEventSchema = z.object({
  id: z.string().default(() => createId('audit')),
  actor: z.string(),
  action: approvalActionSchema,
  comment: z.string().optional(),
  timestamp: isoDate,
});

export type ApprovalEvent = z.infer<typeof approvalEventSchema>;

export const channelEnum = z.enum([
  'OOH',
  'TV',
  'BVOD_CTV',
  'Digital_Display',
  'Digital_Video',
  'Social',
  'Search',
  'Radio',
  'Streaming_Audio',
  'Podcast',
  'Cinema',
  'Print',
  'Retail_Media',
  'Influencer',
  'Sponsorship',
  'Email',
  'Direct_Mail',
  'Gaming',
  'Native',
  'Affiliate',
  'Experiential',
]);

export type Channel = z.infer<typeof channelEnum>;

export const pricingModelEnum = z.enum(['CPM', 'CPC', 'CPA', 'CPP', 'CPT', 'Fixed', 'Hybrid']);
export const goalTypeEnum = z.enum([
  'Reach',
  'GRPs_TARPs',
  'Impressions',
  'Clicks',
  'Video_Completions',
  'Installs',
  'Conversions',
  'Sales_Revenue',
]);
export const pacingEnum = z.enum(['Even', 'ASAP', 'Custom']);

export type PricingModel = z.infer<typeof pricingModelEnum>;
export type GoalType = z.infer<typeof goalTypeEnum>;

const rateUnits = ['CPM', 'CPC', 'CPA', 'CPP', 'CPT', 'Fixed'] as const;
export const rateUnitEnum = z.enum(rateUnits);

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const;

const deviceMixJson = z.array(z.object({ device: z.string(), share: z.number().min(0).max(1) })).optional();

const targetingJson = z.record(z.string(), z.unknown()).optional();

export const campaignSchema = z.object({
  campaign_id: z.string().default(() => createId('cmp')),
  brand: z.string(),
  market: z.string(),
  objective: z.string(),
  primary_kpi: z.string(),
  fiscal_period: z.string(),
});

export type Campaign = z.infer<typeof campaignSchema>;

export const flightSchema = z.object({
  flight_id: z.string().default(() => createId('flt')),
  campaign_id: z.string(),
  start_date: isoDate,
  end_date: isoDate,
  budget_total: z.number().nonnegative(),
  buy_type: z.string(),
  buying_currency: z.string(),
  fx_rate: z.number().positive(),
});

export type Flight = z.infer<typeof flightSchema>;

export const audienceSchema = z.object({
  audience_id: z.string().default(() => createId('aud')),
  definition: z.string(),
  age_range: z.string().optional(),
  gender: z.string().optional(),
  geo: z.string().optional(),
  segments_json: z.array(z.string()).default([]),
});

export type Audience = z.infer<typeof audienceSchema>;

export const vendorSchema = z.object({
  vendor_id: z.string().default(() => createId('vnd')),
  name: z.string(),
  contact_json: z.record(z.string(), z.unknown()).default({}),
  io_terms_ref: z.string().optional(),
});

export type Vendor = z.infer<typeof vendorSchema>;

export const creativeSchema = z.object({
  creative_id: z.string().default(() => createId('crv')),
  ad_name: z.string(),
  asset_uri: z.string(),
  ad_identifier: z.string().optional(),
  format: z.string(),
  duration_sec: z.number().nonnegative().optional(),
  dimensions: z.string().optional(),
  filesize_mb: z.number().nonnegative().optional(),
  language: z.string().optional(),
  captioning: z.string().optional(),
  clickthrough_url: z.string().url().optional(),
});

export type Creative = z.infer<typeof creativeSchema>;

const oohExtSchema = z.object({
  ooh_asset_id: z.string(),
  owner: z.string(),
  format: z.string(),
  digital: z.boolean(),
  loop_length_sec: z.number().nonnegative().optional(),
  slot_length_sec: z.number().nonnegative().optional(),
  share_of_voice: z.number().nonnegative().max(1).optional(),
  address: z.string(),
  suburb: z.string(),
  state: z.enum(AU_STATES),
  postcode: z.string(),
  lat: z.number().min(-90).max(90),
  long: z.number().min(-180).max(180),
  geo_precision_m: z.number().nonnegative().optional(),
  orientation_deg: z.number().min(0).max(360).optional(),
  facing: z.enum(['N', 'S', 'E', 'W']).optional(),
  illumination: z.string().optional(),
  environment: z.string().optional(),
  impressions_method: z.enum(['MOVE', 'OAS', 'Inferred']).optional(),
  weekly_imps: z.number().nonnegative().optional(),
  reach_model_ref: z.string().optional(),
  play_share: z.number().nonnegative().max(1).optional(),
  booking_ref: z.string().optional(),
  posting_windows_json: z.array(z.object({ start: isoDate, end: isoDate })).optional(),
  install_date: isoDate.optional(),
  remove_date: isoDate.optional(),
  unit_rate: z.number().nonnegative().optional(),
  production_cost: z.number().nonnegative().optional(),
  install_cost: z.number().nonnegative().optional(),
  creative_specs: z.string().optional(),
});

const tvExtSchema = z.object({
  network: z.string(),
  station: z.string().optional(),
  region: z.string().optional(),
  program: z.string().optional(),
  genre: z.string().optional(),
  daypart: z.string().optional(),
  spot_length_sec: z.number().positive(),
  spot_count: z.number().nonnegative(),
  buy_unit: z.enum(['TARP', 'GRP', 'spot', 'package']),
  target_demo: z.string().optional(),
  est_tarps_json: z.record(z.string(), z.number().nonnegative()).optional(),
  est_reach: z.number().nonnegative().optional(),
  est_freq: z.number().nonnegative().optional(),
  universe_ref: z.string().optional(),
  makegood_policy: z.string().optional(),
  preemptible: z.boolean().optional(),
  rate_card: z.number().nonnegative().optional(),
  negotiated_rate: z.number().nonnegative().optional(),
  clearance_rating: z.string().optional(),
  closed_caption: z.boolean().optional(),
});

const bvodExtSchema = z.object({
  platform: z.string(),
  device_mix_json: deviceMixJson,
  buy_type: z.enum(['program', 'genre', 'audience', 'PG', 'PMP']).optional(),
  pod_position: z.string().optional(),
  ad_pod_len: z.number().nonnegative().optional(),
  max_ads_per_pod: z.number().nonnegative().optional(),
  frequency_cap: z.number().nonnegative().optional(),
  skip_allowed: z.boolean().optional(),
  targeting_json: targetingJson,
  deal_id: z.string().optional(),
  supply_path: z.enum(['direct', 'SSP', 'exchange']).optional(),
  cpm_guarantee: z.boolean().optional(),
  tarp_guarantee: z.boolean().optional(),
  viewability_standard: z.string().optional(),
  completion_goal: z.string().optional(),
});

const digitalExtSchema = z.object({
  ad_server_placement_id: z.string().optional(),
  exchange: z.string().optional(),
  buy_type: z.enum(['open', 'PMP', 'PG']).optional(),
  deal_id: z.string().optional(),
  supply_path: z.string().optional(),
  inventory_type: z.enum(['display', 'instream', 'outstream']).optional(),
  creative_sizes_json: z.array(z.string()).optional(),
  targeting_json: targetingJson,
  brand_safety_tier: z.string().optional(),
  ivt_filtering: z.boolean().optional(),
  viewability_goal: z.string().optional(),
  bid_strategy: z.string().optional(),
  allowlist_json: z.array(z.string()).optional(),
  blocklist_json: z.array(z.string()).optional(),
  macros_json: z.record(z.string(), z.unknown()).optional(),
});

const socialExtSchema = z.object({
  platform: z.enum(['Meta', 'TikTok', 'Snap', 'X', 'LinkedIn', 'Pinterest', 'Reddit']),
  objective: z.string(),
  optimization_event: z.string().optional(),
  placements_json: z.array(z.string()).optional(),
  ad_format: z.string().optional(),
  pixel_sdk_status: z.enum(['installed', 'verified', 'missing']).optional(),
  events_mapped_json: z.record(z.string(), z.unknown()).optional(),
  bidding: z.enum(['lowest_cost', 'cost_cap', 'bid_cap']).optional(),
  attribution_window: z.string().optional(),
  audience_structure_json: targetingJson,
  brand_safety_inventory_filter: z.string().optional(),
  comment_moderation: z.boolean().optional(),
});

const searchExtSchema = z.object({
  engine: z.enum(['Google', 'Bing']),
  campaign_type: z.enum(['Search', 'PMax', 'Shopping']),
  ad_group: z.string(),
  keyword_text: z.string().optional(),
  match_type: z.string().optional(),
  negatives_json: z.array(z.string()).optional(),
  rsa_assets_json: z.record(z.string(), z.array(z.string())).optional(),
  sitelinks_json: z.array(z.string()).optional(),
  extensions_json: z.record(z.string(), z.array(z.string())).optional(),
  quality_score: z.number().nonnegative().max(10).optional(),
  shopping_feed_ref: z.string().optional(),
  bidding_strategy: z.string().optional(),
  brand_vs_generic: z.boolean().optional(),
  geo_modifiers_json: targetingJson,
  device_modifiers_json: targetingJson,
  ad_schedule_json: z.array(z.object({ day: z.string(), start: z.string(), end: z.string() })).optional(),
  conversion_actions_json: z.array(z.string()).optional(),
  data_exclusions_json: z.array(z.string()).optional(),
});

const audioExtSchema = z.object({
  network_or_platform: z.string(),
  station: z.string().optional(),
  market: z.string().optional(),
  daypart: z.string().optional(),
  spot_len_sec: z.number().positive(),
  spots: z.number().nonnegative(),
  cpp: z.number().nonnegative().optional(),
  format_genre: z.string().optional(),
  live_read: z.boolean().optional(),
  talent_name: z.string().optional(),
  companion_display: z.boolean().optional(),
  targeting_json: targetingJson,
  cpm: z.number().nonnegative().optional(),
  frequency_cap: z.number().nonnegative().optional(),
});

const podcastExtSchema = z.object({
  publisher: z.string(),
  show: z.string(),
  episode_id: z.string().optional(),
  episode_date: isoDate.optional(),
  genre: z.string().optional(),
  ad_position: z.string().optional(),
  baked_in: z.boolean().optional(),
  dynamic_insertion: z.boolean().optional(),
  talent_read: z.boolean().optional(),
  promo_code: z.string().optional(),
  tracking_link: z.string().optional(),
  estimated_downloads: z.number().nonnegative().optional(),
});

const cinemaExtSchema = z.object({
  circuit: z.string(),
  locations_json: z.array(z.string()).optional(),
  screen_count: z.number().nonnegative().optional(),
  sessions_json: z.array(z.string()).optional(),
  spot_len_sec: z.number().positive(),
  package_desc: z.string().optional(),
  copy_deadline: isoDate.optional(),
});

const printExtSchema = z.object({
  publication: z.string(),
  section: z.string().optional(),
  edition_date: isoDate,
  run_of_press: z.boolean().optional(),
  ad_size: z.string().optional(),
  dimensions: z.string().optional(),
  color_mode: z.string().optional(),
  bleed: z.boolean().optional(),
  position: z.string().optional(),
  print_run: z.number().nonnegative().optional(),
  deadline: isoDate.optional(),
  material_specs: z.string().optional(),
});

const retailMediaExtSchema = z.object({
  retailer: z.string(),
  onsite_format: z.string().optional(),
  keyword_list_json: z.array(z.string()).optional(),
  offsite_format: z.string().optional(),
  deal_id: z.string().optional(),
  catalog_feed_ref: z.string().optional(),
  sku_ids_json: z.array(z.string()).optional(),
  gtin_ean: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  attribution_source: z.string().optional(),
  sales_window_days: z.number().nonnegative().optional(),
  roas_target: z.number().nonnegative().optional(),
});

const influencerExtSchema = z.object({
  creator_handle: z.string(),
  platform: z.string(),
  follower_count: z.number().nonnegative().optional(),
  avg_views: z.number().nonnegative().optional(),
  deliverables_json: z.array(z.string()).optional(),
  usage_rights_window: z.string().optional(),
  brand_safety_review_status: z.string().optional(),
  exclusivity_terms: z.string().optional(),
  whitelisting: z.boolean().optional(),
  tracking_links_json: z.array(z.string()).optional(),
  promo_codes_json: z.array(z.string()).optional(),
  estimated_reach: z.number().nonnegative().optional(),
});

const sponsorshipExtSchema = z.object({
  property: z.string(),
  rights_package_json: z.record(z.string(), z.unknown()).optional(),
  asset_schedule_json: z.record(z.string(), z.unknown()).optional(),
  makegoods_clause: z.string().optional(),
  on_site_location: z.string().optional(),
  permits_json: z.array(z.string()).optional(),
  contract_ref: z.string().optional(),
  measurement_plan: z.string().optional(),
});

const emailDmExtSchema = z.object({
  channel_type: z.enum(['email', 'direct_mail']),
  list_source: z.string(),
  send_platform: z.string().optional(),
  audience_size: z.number().nonnegative().optional(),
  template_id: z.string().optional(),
  subject_line: z.string().optional(),
  seed_list_json: z.array(z.string()).optional(),
  send_time_local: isoDate.optional(),
  spam_checks_json: z.array(z.string()).optional(),
  list_broker: z.string().optional(),
  record_count: z.number().nonnegative().optional(),
  address_fields_json: z.array(z.string()).optional(),
  drop_date: isoDate.optional(),
  print_specs: z.string().optional(),
  response_tracking_method: z.string().optional(),
});

const gamingNativeExtSchema = z.object({
  subtype: z.enum(['gaming', 'native', 'in-app']),
  title_or_publisher: z.string(),
  ad_format: z.string().optional(),
  platform_network: z.string().optional(),
  brand_safety: z.string().optional(),
  content_series: z.string().optional(),
  headline: z.string().optional(),
  disclosure: z.string().optional(),
  linking_rules: z.string().optional(),
});

const affiliateExtSchema = z.object({
  network: z.string(),
  partner_id: z.string(),
  commission_model: z.enum(['CPS', 'CPL', 'flat']),
  promo_codes_json: z.array(z.string()).optional(),
  deeplinks_json: z.array(z.string()).optional(),
  cookie_window_days: z.number().nonnegative().optional(),
  validation_rules_json: z.record(z.string(), z.unknown()).optional(),
});

const lineItemBaseSchema = z.object({
  line_item_id: z.string().default(() => createId('li')),
  flight_id: z.string(),
  audience_id: z.string(),
  vendor_id: z.string(),
  creative_id: z.string(),
  channel: channelEnum,
  goal_type: goalTypeEnum,
  pricing_model: pricingModelEnum,
  rate_numeric: z.number().nonnegative(),
  rate_unit: rateUnitEnum,
  units_planned: z.number().nonnegative(),
  cost_planned: z.number().nonnegative(),
  pacing: pacingEnum,
  cap_rules_json: z.record(z.string(), z.unknown()).default({}),
  brand_safety_json: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional(),
});

type ExtensionKeys =
  | 'ooh_ext'
  | 'tv_ext'
  | 'bvod_ext'
  | 'digital_ext'
  | 'social_ext'
  | 'search_ext'
  | 'audio_ext'
  | 'podcast_ext'
  | 'cinema_ext'
  | 'print_ext'
  | 'retail_media_ext'
  | 'influencer_ext'
  | 'sponsorship_ext'
  | 'email_dm_ext'
  | 'gaming_native_ext'
  | 'affiliate_ext';

export const lineItemSchema = lineItemBaseSchema
  .extend({
    ooh_ext: oohExtSchema.optional(),
    tv_ext: tvExtSchema.optional(),
    bvod_ext: bvodExtSchema.optional(),
    digital_ext: digitalExtSchema.optional(),
    social_ext: socialExtSchema.optional(),
    search_ext: searchExtSchema.optional(),
    audio_ext: audioExtSchema.optional(),
    podcast_ext: podcastExtSchema.optional(),
    cinema_ext: cinemaExtSchema.optional(),
    print_ext: printExtSchema.optional(),
    retail_media_ext: retailMediaExtSchema.optional(),
    influencer_ext: influencerExtSchema.optional(),
    sponsorship_ext: sponsorshipExtSchema.optional(),
    email_dm_ext: emailDmExtSchema.optional(),
    gaming_native_ext: gamingNativeExtSchema.optional(),
    affiliate_ext: affiliateExtSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const requiredExtension: Partial<Record<Channel, ExtensionKeys>> = {
      OOH: 'ooh_ext',
      TV: 'tv_ext',
      BVOD_CTV: 'bvod_ext',
      Digital_Display: 'digital_ext',
      Digital_Video: 'digital_ext',
      Social: 'social_ext',
      Search: 'search_ext',
      Radio: 'audio_ext',
      Streaming_Audio: 'audio_ext',
      Podcast: 'podcast_ext',
      Cinema: 'cinema_ext',
      Print: 'print_ext',
      Retail_Media: 'retail_media_ext',
      Influencer: 'influencer_ext',
      Sponsorship: 'sponsorship_ext',
      Email: 'email_dm_ext',
      Direct_Mail: 'email_dm_ext',
      Gaming: 'gaming_native_ext',
      Native: 'gaming_native_ext',
      Affiliate: 'affiliate_ext',
      Experiential: 'sponsorship_ext',
    };

    const extensionKey = requiredExtension[value.channel];
    if (extensionKey && !(value as Record<string, unknown>)[extensionKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Channel ${value.channel} requires ${extensionKey} payload`,
        path: [extensionKey],
      });
    }

    const pricingToUnits: Partial<Record<PricingModel, readonly typeof rateUnits[number][]>> = {
      CPM: ['CPM'],
      CPC: ['CPC'],
      CPA: ['CPA'],
      CPP: ['CPP'],
      CPT: ['CPT'],
      Fixed: ['Fixed'],
      Hybrid: rateUnits,
    };

    const allowedUnits = pricingToUnits[value.pricing_model] ?? rateUnits;
    if (!allowedUnits.includes(value.rate_unit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${value.pricing_model} line items must use ${allowedUnits.join(', ')} rate units`,
        path: ['rate_unit'],
      });
    }
  });

export type LineItem = z.infer<typeof lineItemSchema>;

export const trackingSchema = z.object({
  line_item_id: z.string(),
  ad_server: z.enum(['CampaignManager', 'Sizmek', 'Flashtalking', 'None']).optional(),
  placement_tag: z.string().optional(),
  beacons_json: z.array(z.string()).optional(),
  verification_vendor: z.enum(['IAS', 'Moat', 'DoubleVerify', 'None']).default('None'),
  conversion_source: z.enum(['GA4', 'MMP', 'Retailer', 'MMM', 'Other']).optional(),
  kpi_targets_json: z.record(z.string(), z.unknown()).optional(),
});

export type Tracking = z.infer<typeof trackingSchema>;

export const deliveryActualSchema = z.object({
  id: z.string().default(() => createId('act')),
  line_item_id: z.string(),
  date: isoDate,
  impressions: z.number().nonnegative().optional(),
  clicks: z.number().nonnegative().optional(),
  video_starts: z.number().nonnegative().optional(),
  completed_views: z.number().nonnegative().optional(),
  viewable_imps: z.number().nonnegative().optional(),
  reach: z.number().nonnegative().optional(),
  frequency: z.number().nonnegative().optional(),
  grps_tarps_numeric: z.number().nonnegative().optional(),
  conversions: z.number().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  actual_cost: z.number().nonnegative().optional(),
  metadata_json: z.record(z.string(), z.unknown()).optional(),
});

export type DeliveryActual = z.infer<typeof deliveryActualSchema>;

export const planStatusSchema = z.enum(['Draft', 'Submitted', 'Approved', 'Rejected', 'Archived']);

export type PlanStatus = z.infer<typeof planStatusSchema>;

export const planMetaSchema = z.object({
  name: z.string(),
  code: z.string(),
  version: z.number().int().positive(),
});

export const planSchema = z
  .object({
    id: z.string().default(() => createId('plan')),
    meta: planMetaSchema,
    status: planStatusSchema,
    goal: z.object({
      budget: z.number().nonnegative(),
      reach: z.number().nonnegative(),
      frequency: z.number().nonnegative(),
    }),
    campaigns: z.array(campaignSchema),
    flights: z.array(flightSchema),
    audiences: z.array(audienceSchema),
    vendors: z.array(vendorSchema),
    creatives: z.array(creativeSchema),
    lineItems: z.array(lineItemSchema),
    tracking: z.array(trackingSchema),
    deliveryActuals: z.array(deliveryActualSchema),
    lastModified: isoDate,
    audit: z.array(approvalEventSchema),
    owner: z.string(),
    approver: z.string().optional(),
  })
  .superRefine((plan, ctx) => {
    const campaignIds = new Set(plan.campaigns.map((campaign) => campaign.campaign_id));
    const flightIds = new Map(plan.flights.map((flight) => [flight.flight_id, flight]));
    const audienceIds = new Set(plan.audiences.map((audience) => audience.audience_id));
    const vendorIds = new Set(plan.vendors.map((vendor) => vendor.vendor_id));
    const creativeIds = new Set(plan.creatives.map((creative) => creative.creative_id));

    for (const flight of plan.flights) {
      if (!campaignIds.has(flight.campaign_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Flight ${flight.flight_id} references missing campaign ${flight.campaign_id}`,
          path: ['flights'],
        });
      }
      if (new Date(flight.end_date) < new Date(flight.start_date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Flight ${flight.flight_id} end date must be after start date`,
          path: ['flights'],
        });
      }
    }

    const seenTracking = new Set<string>();
    for (const tracking of plan.tracking) {
      if (seenTracking.has(tracking.line_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Multiple tracking rows for ${tracking.line_item_id}`,
          path: ['tracking'],
        });
      }
      seenTracking.add(tracking.line_item_id);
    }

    for (const lineItem of plan.lineItems) {
      const flight = flightIds.get(lineItem.flight_id);
      if (!flight) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line item ${lineItem.line_item_id} references missing flight ${lineItem.flight_id}`,
          path: ['lineItems'],
        });
      }
      if (!audienceIds.has(lineItem.audience_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line item ${lineItem.line_item_id} references missing audience ${lineItem.audience_id}`,
          path: ['lineItems'],
        });
      }
      if (!vendorIds.has(lineItem.vendor_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line item ${lineItem.line_item_id} references missing vendor ${lineItem.vendor_id}`,
          path: ['lineItems'],
        });
      }
      if (!creativeIds.has(lineItem.creative_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line item ${lineItem.line_item_id} references missing creative ${lineItem.creative_id}`,
          path: ['lineItems'],
        });
      }
      if (!seenTracking.has(lineItem.line_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tracking is required for line item ${lineItem.line_item_id}`,
          path: ['tracking'],
        });
      }
    }

    for (const actual of plan.deliveryActuals) {
      if (!plan.lineItems.some((lineItem) => lineItem.line_item_id === actual.line_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Actuals reference unknown line item ${actual.line_item_id}`,
          path: ['deliveryActuals'],
        });
      }
    }
  });

export type Plan = z.infer<typeof planSchema>;

export function createDraftPlan(overrides?: Partial<Plan>): Plan {
  const now = new Date().toISOString();
  const base = {
    id: createId('plan'),
    meta: { name: 'New Plan', code: `PLAN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, version: 1 },
    status: 'Draft' as const,
    goal: { budget: 0, reach: 0, frequency: 0 },
    campaigns: [] as Campaign[],
    flights: [] as Flight[],
    audiences: [] as Audience[],
    vendors: [] as Vendor[],
    creatives: [] as Creative[],
    lineItems: [] as LineItem[],
    tracking: [] as Tracking[],
    deliveryActuals: [] as DeliveryActual[],
    lastModified: now,
    audit: [
      {
        id: createId('audit'),
        actor: overrides?.owner ?? 'Taylor Planner',
        action: 'created' as const,
        timestamp: now,
      },
    ],
    owner: overrides?.owner ?? 'Taylor Planner',
    approver: undefined,
  } satisfies Omit<Plan, 'id'> & { id: string };
  return planSchema.parse({ ...base, ...overrides });
}
