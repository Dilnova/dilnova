export interface TaxClassOption {
  id: string;
  name: string;
  code: string;
  ratePercent: number;
  orgId?: string | null;
}

export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "LKR", label: "LKR - Sri Lankan Rupee" },
  { code: "USD", label: "USD - United States Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
  { code: "AUD", label: "AUD - Australian Dollar" },
  { code: "CAD", label: "CAD - Canadian Dollar" },
  { code: "SGD", label: "SGD - Singapore Dollar" },
  { code: "INR", label: "INR - Indian Rupee" },
  { code: "AED", label: "AED - UAE Dirham" },
];
