import { Campaign, Plan, planSchema } from './schemas';

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const STORAGE_KEY = 'media-planner-db-v1';

const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  } satisfies StorageLike;
})();

const storage: StorageLike =
  typeof window !== 'undefined' && window.localStorage
    ? {
        getItem: (key: string) => window.localStorage.getItem(key),
        setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
      }
    : memoryStorage;

type Database = {
  campaigns: Campaign[];
  plans: Record<string, Plan>;
};

const createSeedData = (): Database => {
  const campaigns: Campaign[] = [
    {
      id: 'cmp_au_q4',
      name: 'Q4 Launch – AU',
      brand: 'Aurora Home',
      objective: 'Conversion',
      startDate: '2024-10-01',
      endDate: '2024-11-30',
      currency: 'AUD',
      goal: {
        kpi: 'Conversions',
        target: 2000,
      },
    },
    {
      id: 'cmp_us_brand',
      name: 'Brand Lift US',
      brand: 'Aurora Home',
      objective: 'Awareness',
      startDate: '2024-09-01',
      endDate: '2024-12-15',
      currency: 'USD',
      goal: {
        kpi: 'Reach',
        target: 500000,
      },
    },
    {
      id: 'cmp_eu_perf',
      name: 'Holiday Retargeting EU',
      brand: 'Aurora Home',
      objective: 'Consideration',
      startDate: '2024-10-15',
      endDate: '2024-12-31',
      currency: 'EUR',
      goal: {
        kpi: 'ROAS',
        target: 4,
      },
    },
  ];

  const plan: Plan = {
    id: 'plan_au_q4',
    campaign: campaigns[0],
    tactics: [
      {
        id: 'tac_search_google',
        channel: 'Search',
        vendor: 'Google Ads',
        flightStart: '2024-10-01',
        flightEnd: '2024-11-30',
        budget: 40000,
        bidType: 'CPC',
        estCpc: 2.2,
        notes: 'Always-on brand + conquest keywords',
      },
      {
        id: 'tac_social_meta',
        channel: 'Social',
        vendor: 'Meta',
        flightStart: '2024-10-05',
        flightEnd: '2024-11-25',
        budget: 25000,
        bidType: 'CPM',
        estCpm: 9.5,
        notes: 'Prospecting + dynamic product ads',
      },
      {
        id: 'tac_video_youtube',
        channel: 'Video',
        vendor: 'YouTube',
        flightStart: '2024-10-10',
        flightEnd: '2024-11-20',
        budget: 15000,
        bidType: 'CPM',
        estCpm: 14,
      },
      {
        id: 'tac_display_programmatic',
        channel: 'Display',
        vendor: 'DV360',
        flightStart: '2024-10-01',
        flightEnd: '2024-11-30',
        budget: 10000,
        bidType: 'CPM',
        estCpm: 5.5,
      },
    ],
    constraints: {
      dailyPacing: true,
      maxSharePerChannel: 0.6,
      minTacticBudget: 5000,
    },
    status: 'Draft',
    lastModified: new Date().toISOString(),
  };

  return {
    campaigns,
    plans: {
      [plan.id]: plan,
    },
  };
};

const readDb = (): Database => {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedData();
    storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Database;
    return parsed;
  } catch (error) {
    console.error('Failed to parse stored data, resetting', error);
    const seeded = createSeedData();
    storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const writeDb = (db: Database) => {
  storage.setItem(STORAGE_KEY, JSON.stringify(db));
};

const clonePlan = (plan: Plan): Plan => planSchema.parse(JSON.parse(JSON.stringify(plan)));

class FakeServer {
  async getCampaigns(query?: string): Promise<Campaign[]> {
    const db = readDb();
    if (!query) {
      return db.campaigns;
    }
    const lowered = query.toLowerCase();
    return db.campaigns.filter((campaign) =>
      [campaign.name, campaign.brand].some((field) => field.toLowerCase().includes(lowered)),
    );
  }

  async getPlan(planId: string): Promise<Plan> {
    const db = readDb();
    const plan = db.plans[planId];
    if (!plan) {
      throw new Error('Plan not found');
    }
    return clonePlan(plan);
  }

  async savePlan(updated: Plan): Promise<Plan> {
    const db = readDb();
    const parsed = planSchema.parse({ ...updated, lastModified: new Date().toISOString() });
    db.plans[parsed.id] = parsed;
    writeDb(db);
    return clonePlan(parsed);
  }

  async submitPlan(planId: string): Promise<{ status: 'Submitted' }> {
    const db = readDb();
    const plan = db.plans[planId];
    if (!plan) {
      throw new Error('Plan not found');
    }
    const next: Plan = { ...plan, status: 'Submitted', lastModified: new Date().toISOString() };
    db.plans[planId] = next;
    writeDb(db);
    return { status: 'Submitted' } as const;
  }
}

export const fakeServer = new FakeServer();
