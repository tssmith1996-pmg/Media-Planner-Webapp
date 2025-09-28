import {
  campaignSchema,
  audienceSchema,
  vendorSchema,
  creativeSchema,
  flightSchema,
  lineItemSchema,
  trackingSchema,
  planSchema,
  type Plan,
  type Channel,
  type LineItem,
} from '@/lib/schemas';
import { createId } from '@/lib/id';
import { addDays, startOfWeekSunday, toIsoDate } from '@/lib/date';
import { syncBlockPlanToFlight, updatePlanTimeline } from '@/lib/blockPlan';

const channelCreativeFormat: Partial<Record<Channel, string>> = {
  TV: 'Video',
  BVOD_CTV: 'Connected TV',
  Digital_Display: 'Display',
  Digital_Video: 'Video',
  Social: 'Social',
  Search: 'Search',
  Radio: 'Audio',
  Streaming_Audio: 'Audio',
  Podcast: 'Podcast',
  Cinema: 'Cinema',
  Print: 'Print',
  Retail_Media: 'Retail',
  Influencer: 'Influencer',
  Sponsorship: 'Sponsorship',
  Email: 'Email',
  Direct_Mail: 'Direct Mail',
  Gaming: 'Gaming',
  Native: 'Native',
  Affiliate: 'Affiliate',
  Experiential: 'Experiential',
  OOH: 'OOH',
};

function defaultCampaign(plan: Plan) {
  if (plan.campaigns.length > 0) {
    return plan.campaigns[0];
  }

  return campaignSchema.parse({
    campaign_id: createId('cmp'),
    brand: plan.meta.client,
    market: 'Australia',
    objective: 'Define campaign objective',
    primary_kpi: 'Reach',
    fiscal_period: 'FY25',
  });
}

function defaultAudience() {
  return audienceSchema.parse({
    audience_id: createId('aud'),
    definition: 'Audience pending definition',
    segments_json: [],
  });
}

function defaultVendor() {
  return vendorSchema.parse({
    vendor_id: createId('vnd'),
    name: 'Pending vendor',
  });
}

function defaultCreative(channel: Channel) {
  return creativeSchema.parse({
    creative_id: createId('crv'),
    ad_name: `${channel.replace(/_/g, ' ')} placeholder`,
    asset_uri: 'https://example.com/assets/placeholder',
    format: channelCreativeFormat[channel] ?? 'Standard',
  });
}

function defaultLineItemExtension(channel: Channel) {
  switch (channel) {
    case 'OOH':
      return {
        ooh_ext: {
          ooh_asset_id: createId('ooh'),
          owner: 'Pending owner',
          format: 'Large format digital',
          digital: true,
          address: '1 Example Way',
          suburb: 'Sydney',
          state: 'NSW',
          postcode: '2000',
          lat: -33.8688,
          long: 151.2093,
        },
      } as const;
    case 'TV':
      return {
        tv_ext: {
          network: 'TBD Network',
          spot_length_sec: 30,
          spot_count: 10,
          buy_unit: 'spot',
        },
      } as const;
    case 'BVOD_CTV':
      return {
        bvod_ext: {
          platform: '9Now',
        },
      } as const;
    case 'Digital_Display':
    case 'Digital_Video':
      return {
        digital_ext: {
          inventory_type: 'display',
        },
      } as const;
    case 'Social':
      return {
        social_ext: {
          platform: 'Meta',
          objective: 'Awareness',
        },
      } as const;
    case 'Search':
      return {
        search_ext: {
          engine: 'Google',
          campaign_type: 'Search',
          ad_group: 'New Ad Group',
        },
      } as const;
    case 'Radio':
    case 'Streaming_Audio':
      return {
        audio_ext: {
          network_or_platform: 'Network TBD',
          spot_len_sec: 30,
          spots: 10,
        },
      } as const;
    case 'Podcast':
      return {
        podcast_ext: {
          publisher: 'Podcast Network',
          show: 'Flagship Show',
        },
      } as const;
    case 'Cinema':
      return {
        cinema_ext: {
          circuit: 'Hoyts',
          spot_len_sec: 30,
        },
      } as const;
    case 'Print':
      return {
        print_ext: {
          publication: 'Trade Publication',
          edition_date: toIsoDate(new Date()),
        },
      } as const;
    case 'Retail_Media':
      return {
        retail_media_ext: {
          retailer: 'Cartology',
        },
      } as const;
    case 'Influencer':
      return {
        influencer_ext: {
          creator_handle: '@creator',
          platform: 'Instagram',
        },
      } as const;
    case 'Sponsorship':
    case 'Experiential':
      return {
        sponsorship_ext: {
          property: 'Sponsorship Property',
        },
      } as const;
    case 'Email':
      return {
        email_dm_ext: {
          channel_type: 'email',
          list_source: 'First-party CRM',
        },
      } as const;
    case 'Direct_Mail':
      return {
        email_dm_ext: {
          channel_type: 'direct_mail',
          list_source: 'Mailhouse partner',
        },
      } as const;
    case 'Gaming':
      return {
        gaming_native_ext: {
          subtype: 'gaming',
          title_or_publisher: 'Gaming Partner',
        },
      } as const;
    case 'Native':
      return {
        gaming_native_ext: {
          subtype: 'native',
          title_or_publisher: 'Native Partner',
        },
      } as const;
    case 'Affiliate':
      return {
        affiliate_ext: {
          network: 'Affiliate Network',
          partner_id: createId('partner'),
          commission_model: 'CPS',
        },
      } as const;
    default:
      return {} as const;
  }
}

export function addChannelDraft(plan: Plan, channel: Channel): Plan {
  const campaign = defaultCampaign(plan);
  const audience = defaultAudience();
  const vendor = defaultVendor();
  const creative = defaultCreative(channel);

  const now = new Date();
  const start = startOfWeekSunday(now);
  const end = addDays(start, 27);

  const flight = flightSchema.parse({
    flight_id: createId('flt'),
    campaign_id: campaign.campaign_id,
    start_date: toIsoDate(start),
    end_date: toIsoDate(end),
    budget_total: 0,
    buy_type: 'Guaranteed',
    buying_currency: 'AUD',
    fx_rate: 1,
  });

  const lineItem = lineItemSchema.parse({
    line_item_id: createId('li'),
    flight_id: flight.flight_id,
    audience_id: audience.audience_id,
    vendor_id: vendor.vendor_id,
    creative_id: creative.creative_id,
    channel,
    goal_type: 'Impressions',
    pricing_model: 'CPM',
    rate_numeric: 10,
    rate_unit: 'CPM',
    units_planned: 0,
    cost_planned: 0,
    pacing: 'Even',
    ...defaultLineItemExtension(channel),
  });

  const tracking = trackingSchema.parse({
    line_item_id: lineItem.line_item_id,
  });

  const campaigns = plan.campaigns.length > 0 ? [...plan.campaigns] : [...plan.campaigns, campaign];

  return planSchema.parse({
    ...plan,
    campaigns,
    flights: [...plan.flights, flight],
    audiences: [...plan.audiences, audience],
    vendors: [...plan.vendors, vendor],
    creatives: [...plan.creatives, creative],
    lineItems: [...plan.lineItems, lineItem],
    tracking: [...plan.tracking, tracking],
  });
}

function ensureEntity<T extends { [key: string]: unknown }>(
  collection: T[],
  entity: T,
  key: keyof T,
): { items: T[]; id: T[typeof key] } {
  const existing = collection.find((item) => item[key] === entity[key]);
  if (existing) {
    return { items: collection, id: existing[key] };
  }
  return { items: [...collection, entity], id: entity[key] };
}

function findFirstLineItem(plan: Plan, channel: Channel): LineItem | undefined {
  return plan.lineItems.find((item) => item.channel === channel);
}

export function addFlighting(plan: Plan, channel: Channel): Plan {
  const baseLineItem = findFirstLineItem(plan, channel);
  const campaign = plan.campaigns[0] ?? defaultCampaign(plan);
  const audienceEntity = baseLineItem
    ? plan.audiences.find((audience) => audience.audience_id === baseLineItem.audience_id) ?? defaultAudience()
    : defaultAudience();
  const vendorEntity = baseLineItem
    ? plan.vendors.find((vendor) => vendor.vendor_id === baseLineItem.vendor_id) ?? defaultVendor()
    : defaultVendor();
  const creativeEntity = baseLineItem
    ? plan.creatives.find((creative) => creative.creative_id === baseLineItem.creative_id) ?? defaultCreative(channel)
    : defaultCreative(channel);

  const now = new Date();
  const start = startOfWeekSunday(now);
  const end = addDays(start, 6);

  const flight = flightSchema.parse({
    flight_id: createId('flt'),
    campaign_id: campaign.campaign_id,
    start_date: toIsoDate(start),
    end_date: toIsoDate(end),
    budget_total: baseLineItem?.cost_planned ?? 0,
    buy_type: baseLineItem?.pricing_model ?? 'Guaranteed',
    buying_currency: 'AUD',
    fx_rate: 1,
  });

  const extension = baseLineItem
    ? (Object.fromEntries(
        Object.entries(baseLineItem).filter(([key]) => key.endsWith('_ext')),
      ) as Record<string, unknown>)
    : defaultLineItemExtension(channel);

  const lineItem = lineItemSchema.parse({
    line_item_id: createId('li'),
    flight_id: flight.flight_id,
    audience_id: audienceEntity.audience_id,
    vendor_id: vendorEntity.vendor_id,
    creative_id: creativeEntity.creative_id,
    channel,
    goal_type: baseLineItem?.goal_type ?? 'Reach',
    pricing_model: baseLineItem?.pricing_model ?? 'CPM',
    rate_numeric: baseLineItem?.rate_numeric ?? 0,
    rate_unit: baseLineItem?.rate_unit ?? 'CPM',
    units_planned: baseLineItem?.units_planned ?? 0,
    cost_planned: baseLineItem?.cost_planned ?? 0,
    pacing: baseLineItem?.pacing ?? 'Even',
    ...(extension as object),
  });

  const tracking = trackingSchema.parse({ line_item_id: lineItem.line_item_id });

  const campaigns = plan.campaigns.length > 0 ? plan.campaigns : [campaign];
  const { items: audiences } = ensureEntity(plan.audiences, audienceEntity, 'audience_id');
  const { items: vendors } = ensureEntity(plan.vendors, vendorEntity, 'vendor_id');
  const { items: creatives } = ensureEntity(plan.creatives, creativeEntity, 'creative_id');

  const drafted = planSchema.parse({
    ...plan,
    campaigns,
    flights: [...plan.flights, flight],
    audiences,
    vendors,
    creatives,
    lineItems: [...plan.lineItems, lineItem],
    tracking: [...plan.tracking, tracking],
  });

  const withTimeline = updatePlanTimeline(drafted);
  return syncBlockPlanToFlight(withTimeline, lineItem.line_item_id);
}

export function duplicateFlighting(plan: Plan, lineItemId: string): Plan {
  const source = plan.lineItems.find((item) => item.line_item_id === lineItemId);
  if (!source) {
    return plan;
  }
  const flight = plan.flights.find((item) => item.flight_id === source.flight_id);
  const newFlight = flightSchema.parse({
    ...(flight ?? {
      flight_id: createId('flt'),
      campaign_id: plan.campaigns[0]?.campaign_id ?? defaultCampaign(plan).campaign_id,
      start_date: toIsoDate(new Date()),
      end_date: toIsoDate(addDays(new Date(), 6)),
      budget_total: source.cost_planned,
      buy_type: source.pricing_model,
      buying_currency: 'AUD',
      fx_rate: 1,
    }),
    flight_id: createId('flt'),
  });

  const duplicated = lineItemSchema.parse({
    ...source,
    flight_id: newFlight.flight_id,
    line_item_id: createId('li'),
  });

  const tracking = trackingSchema.parse({ line_item_id: duplicated.line_item_id });

  const drafted = planSchema.parse({
    ...plan,
    flights: [...plan.flights, newFlight],
    lineItems: [...plan.lineItems, duplicated],
    tracking: [...plan.tracking, tracking],
  });

  const withTimeline = updatePlanTimeline(drafted);
  return syncBlockPlanToFlight(withTimeline, duplicated.line_item_id);
}

export function removeFlighting(plan: Plan, lineItemId: string): Plan {
  const lineItem = plan.lineItems.find((item) => item.line_item_id === lineItemId);
  if (!lineItem) return plan;
  const remainingLineItems = plan.lineItems.filter((item) => item.line_item_id !== lineItemId);
  const remainingTracking = plan.tracking.filter((item) => item.line_item_id !== lineItemId);
  const otherUsage = remainingLineItems.some((item) => item.flight_id === lineItem.flight_id);
  const remainingFlights = otherUsage
    ? plan.flights
    : plan.flights.filter((flight) => flight.flight_id !== lineItem.flight_id);

  const updated = planSchema.parse({
    ...plan,
    flights: remainingFlights,
    lineItems: remainingLineItems,
    tracking: remainingTracking,
  });

  return updatePlanTimeline(updated);
}
