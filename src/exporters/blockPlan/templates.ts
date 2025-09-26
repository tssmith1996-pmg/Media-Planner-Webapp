export const blockPlanTemplates = [
  {
    id: 'client-simple',
    name: 'Client Simple',
    description: 'Lean format with spend by channel and quarter.',
  },
  {
    id: 'pmg-standard',
    name: 'PMG Standard',
    description: 'Standard internal format with pacing guidance.',
  },
  {
    id: 'detailed-tactic',
    name: 'Detailed Tactic',
    description: 'Full tactic-level detail and proration matrix.',
  },
] as const;
