/**
 * Shared location types for API routes and customer forms.
 */
export interface ParsedCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

export interface ParsedState {
  name: string;
  code?: string;
}
