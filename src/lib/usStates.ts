/** All 50 US states + DC with their abbreviation and OpenStates jurisdiction slug */
export interface USState {
  name: string;
  abbr: string;
  /** OpenStates jurisdiction string */
  jurisdiction: string;
}

export const US_STATES: USState[] = [
  { name: "Alabama", abbr: "AL", jurisdiction: "Alabama" },
  { name: "Alaska", abbr: "AK", jurisdiction: "Alaska" },
  { name: "Arizona", abbr: "AZ", jurisdiction: "Arizona" },
  { name: "Arkansas", abbr: "AR", jurisdiction: "Arkansas" },
  { name: "California", abbr: "CA", jurisdiction: "California" },
  { name: "Colorado", abbr: "CO", jurisdiction: "Colorado" },
  { name: "Connecticut", abbr: "CT", jurisdiction: "Connecticut" },
  { name: "Delaware", abbr: "DE", jurisdiction: "Delaware" },
  { name: "Florida", abbr: "FL", jurisdiction: "Florida" },
  { name: "Georgia", abbr: "GA", jurisdiction: "Georgia" },
  { name: "Hawaii", abbr: "HI", jurisdiction: "Hawaii" },
  { name: "Idaho", abbr: "ID", jurisdiction: "Idaho" },
  { name: "Illinois", abbr: "IL", jurisdiction: "Illinois" },
  { name: "Indiana", abbr: "IN", jurisdiction: "Indiana" },
  { name: "Iowa", abbr: "IA", jurisdiction: "Iowa" },
  { name: "Kansas", abbr: "KS", jurisdiction: "Kansas" },
  { name: "Kentucky", abbr: "KY", jurisdiction: "Kentucky" },
  { name: "Louisiana", abbr: "LA", jurisdiction: "Louisiana" },
  { name: "Maine", abbr: "ME", jurisdiction: "Maine" },
  { name: "Maryland", abbr: "MD", jurisdiction: "Maryland" },
  { name: "Massachusetts", abbr: "MA", jurisdiction: "Massachusetts" },
  { name: "Michigan", abbr: "MI", jurisdiction: "Michigan" },
  { name: "Minnesota", abbr: "MN", jurisdiction: "Minnesota" },
  { name: "Mississippi", abbr: "MS", jurisdiction: "Mississippi" },
  { name: "Missouri", abbr: "MO", jurisdiction: "Missouri" },
  { name: "Montana", abbr: "MT", jurisdiction: "Montana" },
  { name: "Nebraska", abbr: "NE", jurisdiction: "Nebraska" },
  { name: "Nevada", abbr: "NV", jurisdiction: "Nevada" },
  { name: "New Hampshire", abbr: "NH", jurisdiction: "New Hampshire" },
  { name: "New Jersey", abbr: "NJ", jurisdiction: "New Jersey" },
  { name: "New Mexico", abbr: "NM", jurisdiction: "New Mexico" },
  { name: "New York", abbr: "NY", jurisdiction: "New York" },
  { name: "North Carolina", abbr: "NC", jurisdiction: "North Carolina" },
  { name: "North Dakota", abbr: "ND", jurisdiction: "North Dakota" },
  { name: "Ohio", abbr: "OH", jurisdiction: "Ohio" },
  { name: "Oklahoma", abbr: "OK", jurisdiction: "Oklahoma" },
  { name: "Oregon", abbr: "OR", jurisdiction: "Oregon" },
  { name: "Pennsylvania", abbr: "PA", jurisdiction: "Pennsylvania" },
  { name: "Puerto Rico", abbr: "PR", jurisdiction: "Puerto Rico" },
  { name: "Rhode Island", abbr: "RI", jurisdiction: "Rhode Island" },
  { name: "South Carolina", abbr: "SC", jurisdiction: "South Carolina" },
  { name: "South Dakota", abbr: "SD", jurisdiction: "South Dakota" },
  { name: "Tennessee", abbr: "TN", jurisdiction: "Tennessee" },
  { name: "Texas", abbr: "TX", jurisdiction: "Texas" },
  { name: "Utah", abbr: "UT", jurisdiction: "Utah" },
  { name: "Vermont", abbr: "VT", jurisdiction: "Vermont" },
  { name: "Virginia", abbr: "VA", jurisdiction: "Virginia" },
  { name: "Washington", abbr: "WA", jurisdiction: "Washington" },
  { name: "West Virginia", abbr: "WV", jurisdiction: "West Virginia" },
  { name: "Wisconsin", abbr: "WI", jurisdiction: "Wisconsin" },
  { name: "Wyoming", abbr: "WY", jurisdiction: "Wyoming" },
  { name: "District of Columbia", abbr: "DC", jurisdiction: "District of Columbia" },
];

/** Convert state abbreviation to OpenStates jurisdiction name */
export function abbrToJurisdiction(abbr: string): string {
  return US_STATES.find((s) => s.abbr === abbr.toUpperCase())?.jurisdiction || "Nevada";
}

/** Convert abbreviation to OCD jurisdiction slug for OpenStates v3 */
export function abbrToOcdJurisdiction(abbr: string): string {
  const lower = abbr.toLowerCase();
  if (lower === "dc") return "ocd-jurisdiction/country:us/district:dc/government";
  if (lower === "pr") return "ocd-jurisdiction/country:us/territory:pr/government";
  return `ocd-jurisdiction/country:us/state:${lower}/government`;
}
