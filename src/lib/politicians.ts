export interface Politician {
  id: string;
  name: string;
  title: string;
  party: "Democrat" | "Republican" | "Independent";
  office: string;
  region: string;
  imageUrl?: string;
  bio: string;
  keyIssues: string[];
  socialHandles?: {
    x?: string;
  };
}

export const nevadaPoliticians: Politician[] = [
  {
    id: "lombardo",
    name: "Joe Lombardo",
    title: "Governor",
    party: "Republican",
    office: "Governor of Nevada",
    region: "State of Nevada",
    bio: "Joe Lombardo is the 31st Governor of Nevada, having taken office in January 2023. A former Clark County Sheriff, he focuses on public safety, economic growth, and education reform.",
    keyIssues: ["Public Safety", "Economic Development", "Education", "Water Conservation"],
    socialHandles: { x: "JoeLombardoNV" },
  },
  {
    id: "cortez-masto",
    name: "Catherine Cortez Masto",
    title: "U.S. Senator",
    party: "Democrat",
    office: "U.S. Senate",
    region: "State of Nevada",
    bio: "Catherine Cortez Masto is the senior U.S. Senator from Nevada, first elected in 2016. She is the first Latina elected to the U.S. Senate and focuses on immigration, healthcare, and clean energy.",
    keyIssues: ["Immigration Reform", "Healthcare", "Clean Energy", "Public Lands"],
    socialHandles: { x: "SenCortezMasto" },
  },
  {
    id: "rosen",
    name: "Jacky Rosen",
    title: "U.S. Senator",
    party: "Democrat",
    office: "U.S. Senate",
    region: "State of Nevada",
    bio: "Jacky Rosen is the junior U.S. Senator from Nevada, elected in 2018. A former computer programmer, she champions technology, veterans' issues, and workforce development.",
    keyIssues: ["Technology", "Veterans Affairs", "Workforce Development", "Small Business"],
    socialHandles: { x: "SenJackyRosen" },
  },
  {
    id: "berkley",
    name: "Shelley Berkley",
    title: "Mayor",
    party: "Democrat",
    office: "Mayor of Las Vegas",
    region: "Las Vegas",
    bio: "Shelley Berkley serves as Mayor of Las Vegas. A former U.S. Representative, she focuses on downtown revitalization, tourism economy, and housing affordability.",
    keyIssues: ["Downtown Development", "Tourism Economy", "Housing", "Infrastructure"],
    socialHandles: { x: "MayorBerkley" },
  },
  {
    id: "horsford",
    name: "Steven Horsford",
    title: "U.S. Representative",
    party: "Democrat",
    office: "U.S. House (NV-4)",
    region: "North Las Vegas / Rural Nevada",
    bio: "Steven Horsford represents Nevada's 4th Congressional District. He focuses on economic equity, labor rights, and community investment in underserved areas.",
    keyIssues: ["Labor Rights", "Economic Equity", "Community Investment", "Healthcare Access"],
    socialHandles: { x: "RepHorsford" },
  },
  {
    id: "lee",
    name: "Susie Lee",
    title: "U.S. Representative",
    party: "Democrat",
    office: "U.S. House (NV-3)",
    region: "Southern Nevada / Henderson",
    bio: "Susie Lee represents Nevada's 3rd Congressional District covering suburban Las Vegas and Henderson. She focuses on education, healthcare, and environmental protection.",
    keyIssues: ["Education", "Healthcare", "Environment", "Gun Safety"],
    socialHandles: { x: "RepSusieLee" },
  },
  {
    id: "amodei",
    name: "Mark Amodei",
    title: "U.S. Representative",
    party: "Republican",
    office: "U.S. House (NV-2)",
    region: "Northern Nevada / Reno",
    bio: "Mark Amodei represents Nevada's 2nd Congressional District covering Reno and rural northern Nevada. He focuses on public lands, mining, and fiscal responsibility.",
    keyIssues: ["Public Lands", "Mining", "Fiscal Responsibility", "Water Rights"],
    socialHandles: { x: "MarkAmodeiNV2" },
  },
  {
    id: "conine",
    name: "Zach Conine",
    title: "State Treasurer",
    party: "Democrat",
    office: "Nevada State Treasurer",
    region: "State of Nevada",
    bio: "Zach Conine serves as Nevada's State Treasurer, managing state investments and financial programs. He has been outspoken on federal fiscal policy and its impact on Nevada.",
    keyIssues: ["State Finance", "College Savings", "Fiscal Transparency", "Federal Policy"],
    socialHandles: { x: "ZachConine" },
  },
];
