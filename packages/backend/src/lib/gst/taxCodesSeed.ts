import type { TaxabilityType, ItcEligibility } from "./constants";

export interface TaxCodeDefinition {
  code: string;
  name: string;
  rate: number;
  taxability: TaxabilityType;
  isInterstateOnly?: boolean;
  isRcm?: boolean;
  itcEligibility: ItcEligibility;
  description: string;
  effectiveFrom: string;
  isSystem: boolean;
  components: Array<{
    name: string;
    rate: number;
    type: "CGST" | "SGST" | "IGST" | "CESS";
  }>;
}

export const SEEDED_TAX_CODES: TaxCodeDefinition[] = [
  {
    code: "GST_3",
    name: "GST 3% (Jewellery, Gold, Silver)",
    rate: 3.0,
    taxability: "TAXABLE",
    itcEligibility: "ELIGIBLE",
    description: "Standard rate for precious metals and jewellery articles (HSN 7113, 7108, 7106)",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 1.5, type: "CGST" },
      { name: "SGST", rate: 1.5, type: "SGST" },
      { name: "IGST", rate: 3.0, type: "IGST" },
    ],
  },
  {
    code: "GST_0.25",
    name: "GST 0.25% (Rough/Cut Diamonds & Gems)",
    rate: 0.25,
    taxability: "TAXABLE",
    itcEligibility: "ELIGIBLE",
    description: "Special rate for cut and polished diamonds, precious and semi-precious stones",
    effectiveFrom: "2018-01-25",
    isSystem: true,
    components: [
      { name: "CGST", rate: 0.125, type: "CGST" },
      { name: "SGST", rate: 0.125, type: "SGST" },
      { name: "IGST", rate: 0.25, type: "IGST" },
    ],
  },
  {
    code: "GST_5",
    name: "GST 5% (Job Work / Making Charges / Transport)",
    rate: 5.0,
    taxability: "TAXABLE",
    itcEligibility: "ELIGIBLE",
    description: "Job work on jewellery (HSN 9988), goods transport, essential supplies",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 2.5, type: "CGST" },
      { name: "SGST", rate: 2.5, type: "SGST" },
      { name: "IGST", rate: 5.0, type: "IGST" },
    ],
  },
  {
    code: "GST_12",
    name: "GST 12% (Articles & Machinery)",
    rate: 12.0,
    taxability: "TAXABLE",
    itcEligibility: "ELIGIBLE",
    description: "Precious metal imitation jewellery, machinery and certain specialized articles",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 6.0, type: "CGST" },
      { name: "SGST", rate: 6.0, type: "SGST" },
      { name: "IGST", rate: 12.0, type: "IGST" },
    ],
  },
  {
    code: "GST_18",
    name: "GST 18% (Standard Services & Corporate)",
    rate: 18.0,
    taxability: "TAXABLE",
    itcEligibility: "ELIGIBLE",
    description: "General professional services, banking fees, security services, IT, consulting",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 9.0, type: "CGST" },
      { name: "SGST", rate: 9.0, type: "SGST" },
      { name: "IGST", rate: 18.0, type: "IGST" },
    ],
  },
  {
    code: "GST_28",
    name: "GST 28% (Luxury & High Tax Articles)",
    rate: 28.0,
    taxability: "TAXABLE",
    itcEligibility: "ELIGIBLE",
    description: "Luxury consumer goods, motor vehicles, specified high-tax articles",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 14.0, type: "CGST" },
      { name: "SGST", rate: 14.0, type: "SGST" },
      { name: "IGST", rate: 28.0, type: "IGST" },
    ],
  },
  {
    code: "GST_0",
    name: "GST 0% (Nil-Rated Supplies)",
    rate: 0.0,
    taxability: "NIL_RATED",
    itcEligibility: "INELIGIBLE",
    description: "Supplies taxable at nil rate under notification",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [],
  },
  {
    code: "GST_EXEMPT",
    name: "Exempt Supply (Section 11 CGST)",
    rate: 0.0,
    taxability: "EXEMPT",
    itcEligibility: "INELIGIBLE",
    description: "Wholly exempt supplies without ITC claim",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [],
  },
  {
    code: "GST_NON_GST",
    name: "Non-GST Supply (Alcohol, Petroleum)",
    rate: 0.0,
    taxability: "NON_GST",
    itcEligibility: "INELIGIBLE",
    description: "Supplies outside the scope of GST law",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [],
  },
  {
    code: "GST_RCM_18",
    name: "GST 18% Reverse Charge (RCM)",
    rate: 18.0,
    taxability: "TAXABLE",
    isRcm: true,
    itcEligibility: "ELIGIBLE",
    description: "Legal services, sponsorship, security services under reverse charge Sec 9(3)",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 9.0, type: "CGST" },
      { name: "SGST", rate: 9.0, type: "SGST" },
      { name: "IGST", rate: 18.0, type: "IGST" },
    ],
  },
  {
    code: "GST_RCM_5",
    name: "GST 5% Reverse Charge (GTA)",
    rate: 5.0,
    taxability: "TAXABLE",
    isRcm: true,
    itcEligibility: "ELIGIBLE",
    description: "Goods Transport Agency (GTA) freight under reverse charge Sec 9(3)",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 2.5, type: "CGST" },
      { name: "SGST", rate: 2.5, type: "SGST" },
      { name: "IGST", rate: 5.0, type: "IGST" },
    ],
  },
  {
    code: "GST_BLOCKED_17_5",
    name: "GST Ineligible / Blocked ITC u/s 17(5)",
    rate: 18.0,
    taxability: "TAXABLE",
    itcEligibility: "BLOCKED_17_5",
    description: "Food, beverages, motor vehicles, club memberships where ITC is legally blocked",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "CGST", rate: 9.0, type: "CGST" },
      { name: "SGST", rate: 9.0, type: "SGST" },
      { name: "IGST", rate: 18.0, type: "IGST" },
    ],
  },
  {
    code: "EXPORT_LUT",
    name: "Export / SEZ Supply under LUT (0%)",
    rate: 0.0,
    taxability: "ZERO_RATED",
    itcEligibility: "ELIGIBLE",
    description: "Zero-rated supply exported or sent to SEZ unit under Letter of Undertaking (LUT)",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [],
  },
  {
    code: "EXPORT_IGST",
    name: "Export with Payment of IGST",
    rate: 3.0,
    taxability: "ZERO_RATED",
    itcEligibility: "ELIGIBLE",
    description: "Zero-rated export made with payment of integrated tax for refund claim",
    effectiveFrom: "2017-07-01",
    isSystem: true,
    components: [
      { name: "IGST", rate: 3.0, type: "IGST" },
    ],
  },
];
