import {
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayInsert,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Fragment, useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { Campaign, Plan, Tactic, TacticChannel, BidType, tacticCsvHeaders } from '../lib/schemas';
import { MetricEstimates } from '../lib/math';

type ChannelTableProps = {
  register: UseFormRegister<Plan>;
  fields: FieldArrayWithId<Plan, 'tactics', 'fieldId'>[];
  setValue: UseFormSetValue<Plan>;
  insert: UseFieldArrayInsert<Plan, 'tactics'>;
  remove: UseFieldArrayRemove<Plan, 'tactics'>;
  errors: FieldErrors<Plan>;
  tacticEstimates: Map<string, MetricEstimates>;
  currencyFormatter: Intl.NumberFormat;
  numberFormatter: Intl.NumberFormat;
  disabled: boolean;
  registerFocus: (key: string) => (element: HTMLElement | null) => void;
  campaign: Campaign;
};

const channelOptions: TacticChannel[] = [
  'Search',
  'Social',
  'Display',
  'Video',
  'Audio',
  'DOOH',
  'Affiliate',
  'Retail Media',
  'Other',
];

const bidTypes: BidType[] = ['CPM', 'CPC', 'CPA'];

const sumBy = (values: number[]) => values.reduce((total, value) => total + value, 0);

const createDefaultTactic = (campaign: Campaign): Tactic => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tac_${Math.random().toString(36).slice(2, 9)}`,
  channel: 'Display',
  vendor: '',
  flightStart: campaign.startDate,
  flightEnd: campaign.endDate,
  budget: 0,
  bidType: 'CPM',
  estCpm: 5,
  notes: '',
});

const formatNumber = (formatter: Intl.NumberFormat, value: number) => formatter.format(Math.round(value));

const handleCellKey = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  if (event.key === 'Escape') {
    (event.target as HTMLElement).blur();
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const next = (event.currentTarget.closest('td')?.nextElementSibling?.querySelector(
      'input, select, textarea',
    ) ?? null) as HTMLElement | null;
    if (next) {
      next.focus();
    }
  }
};

const ChannelTable = ({
  fields,
  register,
  setValue,
  insert,
  remove,
  errors,
  tacticEstimates,
  currencyFormatter,
  numberFormatter,
  disabled,
  registerFocus,
  campaign,
}: ChannelTableProps): JSX.Element => {
  const totals = useMemo(() => {
    const budgets = fields.map((field) => (Number.isFinite((field as unknown as Tactic).budget) ? (field as unknown as Tactic).budget : 0));
    const impressions = fields.map((field) => tacticEstimates.get((field as unknown as Tactic).id)?.impressions ?? 0);
    const clicks = fields.map((field) => tacticEstimates.get((field as unknown as Tactic).id)?.clicks ?? 0);
    const conversions = fields.map((field) => tacticEstimates.get((field as unknown as Tactic).id)?.conversions ?? 0);
    return {
      budget: sumBy(budgets),
      impressions: sumBy(impressions),
      clicks: sumBy(clicks),
      conversions: sumBy(conversions),
    };
  }, [fields, tacticEstimates]);

  const onPasteRow = (index: number) => (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text.includes(',') && !text.includes('\t')) {
      return;
    }
    event.preventDefault();
    const tokens = text.trim().split(/[\t,]/);
    tacticCsvHeaders.forEach((key, position) => {
      const value = tokens[position];
      if (value === undefined) return;
      if (key === 'budget' || key === 'estCpm' || key === 'estCpc' || key === 'estCpa') {
        const numeric = Number.parseFloat(value);
        if (!Number.isNaN(numeric)) {
          setValue(`tactics.${index}.${key}`, numeric, { shouldDirty: true, shouldValidate: true });
        }
      } else {
        setValue(`tactics.${index}.${key}`, value, { shouldDirty: true, shouldValidate: true });
      }
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">Channel tactics</h2>
        <button
          type="button"
          onClick={() => insert(0, createDefaultTactic(campaign))}
          className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={disabled}
        >
          + Add tactic
        </button>
      </div>
      <table className="min-w-full table-fixed border-t border-gray-200 text-left text-sm">
        <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
          <tr>
            <th className="w-32 px-3 py-2">Channel</th>
            <th className="w-32 px-3 py-2">Vendor</th>
            <th className="w-44 px-3 py-2">Flight</th>
            <th className="w-28 px-3 py-2">Bid type</th>
            <th className="w-28 px-3 py-2">Est. CPM</th>
            <th className="w-28 px-3 py-2">Est. CPC</th>
            <th className="w-28 px-3 py-2">Est. CPA</th>
            <th className="w-28 px-3 py-2">Budget</th>
            <th className="w-32 px-3 py-2">Est. Impr.</th>
            <th className="w-32 px-3 py-2">Est. Clicks</th>
            <th className="w-32 px-3 py-2">Est. Conv.</th>
            <th className="px-3 py-2">Notes</th>
            <th className="w-16 px-3 py-2 text-center">Delete</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => {
            const tactic = field as unknown as Tactic;
            const tacticId = tactic.id;
            const estimates = tacticEstimates.get(tacticId) ?? { impressions: 0, clicks: 0, conversions: 0 };
            const tacticErrors = (errors?.tactics?.[index] as FieldErrors<Tactic> | undefined) ?? {};
            const sharedProps = { disabled } as const;
            const idRegister = register(`tactics.${index}.id` as const);
            const channelRegister = register(`tactics.${index}.channel` as const);
            const vendorRegister = register(`tactics.${index}.vendor` as const);
            const flightStartRegister = register(`tactics.${index}.flightStart` as const);
            const flightEndRegister = register(`tactics.${index}.flightEnd` as const);
            const bidTypeRegister = register(`tactics.${index}.bidType` as const);
            const estCpmRegister = register(`tactics.${index}.estCpm` as const, { valueAsNumber: true });
            const estCpcRegister = register(`tactics.${index}.estCpc` as const, { valueAsNumber: true });
            const estCpaRegister = register(`tactics.${index}.estCpa` as const, { valueAsNumber: true });
            const budgetRegister = register(`tactics.${index}.budget` as const, { valueAsNumber: true });
            const notesRegister = register(`tactics.${index}.notes` as const);

            return (
              <Fragment key={field.fieldId ?? tacticId}>
                <tr className="even:bg-gray-50">
                  <td className="px-2 py-2">
                    <select
                      {...channelRegister}
                      onKeyDown={handleCellKey}
                      onPaste={onPasteRow(index)}
                      className="w-full rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      ref={(element) => {
                        channelRegister.ref(element);
                        registerFocus(`${tacticId}.channel`)(element);
                      }}
                      {...sharedProps}
                    >
                      {channelOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {tacticErrors.channel && (
                      <p className="mt-1 text-xs text-rose-600">{String(tacticErrors.channel.message ?? '')}</p>
                    )}
                    <input type="hidden" {...idRegister} value={tacticId} />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      {...vendorRegister}
                      onKeyDown={handleCellKey}
                      placeholder="Vendor"
                      ref={(element) => {
                        vendorRegister.ref(element);
                        registerFocus(`${tacticId}.vendor`)(element);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        {...flightStartRegister}
                        onKeyDown={handleCellKey}
                        ref={(element) => {
                          flightStartRegister.ref(element);
                          registerFocus(`${tacticId}.flightStart`)(element);
                        }}
                        className="w-1/2 rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        {...sharedProps}
                      />
                      <input
                        type="date"
                        {...flightEndRegister}
                        onKeyDown={handleCellKey}
                        ref={(element) => {
                          flightEndRegister.ref(element);
                          registerFocus(`${tacticId}.flightEnd`)(element);
                        }}
                        className="w-1/2 rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        {...sharedProps}
                      />
                    </div>
                    {(tacticErrors.flightStart || tacticErrors.flightEnd) && (
                      <p className="mt-1 text-xs text-rose-600">
                        {String(tacticErrors.flightStart?.message ?? tacticErrors.flightEnd?.message ?? '')}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      {...bidTypeRegister}
                      onKeyDown={handleCellKey}
                      ref={(element) => {
                        bidTypeRegister.ref(element);
                        registerFocus(`${tacticId}.bidType`)(element);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    >
                      {bidTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      {...estCpmRegister}
                      onKeyDown={handleCellKey}
                      ref={(element) => {
                        estCpmRegister.ref(element);
                        registerFocus(`${tacticId}.estCpm`)(element);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    />
                    {tacticErrors.estCpm && (
                      <p className="mt-1 text-xs text-rose-600">{String(tacticErrors.estCpm.message ?? '')}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      {...estCpcRegister}
                      onKeyDown={handleCellKey}
                      ref={(element) => {
                        estCpcRegister.ref(element);
                        registerFocus(`${tacticId}.estCpc`)(element);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    />
                    {tacticErrors.estCpc && (
                      <p className="mt-1 text-xs text-rose-600">{String(tacticErrors.estCpc.message ?? '')}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      {...estCpaRegister}
                      onKeyDown={handleCellKey}
                      ref={(element) => {
                        estCpaRegister.ref(element);
                        registerFocus(`${tacticId}.estCpa`)(element);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    />
                    {tacticErrors.estCpa && (
                      <p className="mt-1 text-xs text-rose-600">{String(tacticErrors.estCpa.message ?? '')}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="100"
                      {...budgetRegister}
                      onKeyDown={handleCellKey}
                      ref={(element) => {
                        budgetRegister.ref(element);
                        registerFocus(`${tacticId}.budget`)(element);
                      }}
                      className="w-full rounded border border-transparent px-2 py-1 text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    />
                    {tacticErrors.budget && (
                      <p className="mt-1 text-xs text-rose-600">{String(tacticErrors.budget.message ?? '')}</p>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {formatNumber(numberFormatter, estimates.impressions)}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {formatNumber(numberFormatter, estimates.clicks)}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {formatNumber(numberFormatter, estimates.conversions)}
                  </td>
                  <td className="px-2 py-2">
                    <textarea
                      {...notesRegister}
                      onKeyDown={handleCellKey}
                      ref={(element) => {
                        notesRegister.ref(element);
                        registerFocus(`${tacticId}.notes`)(element);
                      }}
                      rows={1}
                      className="w-full resize-y rounded border border-transparent px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                      {...sharedProps}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded border border-transparent px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-200"
                      disabled={disabled}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 text-sm font-medium text-gray-700">
          <tr>
            <td className="px-3 py-2" colSpan={7}>
              Totals
            </td>
            <td className="px-3 py-2 text-right">{currencyFormatter.format(totals.budget)}</td>
            <td className="px-3 py-2 text-right">{formatNumber(numberFormatter, totals.impressions)}</td>
            <td className="px-3 py-2 text-right">{formatNumber(numberFormatter, totals.clicks)}</td>
            <td className="px-3 py-2 text-right">{formatNumber(numberFormatter, totals.conversions)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ChannelTable;
