import type { Channel } from '@/lib/schemas';

type ColumnType =
  | 'text'
  | 'enum'
  | 'date'
  | 'currency'
  | 'number'
  | 'percent'
  | 'boolean';

type ColumnSpec = {
  id: string;
  label: string;
  type: ColumnType;
  width?: number;
  editable?: boolean;
  required?: boolean;
  enum?: string[];
  align?: 'left' | 'right' | 'center';
  precision?: number;
};

type ChannelColumnConfig = Record<Channel, ColumnSpec[]>;

type HierarchicalTableConfig = {
  topLevelColumns: ColumnSpec[];
  flightingCommonColumns: ColumnSpec[];
  channelSpecificColumns: ChannelColumnConfig;
};

const PricingModelOptions = {
  CPM: 'CPM',
  CPC: 'CPC',
  CPA: 'CPA',
  CPP: 'CPP',
  CPT: 'CPT',
  Fixed: 'Fixed',
  Hybrid: 'Hybrid',
} as const;

const baseCommonColumns: ColumnSpec[] = [
  {
    id: 'vendor_platform',
    label: 'Vendor / Platform',
    type: 'text',
    width: 224,
    editable: true,
    required: true,
  },
  {
    id: 'start_date',
    label: 'Start Date',
    type: 'date',
    width: 140,
    editable: true,
    required: true,
  },
  {
    id: 'end_date',
    label: 'End Date',
    type: 'date',
    width: 140,
    editable: true,
    required: true,
  },
  {
    id: 'pricing_model',
    label: 'Pricing Model',
    type: 'enum',
    enum: Object.values(PricingModelOptions),
    width: 160,
    editable: true,
    required: true,
  },
  {
    id: 'rate',
    label: 'Rate',
    type: 'currency',
    width: 140,
    editable: true,
    required: true,
    align: 'right',
  },
  {
    id: 'units_planned',
    label: 'Units Planned',
    type: 'number',
    width: 160,
    editable: true,
    align: 'right',
  },
  {
    id: 'planned_cost',
    label: 'Planned Cost',
    type: 'currency',
    width: 160,
    editable: true,
    required: true,
    align: 'right',
  },
  {
    id: 'primary_kpi',
    label: 'Primary KPI',
    type: 'text',
    width: 160,
    editable: true,
  },
  {
    id: 'audience_label',
    label: 'Audience',
    type: 'text',
    width: 200,
    editable: true,
  },
];

const channelSpecificColumns: ChannelColumnConfig = {
  OOH: [
    { id: 'owner', label: 'Owner', type: 'text', width: 160, editable: true },
    { id: 'format', label: 'Format', type: 'text', width: 160, editable: true },
    { id: 'digital', label: 'Digital', type: 'boolean', width: 120, editable: true },
    { id: 'sites', label: 'Sites', type: 'number', width: 120, editable: true, align: 'right' },
    { id: 'sov_or_loop', label: 'SOV / Loop', type: 'text', width: 150, editable: true },
    { id: 'weekly_imps', label: 'Weekly Imps', type: 'number', width: 160, editable: true, align: 'right' },
    {
      id: 'facing_orientation',
      label: 'Facing / Orientation',
      type: 'text',
      width: 180,
      editable: true,
    },
    { id: 'location', label: 'Location', type: 'text', width: 200, editable: true },
    {
      id: 'production_install_fees',
      label: 'Production / Install Fees',
      type: 'currency',
      width: 200,
      editable: true,
      align: 'right',
    },
  ],
  TV: [
    { id: 'network_region', label: 'Network / Region', type: 'text', width: 200, editable: true },
    { id: 'program_or_daypart', label: 'Program / Daypart', type: 'text', width: 200, editable: true },
    {
      id: 'spot_length_sec',
      label: 'Spot Length (sec)',
      type: 'number',
      width: 160,
      editable: true,
      align: 'right',
    },
    { id: 'spots', label: 'Spots', type: 'number', width: 140, editable: true, align: 'right' },
    { id: 'buy_unit', label: 'Buy Unit', type: 'text', width: 160, editable: true },
    { id: 'target_demo', label: 'Target Demo', type: 'text', width: 180, editable: true },
    { id: 'est_tarps', label: 'Est. TARPs', type: 'number', width: 160, editable: true, align: 'right', precision: 1 },
  ],
  BVOD_CTV: [
    { id: 'platform', label: 'Platform', type: 'text', width: 160, editable: true },
    { id: 'buy_type', label: 'Buy Type', type: 'text', width: 160, editable: true },
    {
      id: 'device_mix_ctv_pct',
      label: 'Device Mix (CTV%)',
      type: 'percent',
      width: 180,
      editable: true,
      align: 'right',
      precision: 1,
    },
    { id: 'pod_position', label: 'Pod Position', type: 'enum', width: 160, editable: true, enum: ['Pre', 'Mid', 'Post'] },
    {
      id: 'ad_duration_sec',
      label: 'Ad Duration (sec)',
      type: 'number',
      width: 160,
      editable: true,
      align: 'right',
    },
    {
      id: 'vcr_goal_pct',
      label: 'VCR Goal (%)',
      type: 'percent',
      width: 160,
      editable: true,
      align: 'right',
      precision: 1,
    },
    {
      id: 'viewability_standard',
      label: 'Viewability Std',
      type: 'text',
      width: 200,
      editable: true,
    },
  ],
  Digital_Display: [
    { id: 'exchange_or_deal', label: 'Exchange / Deal', type: 'text', width: 200, editable: true },
    { id: 'inventory_type', label: 'Inventory', type: 'enum', width: 160, editable: true, enum: ['Display', 'Outstream'] },
    { id: 'creative_sizes', label: 'Sizes', type: 'text', width: 200, editable: true },
    { id: 'targeting_short', label: 'Targeting', type: 'text', width: 180, editable: true },
    {
      id: 'viewability_goal_pct',
      label: 'Viewability Goal (%)',
      type: 'percent',
      width: 200,
      editable: true,
      align: 'right',
      precision: 1,
    },
    { id: 'brand_safety_tier', label: 'Brand Safety', type: 'text', width: 180, editable: true },
  ],
  Digital_Video: [
    { id: 'exchange_or_deal', label: 'Exchange / Deal', type: 'text', width: 200, editable: true },
    {
      id: 'inventory_type',
      label: 'Inventory',
      type: 'enum',
      width: 160,
      editable: true,
      enum: ['Instream', 'Outstream'],
    },
    {
      id: 'ad_duration_sec',
      label: 'Duration (sec)',
      type: 'number',
      width: 160,
      editable: true,
      align: 'right',
    },
    { id: 'pod_or_position', label: 'Pod / Position', type: 'text', width: 180, editable: true },
    {
      id: 'vcr_goal_pct',
      label: 'VCR Goal (%)',
      type: 'percent',
      width: 160,
      editable: true,
      align: 'right',
      precision: 1,
    },
    { id: 'brand_safety_tier', label: 'Brand Safety', type: 'text', width: 180, editable: true },
  ],
  Social: [
    { id: 'platform', label: 'Platform', type: 'text', width: 160, editable: true },
    { id: 'objective', label: 'Objective', type: 'text', width: 180, editable: true },
    { id: 'format', label: 'Format', type: 'text', width: 160, editable: true },
    { id: 'optimization_event', label: 'Optimization', type: 'text', width: 200, editable: true },
    { id: 'attribution_window', label: 'Attribution Window', type: 'text', width: 200, editable: true },
    { id: 'frequency_cap', label: 'Freq Cap', type: 'text', width: 160, editable: true },
  ],
  Search: [
    { id: 'engine', label: 'Engine', type: 'text', width: 160, editable: true },
    { id: 'campaign_type', label: 'Type', type: 'text', width: 160, editable: true },
    { id: 'keyword_or_group', label: 'Keyword / Group', type: 'text', width: 220, editable: true },
    { id: 'match_type', label: 'Match Mix', type: 'text', width: 160, editable: true },
    { id: 'bid_strategy', label: 'Bid Strategy', type: 'text', width: 200, editable: true },
    {
      id: 'avg_quality_score',
      label: 'Avg. QS',
      type: 'number',
      width: 140,
      editable: true,
      align: 'right',
      precision: 1,
    },
  ],
  Radio: [
    { id: 'network_or_platform', label: 'Network / Platform', type: 'text', width: 200, editable: true },
    { id: 'station', label: 'Station', type: 'text', width: 160, editable: true },
    { id: 'daypart', label: 'Daypart', type: 'text', width: 160, editable: true },
    {
      id: 'spot_length_sec',
      label: 'Spot Length (sec)',
      type: 'number',
      width: 180,
      editable: true,
      align: 'right',
    },
    { id: 'spots', label: 'Spots', type: 'number', width: 140, editable: true, align: 'right' },
    { id: 'format_genre', label: 'Format / Genre', type: 'text', width: 200, editable: true },
    {
      id: 'cpp_or_cpm',
      label: 'CPP / CPM',
      type: 'currency',
      width: 160,
      editable: true,
      align: 'right',
    },
  ],
  Streaming_Audio: [
    { id: 'network_or_platform', label: 'Platform', type: 'text', width: 200, editable: true },
    { id: 'station', label: 'Stream', type: 'text', width: 160, editable: true },
    { id: 'daypart', label: 'Daypart', type: 'text', width: 160, editable: true },
    {
      id: 'spot_length_sec',
      label: 'Spot Length (sec)',
      type: 'number',
      width: 180,
      editable: true,
      align: 'right',
    },
    { id: 'spots', label: 'Spots', type: 'number', width: 140, editable: true, align: 'right' },
    { id: 'format_genre', label: 'Format / Genre', type: 'text', width: 200, editable: true },
    {
      id: 'cpp_or_cpm',
      label: 'CPP / CPM',
      type: 'currency',
      width: 160,
      editable: true,
      align: 'right',
    },
  ],
  Podcast: [
    { id: 'publisher_show', label: 'Publisher / Show', type: 'text', width: 220, editable: true },
    { id: 'episode_or_date', label: 'Episode / Date', type: 'text', width: 200, editable: true },
    { id: 'ad_position', label: 'Ad Position', type: 'enum', width: 160, editable: true, enum: ['Pre', 'Mid', 'Post'] },
    { id: 'read_type', label: 'Read Type', type: 'enum', width: 160, editable: true, enum: ['Talent', 'Announcer'] },
    { id: 'insertion_type', label: 'Insertion', type: 'enum', width: 160, editable: true, enum: ['Baked-in', 'Dynamic'] },
    { id: 'est_downloads', label: 'Est. Downloads', type: 'number', width: 180, editable: true, align: 'right' },
  ],
  Cinema: [
    { id: 'circuit', label: 'Circuit', type: 'text', width: 160, editable: true },
    { id: 'locations_count', label: 'Locations', type: 'number', width: 160, editable: true, align: 'right' },
    { id: 'screens_count', label: 'Screens', type: 'number', width: 160, editable: true, align: 'right' },
    { id: 'sessions_per_week', label: 'Sessions / Week', type: 'number', width: 180, editable: true, align: 'right' },
    {
      id: 'spot_length_sec',
      label: 'Spot Length (sec)',
      type: 'number',
      width: 160,
      editable: true,
      align: 'right',
    },
    { id: 'package', label: 'Package', type: 'text', width: 160, editable: true },
  ],
  Print: [
    { id: 'publication', label: 'Publication', type: 'text', width: 200, editable: true },
    { id: 'section', label: 'Section', type: 'text', width: 160, editable: true },
    { id: 'edition_date', label: 'Edition Date', type: 'date', width: 160, editable: true },
    { id: 'ad_size', label: 'Ad Size', type: 'text', width: 160, editable: true },
    { id: 'position', label: 'Position', type: 'text', width: 160, editable: true },
    { id: 'color_mode', label: 'Color', type: 'enum', width: 140, editable: true, enum: ['B/W', '4C'] },
  ],
  Retail_Media: [
    { id: 'retailer', label: 'Retailer', type: 'text', width: 180, editable: true },
    { id: 'onsite_format', label: 'Onsite Format', type: 'text', width: 200, editable: true },
    { id: 'offsite_format', label: 'Offsite Format', type: 'text', width: 200, editable: true },
    { id: 'sku_count', label: 'SKU Count', type: 'number', width: 160, editable: true, align: 'right' },
    { id: 'attribution_source', label: 'Attribution Source', type: 'text', width: 200, editable: true },
    { id: 'roas_target', label: 'ROAS Target', type: 'number', width: 160, editable: true, align: 'right', precision: 2 },
  ],
  Influencer: [
    { id: 'creator_handle', label: 'Creator', type: 'text', width: 200, editable: true },
    { id: 'platform', label: 'Platform', type: 'text', width: 160, editable: true },
    { id: 'deliverables_short', label: 'Deliverables', type: 'text', width: 200, editable: true },
    { id: 'followers_k', label: 'Followers (k)', type: 'number', width: 180, editable: true, align: 'right', precision: 1 },
    { id: 'usage_window_days', label: 'Usage Window (days)', type: 'number', width: 200, editable: true, align: 'right' },
    { id: 'whitelisting', label: 'Whitelisting', type: 'boolean', width: 160, editable: true },
  ],
  Sponsorship: [
    { id: 'property', label: 'Property', type: 'text', width: 200, editable: true },
    { id: 'rights_summary', label: 'Rights Summary', type: 'text', width: 220, editable: true },
    { id: 'key_dates', label: 'Key Dates', type: 'text', width: 180, editable: true },
    { id: 'assets_count', label: 'Asset Count', type: 'number', width: 160, editable: true, align: 'right' },
    { id: 'makegoods', label: 'Makegoods', type: 'boolean', width: 140, editable: true },
  ],
  Email: [
    { id: 'type_email_or_dm', label: 'Channel', type: 'enum', width: 160, editable: true, enum: ['email', 'direct_mail'] },
    { id: 'platform_or_broker', label: 'Platform / Broker', type: 'text', width: 200, editable: true },
    { id: 'audience_size', label: 'Audience Size', type: 'number', width: 180, editable: true, align: 'right' },
    { id: 'send_or_drop_date', label: 'Send / Drop Date', type: 'date', width: 180, editable: true },
    { id: 'template_or_format', label: 'Template / Format', type: 'text', width: 200, editable: true },
    { id: 'seed_or_broker', label: 'Seed / Broker', type: 'text', width: 200, editable: true },
  ],
  Direct_Mail: [
    { id: 'type_email_or_dm', label: 'Channel', type: 'enum', width: 160, editable: true, enum: ['email', 'direct_mail'] },
    { id: 'platform_or_broker', label: 'Platform / Broker', type: 'text', width: 200, editable: true },
    { id: 'audience_size', label: 'Audience Size', type: 'number', width: 180, editable: true, align: 'right' },
    { id: 'send_or_drop_date', label: 'Send / Drop Date', type: 'date', width: 180, editable: true },
    { id: 'template_or_format', label: 'Template / Format', type: 'text', width: 200, editable: true },
    { id: 'seed_or_broker', label: 'Seed / Broker', type: 'text', width: 200, editable: true },
  ],
  Gaming: [
    { id: 'subtype', label: 'Subtype', type: 'enum', width: 160, editable: true, enum: ['Gaming', 'Native', 'In-App'] },
    { id: 'platform_or_network', label: 'Platform / Network', type: 'text', width: 200, editable: true },
    { id: 'title_or_publisher', label: 'Title / Publisher', type: 'text', width: 200, editable: true },
    { id: 'ad_format', label: 'Ad Format', type: 'text', width: 180, editable: true },
    { id: 'brand_safety', label: 'Brand Safety', type: 'text', width: 180, editable: true },
  ],
  Native: [
    { id: 'subtype', label: 'Subtype', type: 'enum', width: 160, editable: true, enum: ['Gaming', 'Native', 'In-App'] },
    { id: 'platform_or_network', label: 'Platform / Network', type: 'text', width: 200, editable: true },
    { id: 'title_or_publisher', label: 'Title / Publisher', type: 'text', width: 200, editable: true },
    { id: 'ad_format', label: 'Ad Format', type: 'text', width: 180, editable: true },
    { id: 'brand_safety', label: 'Brand Safety', type: 'text', width: 180, editable: true },
  ],
  Affiliate: [
    { id: 'network', label: 'Network', type: 'text', width: 200, editable: true },
    { id: 'partner', label: 'Partner', type: 'text', width: 200, editable: true },
    { id: 'commission_model', label: 'Commission', type: 'enum', width: 180, editable: true, enum: ['CPS', 'CPL', 'Flat'] },
    {
      id: 'cookie_window_days',
      label: 'Cookie Window (days)',
      type: 'number',
      width: 200,
      editable: true,
      align: 'right',
    },
    { id: 'promo_codes_count', label: 'Promo Codes', type: 'number', width: 180, editable: true, align: 'right' },
  ],
  Experiential: [
    { id: 'property', label: 'Property', type: 'text', width: 200, editable: true },
    { id: 'rights_summary', label: 'Rights Summary', type: 'text', width: 220, editable: true },
    { id: 'key_dates', label: 'Key Dates', type: 'text', width: 180, editable: true },
    { id: 'assets_count', label: 'Asset Count', type: 'number', width: 160, editable: true, align: 'right' },
    { id: 'makegoods', label: 'Makegoods', type: 'boolean', width: 140, editable: true },
  ],
};

export const channelTableConfig: HierarchicalTableConfig = {
  topLevelColumns: [
    { id: 'channel', label: 'Channel', type: 'text', width: 200 },
    { id: 'start_date', label: 'Start Date', type: 'date', width: 140 },
    { id: 'end_date', label: 'End Date', type: 'date', width: 140 },
    { id: 'total_planned_cost', label: 'Total Planned Cost', type: 'currency', width: 180, align: 'right' },
    { id: 'budget_percent', label: 'Budget %', type: 'percent', width: 140, align: 'right', precision: 1 },
    { id: 'actions', label: 'Actions', type: 'text', width: 240 },
  ],
  flightingCommonColumns: baseCommonColumns,
  channelSpecificColumns: channelSpecificColumns,
};

export type { ColumnSpec, ColumnType, HierarchicalTableConfig };
