import type { Plan } from '@/lib/schemas';
import { Table, THead, TBody, Th, Td } from '@/ui/Table';
import { currencyFormatter, numberFormatter } from '@/lib/formatters';
import { formatDateRange } from '@/lib/date';

export function ChannelTable({ plan, readOnly }: { plan: Plan; readOnly?: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Tactic</Th>
          <Th>Campaign</Th>
          <Th>Channel</Th>
          <Th>Flight</Th>
          <Th>Budget</Th>
          <Th>Goal</Th>
        </tr>
      </THead>
      <TBody>
        {plan.tactics.map((tactic) => {
          const campaign = plan.campaigns.find((item) => item.id === tactic.campaignId);
          return (
            <tr key={tactic.id} className={readOnly ? 'bg-white' : 'bg-white hover:bg-slate-50'}>
              <Td>{tactic.name}</Td>
              <Td>{campaign?.name ?? '—'}</Td>
              <Td>{tactic.channel}</Td>
              <Td>{formatDateRange(tactic.startDate, tactic.endDate)}</Td>
              <Td align="right">{currencyFormatter.format(tactic.budget)}</Td>
              <Td align="right">
                {tactic.bidType === 'CPM' && tactic.goalImpressions
                  ? `${numberFormatter.format(tactic.goalImpressions)} imp`
                  : null}
                {tactic.bidType === 'CPC' && tactic.goalClicks
                  ? `${numberFormatter.format(tactic.goalClicks)} clicks`
                  : null}
                {tactic.bidType === 'CPA' && tactic.goalConversions
                  ? `${numberFormatter.format(tactic.goalConversions)} conv`
                  : null}
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );
}
