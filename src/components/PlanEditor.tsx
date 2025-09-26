import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import GoalKPIBar from './GoalKPIBar';
import ChannelTable from './ChannelTable';
import BudgetAllocator from './BudgetAllocator';
import SummarySidebar from './SummarySidebar';
import ExportDialog from './ExportDialog';
import PacingWarnings, { PacingWarning } from './PacingWarnings';
import { Campaign, Plan, Tactic, planSchema, tacticCsvHeaders } from '../lib/schemas';
import {
  MetricEstimates,
  estimateRevenue,
  estimateROAS,
  estimateTacticPerformance,
} from '../lib/math';

const MAX_HISTORY = 20;
const DEFAULT_AVG_ORDER_VALUE = 120;

type PlanEditorProps = {
  plan: Plan;
  campaigns: Campaign[];
  onSave(plan: Plan): Promise<void>;
  onSubmit(planId: string): Promise<void>;
  onRevert(plan: Plan): Promise<void>;
  isSaving: boolean;
  isSubmitting: boolean;
};

type PlanHistory = {
  stack: Plan[];
  index: number;
};

type CsvParseResult = {
  tactics: Tactic[];
  errors: string[];
};

type FocusKey = string;

const clonePlan = (plan: Plan): Plan => JSON.parse(JSON.stringify(plan)) as Plan;

const createHistory = (initial: Plan): PlanHistory => ({
  stack: [clonePlan(initial)],
  index: 0,
});

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));

const buildCurrencyFormatter = (currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

const buildNumberFormatter = () =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const peek = line[i + 1];
      if (inQuotes && peek === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
};

const parseCsv = (raw: string): CsvParseResult => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { tactics: [], errors: ['The CSV file is empty.'] };
  }
  const header = parseCsvLine(lines[0]);
  const expectedHeader = tacticCsvHeaders.map(String);
  if (header.length !== expectedHeader.length || !header.every((col, idx) => col === expectedHeader[idx])) {
    return {
      tactics: [],
      errors: [
        `Unexpected header. Expected: ${expectedHeader.join(', ')}`,
      ],
    };
  }
  const errors: string[] = [];
  const tactics: Tactic[] = [];
  lines.slice(1).forEach((line, lineIndex) => {
    if (!line) {
      return;
    }
    const values = parseCsvLine(line);
    if (values.length !== expectedHeader.length) {
      errors.push(`Row ${lineIndex + 2}: column count mismatch.`);
      return;
    }
    const record: Partial<Tactic> = {};
    tacticCsvHeaders.forEach((key, idx) => {
      const value = values[idx];
      if (value === '') {
        return;
      }
      if (key === 'budget' || key === 'estCpm' || key === 'estCpc' || key === 'estCpa') {
        const numeric = Number.parseFloat(value);
        if (Number.isNaN(numeric)) {
          errors.push(`Row ${lineIndex + 2}: ${String(key)} must be numeric.`);
        } else {
          (record as Record<typeof key, number>)[key] = numeric;
        }
      } else {
        (record as Record<typeof key, string>)[key] = value;
      }
    });
    if (!record.id) {
      errors.push(`Row ${lineIndex + 2}: missing tactic id.`);
      return;
    }
    if (!record.channel || !record.flightStart || !record.flightEnd || record.budget === undefined || !record.bidType) {
      errors.push(`Row ${lineIndex + 2}: missing required fields.`);
      return;
    }
    tactics.push(record as Tactic);
  });
  return { tactics, errors };
};

const serialiseCsvValue = (value: string | number | undefined): string => {
  if (value === undefined) return '';
  const stringValue = typeof value === 'number' ? String(value) : value;
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const exportTacticsToCsv = (tactics: Tactic[]): string => {
  const header = tacticCsvHeaders.join(',');
  const rows = tactics.map((tactic) =>
    tacticCsvHeaders
      .map((key) => serialiseCsvValue(tactic[key]))
      .join(','),
  );
  return [header, ...rows].join('\n');
};

const estimateGoalActual = (
  plan: Plan,
  metrics: MetricEstimates,
  roas: number,
): number => {
  const { goal } = plan.campaign;
  switch (goal.kpi) {
    case 'Reach':
      return metrics.impressions * 0.65;
    case 'Impressions':
      return metrics.impressions;
    case 'Clicks':
      return metrics.clicks;
    case 'Conversions':
      return metrics.conversions;
    case 'ROAS':
      return roas;
    default: {
      const exhaustiveCheck: never = goal.kpi;
      return exhaustiveCheck;
    }
  }
};

const useKeyboardShortcuts = (onUndo: () => void, onRedo: () => void) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
      const isRedoKey =
        (event.metaKey || event.ctrlKey) &&
        ((event.shiftKey && event.key.toLowerCase() === 'z') || event.key.toLowerCase() === 'y');
      if (isUndo) {
        event.preventDefault();
        onUndo();
      } else if (isRedoKey) {
        event.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRedo, onUndo]);
};

const toRounded = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const strings = {
  header: {
    title: 'Media Planning Workspace',
    campaignSearchPlaceholder: 'Search campaigns…',
    campaignLabel: 'Campaign',
    dateRangeLabel: 'Flight dates',
    currencyLabel: 'Currency',
    objectiveLabel: 'Objective',
  },
  actions: {
    addTactic: 'Add tactic',
    saveDraft: 'Save draft',
    submit: 'Submit for approval',
    revert: 'Revert to Draft',
    export: 'Export CSV',
    import: 'Import CSV',
  },
  allocator: {
    title: 'Budget allocator',
  },
};

const ensureTacticDefaults = (tactic: Tactic): Tactic => ({
  ...tactic,
  vendor: tactic.vendor ?? '',
  notes: tactic.notes ?? '',
});

const calculateTacticEstimates = (tactics: Tactic[]) => {
  const map = new Map<string, MetricEstimates>();
  tactics.forEach((tactic) => {
    map.set(tactic.id, estimateTacticPerformance(tactic));
  });
  return map;
};

const calculateTotals = (tactics: Tactic[], tacticEstimates: Map<string, MetricEstimates>) => {
  return tactics.reduce(
    (acc, tactic) => {
      const estimates = tacticEstimates.get(tactic.id) ?? { impressions: 0, clicks: 0, conversions: 0 };
      return {
        budget: acc.budget + (Number.isFinite(tactic.budget) ? tactic.budget : 0),
        impressions: acc.impressions + estimates.impressions,
        clicks: acc.clicks + estimates.clicks,
        conversions: acc.conversions + estimates.conversions,
      };
    },
    { budget: 0, impressions: 0, clicks: 0, conversions: 0 },
  );
};

const buildWarnings = (
  plan: Plan,
  totals: { budget: number; impressions: number; clicks: number; conversions: number },
): PacingWarning[] => {
  const warnings: PacingWarning[] = [];
  const { constraints, campaign, tactics } = plan;
  const campaignStart = Date.parse(campaign.startDate);
  const campaignEnd = Date.parse(campaign.endDate);

  tactics.forEach((tactic) => {
    const start = Date.parse(tactic.flightStart);
    const end = Date.parse(tactic.flightEnd);
    if (start < campaignStart || end > campaignEnd) {
      warnings.push({
        id: `date-${tactic.id}`,
        level: 'error',
        message: `${tactic.channel} flight is outside campaign window`,
        focusKey: `${tactic.id}.flightStart`,
      });
    }
    if (constraints.minTacticBudget && tactic.budget < constraints.minTacticBudget) {
      warnings.push({
        id: `min-${tactic.id}`,
        level: 'warning',
        message: `${tactic.channel} tactic is below the minimum budget`,
        focusKey: `${tactic.id}.budget`,
      });
    }
  });

  if (constraints.maxSharePerChannel) {
    const channelTotals = new Map<string, number>();
    plan.tactics.forEach((tactic) => {
      const spend = Number.isFinite(tactic.budget) ? tactic.budget : 0;
      channelTotals.set(tactic.channel, (channelTotals.get(tactic.channel) ?? 0) + spend);
    });
    channelTotals.forEach((channelTotal, channel) => {
      if (totals.budget === 0) return;
      const share = channelTotal / totals.budget;
      if (share > constraints.maxSharePerChannel) {
        warnings.push({
          id: `share-${channel}`,
          level: 'warning',
          message: `${channel} exceeds ${toRounded(constraints.maxSharePerChannel * 100, 1)}% allocation cap`,
          focusKey: `${plan.tactics.find((t) => t.channel === channel)?.id ?? ''}.budget`,
        });
      }
    });
  }

  const sortedFlights = [...plan.tactics].sort(
    (a, b) => Date.parse(a.flightStart) - Date.parse(b.flightStart),
  );
  for (let i = 1; i < sortedFlights.length; i += 1) {
    const previousEnd = Date.parse(sortedFlights[i - 1].flightEnd);
    const currentStart = Date.parse(sortedFlights[i].flightStart);
    if (currentStart - previousEnd > 24 * 60 * 60 * 1000) {
      warnings.push({
        id: `gap-${sortedFlights[i].id}`,
        level: 'info',
        message: 'There is a gap between tactic flights. Consider backfilling.',
        focusKey: `${sortedFlights[i].id}.flightStart`,
      });
    }
  }

  if (plan.status === 'Submitted') {
    warnings.push({
      id: 'submitted-lock',
      level: 'info',
      message: 'Plan is submitted. Use “Revert to Draft” to edit.',
    });
  }

  return warnings;
};

const applyCsvImport = (
  imported: Tactic[],
  plan: Plan,
): Plan => ({
  ...plan,
  tactics: imported.map((tactic) => ensureTacticDefaults(tactic)),
});

const PlanEditor = ({
  plan,
  campaigns,
  onSave,
  onSubmit,
  onRevert,
  isSaving,
  isSubmitting,
}: PlanEditorProps): JSX.Element => {
  const [history, setHistory] = useState<PlanHistory>(() => createHistory(plan));
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [avgOrderValue, setAvgOrderValue] = useState(DEFAULT_AVG_ORDER_VALUE);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const focusRegistry = useRef<Record<FocusKey, HTMLElement | null>>({});
  const isApplyingHistory = useRef(false);
  const lastSerialized = useRef<string>(JSON.stringify(plan));

  const form = useForm<Plan>({
    resolver: zodResolver(planSchema),
    mode: 'onChange',
    values: clonePlan(plan),
  });

  const { control, register, setValue, reset, handleSubmit, formState, getValues } = form;

  const { fields, remove, insert } = useFieldArray({
    control,
    name: 'tactics',
    keyName: 'fieldId',
  });

  const watchedPlan = useWatch({ control });
  const currentPlan = (watchedPlan ?? plan) as Plan;

  useEffect(() => {
    reset(clonePlan(plan));
    setHistory(createHistory(plan));
    lastSerialized.current = JSON.stringify(plan);
    setImportErrors([]);
  }, [plan, reset]);

  useEffect(() => {
    if (isApplyingHistory.current) {
      const snapshot = history.stack[history.index];
      reset(clonePlan(snapshot));
      lastSerialized.current = JSON.stringify(snapshot);
      isApplyingHistory.current = false;
    }
  }, [history, reset]);

  const pushHistory = useCallback(
    (snapshot: Plan) => {
      setHistory((prev) => {
        const base = prev.stack.slice(0, prev.index + 1);
        const nextStack = [...base, clonePlan(snapshot)];
        while (nextStack.length > MAX_HISTORY) {
          nextStack.shift();
        }
        return {
          stack: nextStack,
          index: nextStack.length - 1,
        };
      });
    },
    [],
  );

  useEffect(() => {
    if (isApplyingHistory.current) {
      return;
    }
    const result = planSchema.safeParse(currentPlan);
    if (!result.success) {
      return;
    }
    const serialized = JSON.stringify(result.data);
    if (serialized === lastSerialized.current) {
      return;
    }
    lastSerialized.current = serialized;
    pushHistory(result.data);
  }, [currentPlan, pushHistory]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index <= 0) {
        return prev;
      }
      isApplyingHistory.current = true;
      return { ...prev, index: prev.index - 1 };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index >= prev.stack.length - 1) {
        return prev;
      }
      isApplyingHistory.current = true;
      return { ...prev, index: prev.index + 1 };
    });
  }, []);

  useKeyboardShortcuts(handleUndo, handleRedo);

  useEffect(() => {
    const handleExternalExport = () => setExportDialogOpen(true);
    window.addEventListener('media-planning:open-export', handleExternalExport);
    return () => window.removeEventListener('media-planning:open-export', handleExternalExport);
  }, []);

  const registerFocus = useCallback((key: FocusKey) => {
    return (element: HTMLElement | null) => {
      focusRegistry.current[key] = element;
    };
  }, []);

  const focusByKey = useCallback((key?: FocusKey) => {
    if (!key) return;
    const element = focusRegistry.current[key];
    if (element) {
      element.focus();
    }
  }, []);

  const tacticEstimates = useMemo(() => calculateTacticEstimates(currentPlan.tactics), [currentPlan.tactics]);

  const totals = useMemo(() => calculateTotals(currentPlan.tactics, tacticEstimates), [
    currentPlan.tactics,
    tacticEstimates,
  ]);

  const revenue = estimateRevenue(totals.conversions, avgOrderValue);
  const roas = estimateROAS(revenue, totals.budget);
  const goalActual = estimateGoalActual(currentPlan, totals, roas);
  const goalTarget = currentPlan.campaign.goal.target;
  const currencyFormatter = useMemo(
    () => buildCurrencyFormatter(currentPlan.campaign.currency),
    [currentPlan.campaign.currency],
  );
  const numberFormatter = useMemo(() => buildNumberFormatter(), []);

  const campaignOptions = useMemo(() => {
    const query = campaignSearch.trim().toLowerCase();
    if (!query) {
      return campaigns;
    }
    return campaigns.filter((campaign) =>
      [campaign.name, campaign.brand].some((value) => value.toLowerCase().includes(query)),
    );
  }, [campaigns, campaignSearch]);

  const warnings = useMemo(() => buildWarnings(currentPlan, totals), [currentPlan, totals]);

  const onCsvExport = useCallback(() => {
    const csv = exportTacticsToCsv(currentPlan.tactics);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentPlan.campaign.name.replace(/\s+/g, '-')}-tactics.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentPlan]);

  const onCsvImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        const result = parseCsv(text);
        setImportErrors(result.errors);
        if (result.errors.length === 0) {
          const nextPlan = applyCsvImport(result.tactics, currentPlan);
          reset(nextPlan);
        }
      };
      reader.readAsText(file);
    },
    [currentPlan, reset],
  );

  const onWarningNavigate = useCallback(
    (warning: PacingWarning) => {
      if (warning.focusKey) {
        focusByKey(warning.focusKey);
      }
    },
    [focusByKey],
  );

  const onSubmitPlan = useCallback(async () => {
    await handleSubmit(async (values) => {
      await onSubmit(values.id);
    })();
  }, [handleSubmit, onSubmit]);

  const onSaveDraft = useCallback(async () => {
    await handleSubmit(async (values) => {
      await onSave(clonePlan(values));
    })();
  }, [handleSubmit, onSave]);

  const onRevertToDraft = useCallback(async () => {
    const latestValues = getValues();
    const reverted: Plan = { ...clonePlan(latestValues), status: 'Draft' };
    await onRevert(reverted);
  }, [getValues, onRevert]);

  const editingDisabled = currentPlan.status !== 'Draft';
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <section className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{strings.header.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600" aria-live="polite">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                {currentPlan.campaign.objective}
              </span>
              <span>
                {formatDate(currentPlan.campaign.startDate)} – {formatDate(currentPlan.campaign.endDate)}
              </span>
              <span>{currentPlan.campaign.currency}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <label className="text-sm font-medium text-gray-700" htmlFor="campaign-search">
              {strings.header.campaignLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="campaign-search"
                type="search"
                placeholder={strings.header.campaignSearchPlaceholder}
                className="w-48 rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={campaignSearch}
                onChange={(event) => setCampaignSearch(event.target.value)}
              />
              <select
                className="w-48 rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={currentPlan.campaign.id}
                disabled={editingDisabled}
                onChange={(event) => {
                  const selected = campaigns.find((campaign) => campaign.id === event.target.value);
                  if (selected) {
                    setValue('campaign', selected, { shouldDirty: true, shouldValidate: true });
                  }
                }}
              >
                {campaignOptions.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
        <GoalKPIBar
          kpi={currentPlan.campaign.goal.kpi}
          target={goalTarget}
          actual={goalActual}
          currency={currentPlan.campaign.currency}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <ChannelTable
            register={register}
            fields={fields}
            setValue={setValue}
            insert={insert}
            remove={remove}
            errors={formState.errors}
            tacticEstimates={tacticEstimates}
            currencyFormatter={currencyFormatter}
            numberFormatter={numberFormatter}
            disabled={editingDisabled}
            registerFocus={registerFocus}
            campaign={currentPlan.campaign}
          />

          <BudgetAllocator
            tactics={currentPlan.tactics}
            constraints={currentPlan.constraints}
            currencyFormatter={currencyFormatter}
            onApply={(updater) => {
              const next = updater(currentPlan.tactics.map((tactic) => ({ ...tactic })));
              next.forEach((tactic, index) => {
                setValue(`tactics.${index}.budget` as const, tactic.budget, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              });
            }}
            onMaxShareChange={(value) =>
              setValue('constraints.maxSharePerChannel' as const, value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            disabled={editingDisabled}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={editingDisabled || isSaving || !formState.isDirty || !formState.isValid}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-blue-200"
            >
              {isSaving ? 'Saving…' : strings.actions.saveDraft}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (editingDisabled) return;
                if (window.confirm('Submit for approval? Editing will be locked.')) {
                  await onSubmitPlan();
                }
              }}
              disabled={editingDisabled || isSubmitting}
              className="rounded border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-green-200 disabled:text-green-200"
            >
              {isSubmitting ? 'Submitting…' : strings.actions.submit}
            </button>
            {editingDisabled && (
              <button
                type="button"
                onClick={onRevertToDraft}
                className="rounded border border-gray-400 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {strings.actions.revert}
              </button>
            )}
            <button
              type="button"
              onClick={onCsvExport}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {strings.actions.export}
            </button>
            <button
              type="button"
              onClick={() => setExportDialogOpen(true)}
              className="rounded border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Export block plan
            </button>
            <label className="flex items-center gap-2 rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {strings.actions.import}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onCsvImport(file);
                    event.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          {importErrors.length > 0 && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Import blocked:</p>
              <ul className="list-disc pl-4">
                {importErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <PacingWarnings warnings={warnings} onNavigate={onWarningNavigate} />
        </div>

        <SummarySidebar
          totals={{
            budget: totals.budget,
            impressions: totals.impressions,
            clicks: totals.clicks,
            conversions: totals.conversions,
            revenue,
            roas,
          }}
          currencyFormatter={currencyFormatter}
          numberFormatter={numberFormatter}
          averageOrderValue={avgOrderValue}
          onAverageOrderValueChange={(value) => setAvgOrderValue(value)}
          channelMix={currentPlan.tactics.map((tactic) => ({
            channel: tactic.channel,
            budget: Number.isFinite(tactic.budget) ? tactic.budget : 0,
          }))}
          warnings={warnings}
          onQuickExport={() => setExportDialogOpen(true)}
        />
      </section>
      </form>
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        plan={currentPlan}
        warnings={warnings}
        averageOrderValue={avgOrderValue}
      />
    </>
  );
};

export default PlanEditor;
