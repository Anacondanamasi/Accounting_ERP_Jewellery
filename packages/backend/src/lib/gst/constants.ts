export const STATE_CODES: Record<string, string> = {
  "jammu & kashmir": "01",
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "daman & diu": "26",
  "dadra & nagar haveli and daman & diu": "26",
  "dadra and nagar haveli and daman and diu": "26",
  "maharashtra": "27",
  "andhra pradesh": "37",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman & nicobar islands": "35",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "ladakh": "38",
  "other territory": "97",
};

export const STATE_NAMES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

export type SupplyType = "INTRA_STATE" | "INTER_STATE" | "EXPORT" | "IMPORT" | "SEZ";

export type GstTreatment =
  | "REGULAR"
  | "COMPOSITION"
  | "UNREGISTERED"
  | "SEZ_WITH_PAY"
  | "SEZ_WITHOUT_PAY"
  | "OVERSEAS"
  | "DEEMED_EXPORT"
  | "CONSUMER";

export type ItcEligibility = "ELIGIBLE" | "INELIGIBLE" | "BLOCKED_17_5";

export type TaxabilityType = "TAXABLE" | "EXEMPT" | "NIL_RATED" | "NON_GST" | "ZERO_RATED";

export const GST_UQC_LIST = [
  { code: "GMS", name: "GRAMS" },
  { code: "KGS", name: "KILOGRAMS" },
  { code: "PCS", name: "PIECES" },
  { code: "NOS", name: "NUMBERS" },
  { code: "SET", name: "SETS" },
  { code: "BOX", name: "BOXES" },
  { code: "MTR", name: "METERS" },
  { code: "OTH", name: "OTHERS" },
] as const;
