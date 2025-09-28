import { channelTableConfig } from '@/config/channelTableConfig';
import {
  planSchema,
  channelEnum,
  pricingModelEnum,
  type Plan,
  type Channel,
  type LineItem,
  type Flight,
  type Vendor,
  type Audience,
  type PricingModel,
} from '@/lib/schemas';
import { percentFormatter } from '@/lib/formatters';
import { syncBlockPlanToFlight } from '@/lib/blockPlan';

type FieldPath = string;

type FlightingValue = string | number | boolean | null | undefined;

type FlightingRowContext = {
  plan: Plan;
  lineItem: LineItem;
  flight?: Flight;
  vendor?: Vendor;
  audience?: Audience;
};

type FieldWriteResult = {
  plan: Plan;
  lineItem: LineItem;
  flight?: Flight;
  vendor?: Vendor;
  audience?: Audience;
};

type FlightingFieldResolver = {
  read: (context: FlightingRowContext) => FlightingValue;
  write?: (context: FlightingRowContext, value: FlightingValue) => FieldWriteResult;
  validate?: (value: FlightingValue, context: FlightingRowContext) => string | null;
};

type ChannelSummary = {
  channel: Channel;
  startDate: string | null;
  endDate: string | null;
  totalPlannedCost: number;
  budgetPercent: number;
  lineItemIds: string[];
};

type ValidationIssue = {
  field: string;
  message: string;
};

const extensionDefaultsByKey: Record<string, () => Record<string, unknown>> = {
  ooh_ext: () => ({
    ooh_asset_id: '',
    owner: '',
    format: '',
    digital: false,
    address: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    lat: 0,
    long: 0,
  }),
  tv_ext: () => ({
    network: '',
    spot_length_sec: 30,
    spot_count: 0,
    buy_unit: 'spot',
  }),
  bvod_ext: () => ({
    platform: '',
    buy_type: 'audience',
  }),
  digital_ext: () => ({
    inventory_type: 'display',
  }),
  social_ext: () => ({
    platform: '',
  }),
  search_ext: () => ({
    engine: 'Google',
    campaign_type: 'Search',
    ad_group: 'Default',
  }),
  audio_ext: () => ({
    network_or_platform: '',
    spot_len_sec: 30,
    spots: 0,
  }),
  podcast_ext: () => ({
    publisher: '',
    show: '',
  }),
  cinema_ext: () => ({
    circuit: '',
    spot_len_sec: 30,
  }),
  print_ext: () => ({
    publication: '',
    edition_date: new Date().toISOString().slice(0, 10),
  }),
  retail_media_ext: () => ({
    retailer: '',
    onsite_format: '',
  }),
  influencer_ext: () => ({
    creator_handle: '',
    platform: '',
  }),
  sponsorship_ext: () => ({
    property: '',
  }),
  email_dm_ext: () => ({
    channel_type: 'email',
    list_source: '',
  }),
  gaming_native_ext: () => ({
    subtype: 'gaming',
    title_or_publisher: '',
  }),
  affiliate_ext: () => ({
    network: '',
    partner_id: '',
    commission_model: 'CPS',
  }),
};

function clonePlan(plan: Plan): Plan {
  return planSchema.parse(JSON.parse(JSON.stringify(plan)));
}

function mutatePlan(context: FlightingRowContext, mutate: (draft: FlightingRowContext) => void): FieldWriteResult {
  const draft = clonePlan(context.plan);
  const lineIndex = draft.lineItems.findIndex((item) => item.line_item_id === context.lineItem.line_item_id);
  if (lineIndex === -1) {
    throw new Error(`Line item ${context.lineItem.line_item_id} not found`);
  }
  const draftContext: FlightingRowContext = {
    plan: draft,
    lineItem: draft.lineItems[lineIndex],
    flight: context.flight
      ? draft.flights.find((item) => item.flight_id === context.flight?.flight_id)
      : undefined,
    vendor: context.vendor
      ? draft.vendors.find((item) => item.vendor_id === context.vendor?.vendor_id)
      : undefined,
    audience: context.audience
      ? draft.audiences.find((item) => item.audience_id === context.audience?.audience_id)
      : undefined,
  };

  mutate(draftContext);

  draft.lineItems[lineIndex] = draftContext.lineItem;
  if (draftContext.flight) {
    const flightIndex = draft.flights.findIndex((item) => item.flight_id === draftContext.flight?.flight_id);
    if (flightIndex >= 0) draft.flights[flightIndex] = draftContext.flight;
  }
  if (draftContext.vendor) {
    const vendorIndex = draft.vendors.findIndex((item) => item.vendor_id === draftContext.vendor?.vendor_id);
    if (vendorIndex >= 0) draft.vendors[vendorIndex] = draftContext.vendor;
  }
  if (draftContext.audience) {
    const audienceIndex = draft.audiences.findIndex((item) => item.audience_id === draftContext.audience?.audience_id);
    if (audienceIndex >= 0) draft.audiences[audienceIndex] = draftContext.audience;
  }

  return draftContext;
}

function readByPath(context: FlightingRowContext, path: FieldPath): FlightingValue {
  const segments = path.split('.');
  let target: unknown = context;
  for (const segment of segments) {
    if (target == null || typeof target !== 'object') return undefined;
    target = (target as Record<string, unknown>)[segment];
  }
  return target as FlightingValue;
}

function writeByPath(context: FlightingRowContext, path: FieldPath, value: FlightingValue): FieldWriteResult {
  return mutatePlan(context, (draft) => {
    const segments = path.split('.');
    let target: Record<string, unknown> = draft as unknown as Record<string, unknown>;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      const next = target[segment];
      if (next == null || typeof next !== 'object') {
        const factory = extensionDefaultsByKey[segment];
        target[segment] = factory ? factory() : {};
      }
      target = target[segment] as Record<string, unknown>;
    }
    target[segments.at(-1) ?? ''] = value as unknown;
  });
}

function createPathResolver(path: FieldPath, options?: {
  validate?: FlightingFieldResolver['validate'];
  transformWrite?: (value: FlightingValue, context: FlightingRowContext) => FlightingValue;
  transformRead?: (value: FlightingValue, context: FlightingRowContext) => FlightingValue;
}): FlightingFieldResolver {
  return {
    read: (context) => {
      const raw = readByPath(context, path);
      return options?.transformRead ? options.transformRead(raw, context) : raw;
    },
    write: (context, value) => {
      const nextValue = options?.transformWrite ? options.transformWrite(value, context) : value;
      return writeByPath(context, path, nextValue);
    },
    validate: options?.validate,
  };
}

function registerChannelResolver(channel: Channel, field: string, resolver: FlightingFieldResolver) {
  if (!channelResolvers[channel]) {
    channelResolvers[channel] = {};
  }
  channelResolvers[channel]![field] = resolver;
}

const commonResolvers: Record<string, FlightingFieldResolver> = {
  vendor_platform: createPathResolver('vendor.name', {
    validate: (value) => {
      if (!value || String(value).trim().length === 0) {
        return 'Vendor is required';
      }
      return null;
    },
  }),
  start_date: {
    read: (context) => context.flight?.start_date ?? null,
    write: (context, value) => {
      if (!value) throw new Error('Start date required');
      return mutatePlan(context, (draft) => {
        if (!draft.flight) {
          throw new Error('Missing flight for update');
        }
        draft.flight = { ...draft.flight, start_date: String(value) };
      });
    },
    validate: (value, context) => {
      if (!value) return 'Start date is required';
      const start = new Date(String(value));
      if (Number.isNaN(start.getTime())) return 'Invalid start date';
      if (context.flight?.end_date && start > new Date(context.flight.end_date)) {
        return 'Start must be before end';
      }
      return null;
    },
  },
  end_date: {
    read: (context) => context.flight?.end_date ?? null,
    write: (context, value) => {
      if (!value) throw new Error('End date required');
      return mutatePlan(context, (draft) => {
        if (!draft.flight) {
          throw new Error('Missing flight for update');
        }
        draft.flight = { ...draft.flight, end_date: String(value) };
      });
    },
    validate: (value, context) => {
      if (!value) return 'End date is required';
      const end = new Date(String(value));
      if (Number.isNaN(end.getTime())) return 'Invalid end date';
      if (context.flight?.start_date && end < new Date(context.flight.start_date)) {
        return 'End must be after start';
      }
      return null;
    },
  },
  pricing_model: {
    read: (context) => context.lineItem.pricing_model,
    write: (context, value) => {
      const next = pricingModelEnum.parse(value);
      return mutatePlan(context, (draft) => {
        draft.lineItem = { ...draft.lineItem, pricing_model: next };
      });
    },
    validate: (value) => {
      if (!value) return 'Pricing model is required';
      if (!pricingModelEnum.options.includes(value as PricingModel)) {
        return 'Invalid pricing model';
      }
      return null;
    },
  },
  rate: createPathResolver('lineItem.rate_numeric', {
    transformWrite: (value) => {
      const numeric = Number(value ?? 0);
      if (!Number.isFinite(numeric) || numeric < 0) return 0;
      return numeric;
    },
    validate: (value, context) => {
      if (value == null || value === '') {
        return context.lineItem.pricing_model === 'Fixed' ? null : 'Rate required';
      }
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return 'Rate must be non-negative';
      }
      return null;
    },
  }),
  units_planned: createPathResolver('lineItem.units_planned', {
    transformWrite: (value) => {
      const numeric = Number(value ?? 0);
      if (!Number.isFinite(numeric) || numeric < 0) return 0;
      return numeric;
    },
    validate: (value) => {
      if (value == null || value === '') return null;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return 'Units must be non-negative';
      return null;
    },
  }),
  planned_cost: createPathResolver('lineItem.cost_planned', {
    transformWrite: (value) => {
      const numeric = Number(value ?? 0);
      if (!Number.isFinite(numeric) || numeric < 0) return 0;
      return numeric;
    },
    validate: (value) => {
      if (value == null || value === '') return 'Planned cost required';
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return 'Planned cost must be non-negative';
      return null;
    },
  }),
  primary_kpi: createPathResolver('lineItem.goal_type'),
  audience_label: createPathResolver('audience.definition'),
};

const channelResolvers: Partial<Record<Channel, Record<string, FlightingFieldResolver>>> = {};

const channelPathResolvers: Partial<Record<Channel, Record<string, FieldPath>>> = {
  OOH: {
    owner: 'lineItem.ooh_ext.owner',
    format: 'lineItem.ooh_ext.format',
    sites: 'lineItem.units_planned',
    weekly_imps: 'lineItem.ooh_ext.weekly_imps',
  },
  TV: {
    network_region: 'lineItem.tv_ext.network',
    program_or_daypart: 'lineItem.tv_ext.program',
    spot_length_sec: 'lineItem.tv_ext.spot_length_sec',
    spots: 'lineItem.tv_ext.spot_count',
    buy_unit: 'lineItem.tv_ext.buy_unit',
    target_demo: 'lineItem.tv_ext.target_demo',
  },
  BVOD_CTV: {
    platform: 'lineItem.bvod_ext.platform',
    buy_type: 'lineItem.bvod_ext.buy_type',
    pod_position: 'lineItem.bvod_ext.pod_position',
    viewability_standard: 'lineItem.bvod_ext.viewability_standard',
  },
  Digital_Display: {
    exchange_or_deal: 'lineItem.digital_ext.deal_id',
    inventory_type: 'lineItem.digital_ext.inventory_type',
    creative_sizes: 'lineItem.digital_ext.creative_sizes',
    targeting_short: 'lineItem.digital_ext.targeting_json',
    brand_safety_tier: 'lineItem.digital_ext.brand_safety',
  },
  Digital_Video: {
    exchange_or_deal: 'lineItem.digital_ext.deal_id',
    inventory_type: 'lineItem.digital_ext.inventory_type',
    pod_or_position: 'lineItem.digital_ext.pod_position',
    brand_safety_tier: 'lineItem.digital_ext.brand_safety',
  },
  Social: {
    platform: 'lineItem.social_ext.platform',
    objective: 'lineItem.social_ext.objective',
    format: 'lineItem.social_ext.format',
    optimization_event: 'lineItem.social_ext.optimization_event',
    attribution_window: 'lineItem.social_ext.attribution_window',
    frequency_cap: 'lineItem.social_ext.frequency_cap',
  },
  Search: {
    engine: 'lineItem.search_ext.engine',
    campaign_type: 'lineItem.search_ext.campaign_type',
    keyword_or_group: 'lineItem.search_ext.keyword',
    match_type: 'lineItem.search_ext.match_type',
    bid_strategy: 'lineItem.search_ext.bid_strategy',
    avg_quality_score: 'lineItem.search_ext.avg_quality_score',
  },
  Radio: {
    network_or_platform: 'lineItem.audio_ext.network_or_platform',
    station: 'lineItem.audio_ext.station',
    daypart: 'lineItem.audio_ext.daypart',
    spot_length_sec: 'lineItem.audio_ext.spot_len_sec',
    spots: 'lineItem.audio_ext.spots',
    format_genre: 'lineItem.audio_ext.format_genre',
    cpp_or_cpm: 'lineItem.audio_ext.cpp_or_cpm',
  },
  Streaming_Audio: {
    network_or_platform: 'lineItem.audio_ext.network_or_platform',
    station: 'lineItem.audio_ext.station',
    daypart: 'lineItem.audio_ext.daypart',
    spot_length_sec: 'lineItem.audio_ext.spot_len_sec',
    spots: 'lineItem.audio_ext.spots',
    format_genre: 'lineItem.audio_ext.format_genre',
    cpp_or_cpm: 'lineItem.audio_ext.cpp_or_cpm',
  },
  Podcast: {
    episode_or_date: 'lineItem.podcast_ext.episode',
  },
  Cinema: {
    circuit: 'lineItem.cinema_ext.circuit',
    locations_count: 'lineItem.cinema_ext.locations_count',
    screens_count: 'lineItem.cinema_ext.screens_count',
    sessions_per_week: 'lineItem.cinema_ext.sessions_per_week',
    spot_length_sec: 'lineItem.cinema_ext.spot_len_sec',
    package: 'lineItem.cinema_ext.package',
  },
  Print: {
    publication: 'lineItem.print_ext.publication',
    section: 'lineItem.print_ext.section',
    edition_date: 'lineItem.print_ext.edition_date',
    ad_size: 'lineItem.print_ext.ad_size',
    position: 'lineItem.print_ext.position',
    color_mode: 'lineItem.print_ext.color_mode',
  },
  Retail_Media: {
    retailer: 'lineItem.retail_media_ext.retailer',
    onsite_format: 'lineItem.retail_media_ext.onsite_format',
    offsite_format: 'lineItem.retail_media_ext.offsite_format',
    sku_count: 'lineItem.retail_media_ext.sku_count',
    attribution_source: 'lineItem.retail_media_ext.attribution_source',
    roas_target: 'lineItem.retail_media_ext.roas_target',
  },
  Influencer: {
    creator_handle: 'lineItem.influencer_ext.creator_handle',
    platform: 'lineItem.influencer_ext.platform',
    deliverables_short: 'lineItem.influencer_ext.deliverables_short',
    followers_k: 'lineItem.influencer_ext.followers_k',
    usage_window_days: 'lineItem.influencer_ext.usage_window_days',
    whitelisting: 'lineItem.influencer_ext.whitelisting',
  },
  Sponsorship: {
    property: 'lineItem.sponsorship_ext.property',
    rights_summary: 'lineItem.sponsorship_ext.rights_summary',
    key_dates: 'lineItem.sponsorship_ext.key_dates',
    assets_count: 'lineItem.sponsorship_ext.assets_count',
    makegoods: 'lineItem.sponsorship_ext.makegoods',
  },
  Email: {
    type_email_or_dm: 'lineItem.email_dm_ext.channel_type',
    platform_or_broker: 'lineItem.email_dm_ext.list_source',
    audience_size: 'lineItem.email_dm_ext.audience_size',
    send_or_drop_date: 'lineItem.email_dm_ext.drop_date',
    template_or_format: 'lineItem.email_dm_ext.template_id',
    seed_or_broker: 'lineItem.email_dm_ext.list_broker',
  },
  Direct_Mail: {
    type_email_or_dm: 'lineItem.email_dm_ext.channel_type',
    platform_or_broker: 'lineItem.email_dm_ext.list_source',
    audience_size: 'lineItem.email_dm_ext.audience_size',
    send_or_drop_date: 'lineItem.email_dm_ext.drop_date',
    template_or_format: 'lineItem.email_dm_ext.template_id',
    seed_or_broker: 'lineItem.email_dm_ext.list_broker',
  },
  Gaming: {
    subtype: 'lineItem.gaming_native_ext.subtype',
    platform_or_network: 'lineItem.gaming_native_ext.platform_network',
    title_or_publisher: 'lineItem.gaming_native_ext.title_or_publisher',
    ad_format: 'lineItem.gaming_native_ext.ad_format',
    brand_safety: 'lineItem.gaming_native_ext.brand_safety',
  },
  Native: {
    subtype: 'lineItem.gaming_native_ext.subtype',
    platform_or_network: 'lineItem.gaming_native_ext.platform_network',
    title_or_publisher: 'lineItem.gaming_native_ext.title_or_publisher',
    ad_format: 'lineItem.gaming_native_ext.ad_format',
    brand_safety: 'lineItem.gaming_native_ext.brand_safety',
  },
  Affiliate: {
    network: 'lineItem.affiliate_ext.network',
    partner: 'lineItem.affiliate_ext.partner_id',
    commission_model: 'lineItem.affiliate_ext.commission_model',
    cookie_window_days: 'lineItem.affiliate_ext.cookie_window_days',
    promo_codes_count: 'lineItem.affiliate_ext.promo_codes_json',
  },
  Experiential: {
    property: 'lineItem.sponsorship_ext.property',
    rights_summary: 'lineItem.sponsorship_ext.rights_summary',
    key_dates: 'lineItem.sponsorship_ext.key_dates',
    assets_count: 'lineItem.sponsorship_ext.assets_count',
    makegoods: 'lineItem.sponsorship_ext.makegoods',
  },
};

for (const [channel, mapping] of Object.entries(channelPathResolvers)) {
  const castChannel = channel as Channel;
  for (const [field, path] of Object.entries(mapping ?? {})) {
    registerChannelResolver(castChannel, field, createPathResolver(path));
  }
}

function percentFromValue(value: FlightingValue): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 1 && numeric <= 100) return numeric / 100;
  return numeric;
}

registerChannelResolver('OOH', 'digital', {
  read: (context) => Boolean(readByPath(context, 'lineItem.ooh_ext.digital')),
  write: (context, value) => writeByPath(context, 'lineItem.ooh_ext.digital', Boolean(value)),
  validate: (value, context) => {
    if (Boolean(value) && !context.lineItem.ooh_ext?.share_of_voice) {
      return 'Add SOV when digital panels are selected';
    }
    return null;
  },
});

registerChannelResolver('OOH', 'sov_or_loop', {
  read: (context) => {
    const sov = context.lineItem.ooh_ext?.share_of_voice;
    const loop = context.lineItem.ooh_ext?.slot_length_sec;
    const sovLabel = sov != null ? percentFormatter.format(sov, { maximumFractionDigits: 1 }) : '';
    const loopLabel = loop != null ? `${loop}s` : '';
    return [sovLabel, loopLabel].filter(Boolean).join(' / ');
  },
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const raw = String(value ?? '');
      const [sovPart, loopPart] = raw.split('/').map((part) => part.trim());
      const sovNumeric = Number(sovPart?.replace(/[^0-9.]/g, ''));
      const loopNumeric = Number(loopPart?.replace(/[^0-9.]/g, ''));
      const share = Number.isFinite(sovNumeric) ? (sovNumeric > 1 ? sovNumeric / 100 : sovNumeric) : undefined;
      const loop = Number.isFinite(loopNumeric) ? loopNumeric : undefined;
      const ext = extensionDefaultsByKey.ooh_ext();
      draft.lineItem.ooh_ext = {
        ...(draft.lineItem.ooh_ext ?? ext),
        share_of_voice: share,
        slot_length_sec: loop,
      } as typeof draft.lineItem.ooh_ext;
    }),
});

registerChannelResolver('OOH', 'facing_orientation', {
  read: (context) => {
    const facing = context.lineItem.ooh_ext?.facing;
    const orientation = context.lineItem.ooh_ext?.orientation_deg;
    if (!facing && orientation == null) return '';
    return [facing, orientation != null ? `${orientation}°` : null].filter(Boolean).join(' ');
  },
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const raw = String(value ?? '');
      const [facing, orientation] = raw.split(' ').map((part) => part.trim());
      const orientationValue = Number(orientation?.replace(/[^0-9.]/g, ''));
      const defaultExt = extensionDefaultsByKey.ooh_ext();
      const baseExt: NonNullable<typeof draft.lineItem.ooh_ext> =
        draft.lineItem.ooh_ext ?? defaultExt;
      draft.lineItem.ooh_ext = {
        ...baseExt,
        facing: (facing || baseExt.facing) ?? undefined,
        orientation_deg: Number.isFinite(orientationValue)
          ? orientationValue
          : baseExt.orientation_deg,
      } as typeof draft.lineItem.ooh_ext;
    }),
});

registerChannelResolver('OOH', 'location', {
  read: (context) => {
    const ext = context.lineItem.ooh_ext;
    if (!ext) return '';
    return [ext.address, ext.suburb, ext.state].filter(Boolean).join(', ');
  },
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const parts = String(value ?? '')
        .split(',')
        .map((part) => part.trim());
      const [address, suburb, state] = parts;
      const defaultExt = extensionDefaultsByKey.ooh_ext();
      const ext: NonNullable<typeof draft.lineItem.ooh_ext> = draft.lineItem.ooh_ext ?? defaultExt;
      const resolvedState = state && state.length > 0 ? state : ext.state ?? 'NSW';
      draft.lineItem.ooh_ext = {
        ...ext,
        address: address ?? ext.address ?? '',
        suburb: suburb ?? ext.suburb ?? '',
        state: resolvedState,
      };
    }),
});

registerChannelResolver('OOH', 'production_install_fees', {
  read: (context) => (context.lineItem.ooh_ext?.production_cost ?? 0) + (context.lineItem.ooh_ext?.install_cost ?? 0),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const total = Number(value ?? 0);
      const defaultExt = extensionDefaultsByKey.ooh_ext();
      const ext: NonNullable<typeof draft.lineItem.ooh_ext> = draft.lineItem.ooh_ext ?? defaultExt;
      draft.lineItem.ooh_ext = {
        ...ext,
        production_cost: Number.isFinite(total) ? Math.max(0, total / 2) : ext.production_cost ?? 0,
        install_cost: Number.isFinite(total) ? Math.max(0, total / 2) : ext.install_cost ?? 0,
      };
    }),
});

registerChannelResolver('BVOD_CTV', 'device_mix_ctv_pct', {
  read: (context) => context.lineItem.bvod_ext?.device_mix_json?.find((item) => item.device === 'CTV')?.share ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const share = Math.min(1, Math.max(0, percentFromValue(value)));
      const ext = draft.lineItem.bvod_ext ?? (extensionDefaultsByKey.bvod_ext() as typeof draft.lineItem.bvod_ext);
      const remaining = (ext.device_mix_json ?? []).filter((item) => item.device !== 'CTV');
      draft.lineItem.bvod_ext = {
        ...ext,
        device_mix_json: [...remaining, { device: 'CTV', share }],
      };
    }),
});

registerChannelResolver('BVOD_CTV', 'ad_duration_sec', {
  read: (context) => context.lineItem.bvod_ext?.ad_pod_len ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.bvod_ext ?? (extensionDefaultsByKey.bvod_ext() as typeof draft.lineItem.bvod_ext);
      draft.lineItem.bvod_ext = {
        ...ext,
        ad_pod_len: Math.max(0, Math.floor(Number(value ?? 0))) || 0,
      };
    }),
});

registerChannelResolver('BVOD_CTV', 'vcr_goal_pct', {
  read: (context) => {
    const raw = context.lineItem.bvod_ext?.completion_goal;
    if (!raw) return null;
    const parsed = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return parsed / 100;
  },
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.bvod_ext ?? (extensionDefaultsByKey.bvod_ext() as typeof draft.lineItem.bvod_ext);
      const percent = Math.min(1, Math.max(0, percentFromValue(value)));
      draft.lineItem.bvod_ext = {
        ...ext,
        completion_goal: `${Math.round(percent * 100)}%`,
      };
    }),
});

registerChannelResolver('Digital_Display', 'creative_sizes', {
  read: (context) => (context.lineItem.digital_ext?.creative_sizes ?? []).join(', '),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.digital_ext ?? (extensionDefaultsByKey.digital_ext() as typeof draft.lineItem.digital_ext);
      const sizes = String(value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      draft.lineItem.digital_ext = { ...ext, creative_sizes: sizes };
    }),
});

registerChannelResolver('Digital_Display', 'targeting_short', {
  read: (context) => Object.keys(context.lineItem.digital_ext?.targeting_json ?? {}).join(', '),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.digital_ext ?? (extensionDefaultsByKey.digital_ext() as typeof draft.lineItem.digital_ext);
      const keys = String(value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      const targeting = Object.fromEntries(keys.map((key) => [key, true]));
      draft.lineItem.digital_ext = { ...ext, targeting_json: targeting };
    }),
});

registerChannelResolver('Digital_Display', 'viewability_goal_pct', {
  read: (context) => context.lineItem.digital_ext?.viewability_goal ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.digital_ext ?? (extensionDefaultsByKey.digital_ext() as typeof draft.lineItem.digital_ext);
      draft.lineItem.digital_ext = {
        ...ext,
        viewability_goal: Math.min(1, Math.max(0, percentFromValue(value))),
      };
    }),
});

registerChannelResolver('Digital_Video', 'ad_duration_sec', {
  read: (context) => context.lineItem.digital_ext?.video_duration_sec ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.digital_ext ?? (extensionDefaultsByKey.digital_ext() as typeof draft.lineItem.digital_ext);
      draft.lineItem.digital_ext = {
        ...ext,
        video_duration_sec: Math.max(0, Math.floor(Number(value ?? 0))) || 0,
      };
    }),
});

registerChannelResolver('Digital_Video', 'vcr_goal_pct', {
  read: (context) => context.lineItem.digital_ext?.viewability_goal ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.digital_ext ?? (extensionDefaultsByKey.digital_ext() as typeof draft.lineItem.digital_ext);
      draft.lineItem.digital_ext = {
        ...ext,
        viewability_goal: Math.min(1, Math.max(0, percentFromValue(value))),
      };
    }),
});

registerChannelResolver('Search', 'keyword_or_group', {
  read: (context) => context.lineItem.search_ext?.keyword ?? context.lineItem.search_ext?.ad_group ?? '',
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.search_ext ?? (extensionDefaultsByKey.search_ext() as typeof draft.lineItem.search_ext);
      draft.lineItem.search_ext = { ...ext, keyword: String(value ?? '') };
    }),
});

registerChannelResolver('Search', 'avg_quality_score', {
  read: (context) => context.lineItem.search_ext?.avg_quality_score ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.search_ext ?? (extensionDefaultsByKey.search_ext() as typeof draft.lineItem.search_ext);
      draft.lineItem.search_ext = {
        ...ext,
        avg_quality_score: Math.max(0, Number(value ?? 0)) || 0,
      };
    }),
});

registerChannelResolver('Radio', 'cpp_or_cpm', {
  read: (context) => context.lineItem.audio_ext?.cpp_or_cpm ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.audio_ext ?? (extensionDefaultsByKey.audio_ext() as typeof draft.lineItem.audio_ext);
      draft.lineItem.audio_ext = { ...ext, cpp_or_cpm: Math.max(0, Number(value ?? 0)) || 0 };
    }),
});

registerChannelResolver('Streaming_Audio', 'cpp_or_cpm', {
  read: (context) => context.lineItem.audio_ext?.cpp_or_cpm ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.audio_ext ?? (extensionDefaultsByKey.audio_ext() as typeof draft.lineItem.audio_ext);
      draft.lineItem.audio_ext = { ...ext, cpp_or_cpm: Math.max(0, Number(value ?? 0)) || 0 };
    }),
});

registerChannelResolver('Podcast', 'publisher_show', {
  read: (context) =>
    [context.lineItem.podcast_ext?.publisher, context.lineItem.podcast_ext?.show]
      .filter(Boolean)
      .join(' – '),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.podcast_ext ?? (extensionDefaultsByKey.podcast_ext() as typeof draft.lineItem.podcast_ext);
      const [publisher, show] = String(value ?? '')
        .split('–')
        .map((part) => part.trim());
      draft.lineItem.podcast_ext = {
        ...ext,
        publisher: publisher ?? ext.publisher,
        show: show ?? ext.show,
      };
    }),
});

registerChannelResolver('Podcast', 'ad_position', {
  read: (context) => context.lineItem.podcast_ext?.ad_position ?? '',
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.podcast_ext ?? (extensionDefaultsByKey.podcast_ext() as typeof draft.lineItem.podcast_ext);
      draft.lineItem.podcast_ext = { ...ext, ad_position: String(value ?? '') as typeof ext.ad_position };
    }),
});

registerChannelResolver('Podcast', 'read_type', {
  read: (context) => context.lineItem.podcast_ext?.read_type ?? '',
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.podcast_ext ?? (extensionDefaultsByKey.podcast_ext() as typeof draft.lineItem.podcast_ext);
      draft.lineItem.podcast_ext = { ...ext, read_type: String(value ?? '') as typeof ext.read_type };
    }),
});

registerChannelResolver('Podcast', 'insertion_type', {
  read: (context) => context.lineItem.podcast_ext?.insertion_type ?? '',
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.podcast_ext ?? (extensionDefaultsByKey.podcast_ext() as typeof draft.lineItem.podcast_ext);
      draft.lineItem.podcast_ext = { ...ext, insertion_type: String(value ?? '') as typeof ext.insertion_type };
    }),
});

registerChannelResolver('Podcast', 'est_downloads', {
  read: (context) => context.lineItem.podcast_ext?.est_downloads ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.podcast_ext ?? (extensionDefaultsByKey.podcast_ext() as typeof draft.lineItem.podcast_ext);
      draft.lineItem.podcast_ext = { ...ext, est_downloads: Math.max(0, Math.floor(Number(value ?? 0))) };
    }),
});

registerChannelResolver('Retail_Media', 'sku_count', {
  read: (context) => context.lineItem.retail_media_ext?.sku_count ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.retail_media_ext ?? (extensionDefaultsByKey.retail_media_ext() as typeof draft.lineItem.retail_media_ext);
      draft.lineItem.retail_media_ext = { ...ext, sku_count: Math.max(0, Math.floor(Number(value ?? 0))) };
    }),
});

registerChannelResolver('Retail_Media', 'roas_target', {
  read: (context) => context.lineItem.retail_media_ext?.roas_target ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.retail_media_ext ?? (extensionDefaultsByKey.retail_media_ext() as typeof draft.lineItem.retail_media_ext);
      draft.lineItem.retail_media_ext = { ...ext, roas_target: Math.max(0, Number(value ?? 0)) || 0 };
    }),
});

registerChannelResolver('Influencer', 'followers_k', {
  read: (context) => context.lineItem.influencer_ext?.followers_k ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.influencer_ext ?? (extensionDefaultsByKey.influencer_ext() as typeof draft.lineItem.influencer_ext);
      draft.lineItem.influencer_ext = { ...ext, followers_k: Math.max(0, Number(value ?? 0)) };
    }),
});

registerChannelResolver('Influencer', 'usage_window_days', {
  read: (context) => context.lineItem.influencer_ext?.usage_window_days ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.influencer_ext ?? (extensionDefaultsByKey.influencer_ext() as typeof draft.lineItem.influencer_ext);
      draft.lineItem.influencer_ext = {
        ...ext,
        usage_window_days: Math.max(0, Math.floor(Number(value ?? 0))) || 0,
      };
    }),
});

registerChannelResolver('Influencer', 'whitelisting', {
  read: (context) => Boolean(context.lineItem.influencer_ext?.whitelisting),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.influencer_ext ?? (extensionDefaultsByKey.influencer_ext() as typeof draft.lineItem.influencer_ext);
      draft.lineItem.influencer_ext = { ...ext, whitelisting: Boolean(value) };
    }),
});

registerChannelResolver('Sponsorship', 'assets_count', {
  read: (context) => context.lineItem.sponsorship_ext?.assets_count ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.sponsorship_ext ?? (extensionDefaultsByKey.sponsorship_ext() as typeof draft.lineItem.sponsorship_ext);
      draft.lineItem.sponsorship_ext = {
        ...ext,
        assets_count: Math.max(0, Math.floor(Number(value ?? 0))) || 0,
      };
    }),
});

registerChannelResolver('Sponsorship', 'makegoods', {
  read: (context) => Boolean(context.lineItem.sponsorship_ext?.makegoods),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.sponsorship_ext ?? (extensionDefaultsByKey.sponsorship_ext() as typeof draft.lineItem.sponsorship_ext);
      draft.lineItem.sponsorship_ext = { ...ext, makegoods: Boolean(value) };
    }),
});

registerChannelResolver('Experiential', 'assets_count', {
  read: (context) => context.lineItem.sponsorship_ext?.assets_count ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.sponsorship_ext ?? (extensionDefaultsByKey.sponsorship_ext() as typeof draft.lineItem.sponsorship_ext);
      draft.lineItem.sponsorship_ext = {
        ...ext,
        assets_count: Math.max(0, Math.floor(Number(value ?? 0))) || 0,
      };
    }),
});

registerChannelResolver('Experiential', 'makegoods', {
  read: (context) => Boolean(context.lineItem.sponsorship_ext?.makegoods),
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.sponsorship_ext ?? (extensionDefaultsByKey.sponsorship_ext() as typeof draft.lineItem.sponsorship_ext);
      draft.lineItem.sponsorship_ext = { ...ext, makegoods: Boolean(value) };
    }),
});

registerChannelResolver('Email', 'audience_size', {
  read: (context) => context.lineItem.email_dm_ext?.audience_size ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.email_dm_ext ?? (extensionDefaultsByKey.email_dm_ext() as typeof draft.lineItem.email_dm_ext);
      draft.lineItem.email_dm_ext = { ...ext, audience_size: Math.max(0, Math.floor(Number(value ?? 0))) || 0 };
    }),
});

registerChannelResolver('Direct_Mail', 'audience_size', {
  read: (context) => context.lineItem.email_dm_ext?.audience_size ?? null,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.email_dm_ext ?? (extensionDefaultsByKey.email_dm_ext() as typeof draft.lineItem.email_dm_ext);
      draft.lineItem.email_dm_ext = { ...ext, audience_size: Math.max(0, Math.floor(Number(value ?? 0))) || 0 };
    }),
});

registerChannelResolver('Affiliate', 'promo_codes_count', {
  read: (context) => context.lineItem.affiliate_ext?.promo_codes_json?.length ?? 0,
  write: (context, value) =>
    mutatePlan(context, (draft) => {
      const ext = draft.lineItem.affiliate_ext ?? (extensionDefaultsByKey.affiliate_ext() as typeof draft.lineItem.affiliate_ext);
      const count = Math.max(0, Math.floor(Number(value ?? 0))) || 0;
      draft.lineItem.affiliate_ext = {
        ...ext,
        promo_codes_json: new Array(count).fill('').map((_, index) => ext.promo_codes_json?.[index] ?? ''),
      };
    }),
});

export function getFieldResolver(channel: Channel, field: string): FlightingFieldResolver | undefined {
  return channelResolvers[channel]?.[field] ?? commonResolvers[field];
}

export function listFieldsForChannel(channel: Channel): string[] {
  const config = channelTableConfig.channelSpecificColumns[channel] ?? [];
  return [...channelTableConfig.flightingCommonColumns.map((column) => column.id), ...config.map((column) => column.id)];
}

export function buildFlightingContexts(plan: Plan, channel: Channel): FlightingRowContext[] {
  const flightById = new Map(plan.flights.map((flight) => [flight.flight_id, flight]));
  const vendorById = new Map(plan.vendors.map((vendor) => [vendor.vendor_id, vendor]));
  const audienceById = new Map(plan.audiences.map((audience) => [audience.audience_id, audience]));

  return plan.lineItems
    .filter((lineItem) => lineItem.channel === channel)
    .map((lineItem) => ({
      plan,
      lineItem,
      flight: flightById.get(lineItem.flight_id),
      vendor: vendorById.get(lineItem.vendor_id),
      audience: audienceById.get(lineItem.audience_id),
    }))
    .sort((a, b) => {
      const aDate = a.flight ? new Date(a.flight.start_date).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.flight ? new Date(b.flight.start_date).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });
}

export function computeChannelSummaries(plan: Plan): ChannelSummary[] {
  const budget = plan.goal?.budget ?? 0;
  const summaries: ChannelSummary[] = [];

  for (const channel of channelEnum.options) {
    const contexts = buildFlightingContexts(plan, channel);
    if (contexts.length === 0) continue;

    let start: string | null = null;
    let end: string | null = null;
    let totalCost = 0;

    for (const context of contexts) {
      if (context.flight) {
        if (!start || context.flight.start_date < start) {
          start = context.flight.start_date;
        }
        if (!end || context.flight.end_date > end) {
          end = context.flight.end_date;
        }
      }
      totalCost += context.lineItem.cost_planned;
    }

    summaries.push({
      channel,
      startDate: start,
      endDate: end,
      totalPlannedCost: totalCost,
      budgetPercent: budget > 0 ? totalCost / budget : 0,
      lineItemIds: contexts.map((context) => context.lineItem.line_item_id),
    });
  }

  return summaries.sort((a, b) => a.channel.localeCompare(b.channel));
}

export function validateField(
  channel: Channel,
  context: FlightingRowContext,
  field: string,
  value: FlightingValue,
): ValidationIssue | null {
  const resolver = getFieldResolver(channel, field);
  if (!resolver?.validate) return null;
  const message = resolver.validate(value, context);
  if (!message) return null;
  return { field, message };
}

export function setFieldValue(
  channel: Channel,
  context: FlightingRowContext,
  field: string,
  value: FlightingValue,
): FieldWriteResult {
  const resolver = getFieldResolver(channel, field);
  if (!resolver?.write) {
    throw new Error(`Field ${field} is read-only or not configured`);
  }
  const result = resolver.write(context, value);
  if (field === 'start_date' || field === 'end_date') {
    const syncedPlan = syncBlockPlanToFlight(result.plan, result.lineItem.line_item_id);
    const refreshedLineItem = syncedPlan.lineItems.find(
      (item) => item.line_item_id === result.lineItem.line_item_id,
    );
    const refreshedFlight = refreshedLineItem
      ? syncedPlan.flights.find((item) => item.flight_id === refreshedLineItem.flight_id)
      : undefined;
    const refreshedVendor = result.vendor
      ? syncedPlan.vendors.find((item) => item.vendor_id === result.vendor?.vendor_id)
      : result.vendor;
    const refreshedAudience = result.audience
      ? syncedPlan.audiences.find((item) => item.audience_id === result.audience?.audience_id)
      : result.audience;

    return {
      plan: syncedPlan,
      lineItem: refreshedLineItem ?? result.lineItem,
      flight: refreshedFlight ?? result.flight,
      vendor: refreshedVendor ?? result.vendor,
      audience: refreshedAudience ?? result.audience,
    };
  }
  return result;
}

export function getFieldValue(channel: Channel, context: FlightingRowContext, field: string): FlightingValue {
  const resolver = getFieldResolver(channel, field);
  if (!resolver) return undefined;
  return resolver.read(context);
}

export type {
  ChannelSummary,
  FieldWriteResult,
  FlightingFieldResolver,
  FlightingRowContext,
  FlightingValue,
  ValidationIssue,
};
