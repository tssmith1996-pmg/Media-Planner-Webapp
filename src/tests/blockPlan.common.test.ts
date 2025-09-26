import { describe, expect, it } from 'vitest';
import { seedData } from '@/data/seed';
import { buildBlockPlanMatrix, buildTotalsRow, sumRow } from '@/exporters/blockPlan/common';

const plan = seedData.plans[0];

describe('buildBlockPlanMatrix', () => {
  it('creates rows for each tactic with proration buckets', () => {
    const matrix = buildBlockPlanMatrix(plan, 4);
    expect(matrix.rows.length).toEqual(plan.tactics.length);
    matrix.rows.forEach((row) => {
      expect(row.buckets.length).toEqual(4);
      expect(Math.round(sumRow(row))).toEqual(Math.round(row.budget));
    });
  });
});

describe('buildTotalsRow', () => {
  it('aggregates totals for each bucket', () => {
    const matrix = buildBlockPlanMatrix(plan, 4);
    const totals = buildTotalsRow(matrix);
    expect(totals.length).toEqual(4);
    const sumTotals = totals.reduce((acc, value) => acc + value, 0);
    const sumBudgets = matrix.rows.reduce((acc, row) => acc + row.budget, 0);
    expect(Math.round(sumTotals)).toEqual(Math.round(sumBudgets));
  });
});
