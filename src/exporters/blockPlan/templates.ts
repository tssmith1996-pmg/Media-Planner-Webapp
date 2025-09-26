import { Plan } from '../../lib/schemas';
import { BlockMetric, Timegrain } from './common';

export type ExportFormat = 'xlsx' | 'pdf';
export type ExportTemplateId = 'ClientSimple' | 'PMGStandard' | 'DetailedTactic';
export type PdfRowHeight = 'compact' | 'normal' | 'comfy';

export interface ExportUIOptions {
  format: ExportFormat;
  template: ExportTemplateId;
  brand: {
    client?: string;
    logoDataUrl?: string;
    primary: string;
    secondary: string;
    footer?: string;
  };
  layout: {
    groupBy: 'Channel' | 'Tactic';
    timegrain: Timegrain;
    orientation?: 'portrait' | 'landscape';
    rowHeight?: PdfRowHeight;
    rangeStart?: string;
    rangeEnd?: string;
  };
  columns: {
    showChannel: boolean;
    showVendor: boolean;
    showBidType: boolean;
    showBudget: boolean;
    showImpressions: boolean;
    showClicks: boolean;
    showConversions: boolean;
    showRoas: boolean;
    showNotes: boolean;
    showTotalsRow: boolean;
    showTotalsColumn: boolean;
  };
  metric: BlockMetric;
  rounding: 1 | 10 | 100 | 1000;
  abbreviate: boolean;
  currency?: Plan['campaign']['currency'];
  includeWarningsPage: boolean;
  averageOrderValue?: number;
}

export interface ExportTemplateDefinition {
  id: ExportTemplateId;
  label: string;
  description: string;
  defaults(plan: Plan): ExportUIOptions;
}

const clientSimpleDefaults = (plan: Plan): ExportUIOptions => ({
  format: 'pdf',
  template: 'ClientSimple',
  brand: {
    client: plan.campaign.brand,
    primary: '#1f2937',
    secondary: '#9ca3af',
    footer: 'Confidential',
  },
  layout: {
    groupBy: 'Channel',
    timegrain: 'Month',
    orientation: 'landscape',
    rowHeight: 'comfy',
    rangeStart: plan.campaign.startDate,
    rangeEnd: plan.campaign.endDate,
  },
  columns: {
    showChannel: true,
    showVendor: false,
    showBidType: false,
    showBudget: true,
    showImpressions: false,
    showClicks: false,
    showConversions: false,
    showRoas: false,
    showNotes: false,
    showTotalsRow: true,
    showTotalsColumn: true,
  },
  metric: 'Budget',
  rounding: 100,
  abbreviate: true,
  currency: plan.campaign.currency,
  includeWarningsPage: false,
  averageOrderValue: 120,
});

const pmgStandardDefaults = (plan: Plan): ExportUIOptions => ({
  format: 'pdf',
  template: 'PMGStandard',
  brand: {
    client: plan.campaign.name,
    primary: '#0f172a',
    secondary: '#3b82f6',
    footer: 'Confidential – PMG',
  },
  layout: {
    groupBy: 'Tactic',
    timegrain: 'Week',
    orientation: 'landscape',
    rowHeight: 'normal',
    rangeStart: plan.campaign.startDate,
    rangeEnd: plan.campaign.endDate,
  },
  columns: {
    showChannel: true,
    showVendor: true,
    showBidType: true,
    showBudget: true,
    showImpressions: true,
    showClicks: true,
    showConversions: true,
    showRoas: true,
    showNotes: false,
    showTotalsRow: true,
    showTotalsColumn: true,
  },
  metric: 'Budget',
  rounding: 10,
  abbreviate: false,
  currency: plan.campaign.currency,
  includeWarningsPage: true,
  averageOrderValue: 120,
});

const detailedTacticDefaults = (plan: Plan): ExportUIOptions => ({
  format: 'xlsx',
  template: 'DetailedTactic',
  brand: {
    client: plan.campaign.name,
    primary: '#1d4ed8',
    secondary: '#f97316',
    footer: 'Internal Use Only',
  },
  layout: {
    groupBy: 'Tactic',
    timegrain: 'Week',
    orientation: 'landscape',
    rowHeight: 'compact',
    rangeStart: plan.campaign.startDate,
    rangeEnd: plan.campaign.endDate,
  },
  columns: {
    showChannel: true,
    showVendor: true,
    showBidType: true,
    showBudget: true,
    showImpressions: true,
    showClicks: true,
    showConversions: true,
    showRoas: true,
    showNotes: true,
    showTotalsRow: true,
    showTotalsColumn: true,
  },
  metric: 'Impressions',
  rounding: 1,
  abbreviate: false,
  currency: plan.campaign.currency,
  includeWarningsPage: true,
  averageOrderValue: 120,
});

export const exportTemplates: ExportTemplateDefinition[] = [
  {
    id: 'ClientSimple',
    label: 'Client Simple',
    description: 'Channel roll-up by month with budget emphasis.',
    defaults: clientSimpleDefaults,
  },
  {
    id: 'PMGStandard',
    label: 'PMG Standard',
    description: 'Weekly tactic detail with vendor and pacing summary.',
    defaults: pmgStandardDefaults,
  },
  {
    id: 'DetailedTactic',
    label: 'Detailed Tactic',
    description: 'Full funnel metrics per tactic with notes.',
    defaults: detailedTacticDefaults,
  },
];

export const getTemplateDefaults = (template: ExportTemplateId, plan: Plan): ExportUIOptions => {
  const definition = exportTemplates.find((item) => item.id === template) ?? exportTemplates[0];
  return definition.defaults(plan);
};
