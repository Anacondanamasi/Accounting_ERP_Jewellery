const pad2 = (n: number) => String(n).padStart(2, "0");

export const formatIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export interface PeriodOption {
  value: string;
  label: string;
  getFromTo: () => { from: string; to: string };
}

export const getIndianFinancialYear = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, 3 = April
  const startYear = month >= 3 ? year : year - 1;
  return {
    startYear,
    endYear: startYear + 1,
    label: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
};

export const PERIOD_PRESETS: PeriodOption[] = [
  {
    value: "all_time",
    label: "All Dates",
    getFromTo: () => ({
      from: "",
      to: "",
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
    value: "yesterday",
    label: "Yesterday",
    getFromTo: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = formatIsoDate(d);
      return { from: y, to: y };
    },
  },
  {
    value: "this_week",
    label: "This Week",
    getFromTo: () => {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(d.setDate(diff + 6));
      return { from: formatIsoDate(monday), to: formatIsoDate(sunday) };
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
    value: "this_fy",
    label: (() => {
      const fy = getIndianFinancialYear();
      return `This Financial Year (${fy.label})`;
    })(),
    getFromTo: () => {
      const fy = getIndianFinancialYear();
      return { from: fy.from, to: fy.to };
    },
  },
  {
    value: "last_fy",
    label: (() => {
      const fy = getIndianFinancialYear();
      return `Previous Financial Year (FY ${fy.startYear - 1}-${String(fy.startYear).slice(-2)})`;
    })(),
    getFromTo: () => {
      const fy = getIndianFinancialYear();
      return {
        from: `${fy.startYear - 1}-04-01`,
        to: `${fy.startYear}-03-31`,
      };
    },
  },
  {
    value: "custom",
    label: "Custom Date Range",
    getFromTo: () => ({
      from: "",
      to: "",
    }),
  },
];

export const getDatesForPeriod = (periodKey: string): { from: string; to: string } => {
  const match = PERIOD_PRESETS.find((p) => p.value === periodKey);
  if (match) return match.getFromTo();
  return { from: "", to: "" };
};
