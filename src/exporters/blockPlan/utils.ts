import type { Plan } from '../../lib/schemas';

export const buildExportFileName = (plan: Plan, extension: 'xlsx' | 'pdf'): string => {
  const stamp = new Intl.DateTimeFormat('en-CA').format(new Date());
  const safeName = plan.campaign.name.replace(/[^a-z0-9]+/gi, '_');
  return `BlockPlan_${safeName}_${stamp}.${extension}`;
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const normalised = hex.replace('#', '');
  const bigint = Number.parseInt(normalised, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
};
