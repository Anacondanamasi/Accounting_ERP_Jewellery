const pad2 = (n: number) => String(n).padStart(2, "0");

export const formatIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export interface PeriodOption {
  value: string;
  label: string;
  getFromTo: () => { from: string; to: string };
}

export const PERIOD_PRESETS: PeriodOption[] = [
  {
    value: "all_time",
    label: "All Time (From Inception)",
    getFromTo: () => ({
      from: "2024-04-01",
      to: formatIsoDate(new Date()),
    }),
  },
  {
    value: "this_fy",
    label: "This Financial Year (FY 2026-27)",
    getFromTo: () => ({
      from: "2026-04-01",
      to: "2027-03-31",
    }),
  },
  {
    value: "last_fy",
    label: "Previous Financial Year (FY 2025-26)",
    getFromTo: () => ({
      from: "2025-04-01",
      to: "2026-03-31",
    }),
  },
  {
    value: "fy_2024_25",
    label: "Financial Year 2024-25",
    getFromTo: () => ({
      from: "2024-04-01",
      to: "2025-03-31",
    }),
  },
  {
    value: "today",
    label: "Today",
    getFromTo: () => {
      const now = formatIsoDate(new Date());
      return { from: now, to: now };
    },
  },
  {
    value: "this_month",
    label: "This Month",
    getFromTo: () => {
      const d = new Date();
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { from: formatIsoDate(first), to: formatIsoDate(last) };
    },
  },
  {
    value: "last_month",
    label: "Last Month",
    getFromTo: () => {
      const d = new Date();
      const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const last = new Date(d.getFullYear(), d.getMonth(), 0);
      return { from: formatIsoDate(first), to: formatIsoDate(last) };
    },
  },
  {
    value: "this_quarter",
    label: "This Quarter",
    getFromTo: () => {
      const d = new Date();
      const q = Math.floor(d.getMonth() / 3);
      const first = new Date(d.getFullYear(), q * 3, 1);
      const last = new Date(d.getFullYear(), (q + 1) * 3, 0);
      return { from: formatIsoDate(first), to: formatIsoDate(last) };
    },
  },
  {
    value: "custom",
    label: "Custom Date Range",
    getFromTo: () => ({
      from: "2024-04-01",
      to: formatIsoDate(new Date()),
    }),
  },
];

export const getDatesForPeriod = (periodKey: string): { from: string; to: string } => {
  const match = PERIOD_PRESETS.find((p) => p.value === periodKey);
  if (match) return match.getFromTo();
  return { from: "2024-04-01", to: formatIsoDate(new Date()) };
};
