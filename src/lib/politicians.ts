// Shared Politician type — used across many components.
// The hardcoded Nevada politician data has been removed in favor of live API data.

export interface Politician {
  id: string;
  name: string;
  title: string;
  party: "Democrat" | "Republican" | "Independent" | "Nonpartisan";
  office: string;
  region: string;
  level: "federal" | "state" | "county" | "local";
  imageUrl?: string;
  bio: string;
  keyIssues: string[];
  website?: string;
  socialHandles?: {
    x?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    threads?: string;
  };
  phone?: string;
  email?: string;
  contactForm?: string;
}
