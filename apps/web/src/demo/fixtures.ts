import type { ApplicationDto, CompanyDetail, FacetsResponse, JobSummary } from "@chowk/schema";

/*
  Data for the landing page embeds. It is typed against the real DTOs, so if a
  contract changes this file stops compiling — which is the point. The widgets
  on the landing page are the actual components, not screenshots of them.
*/

export const DEMO_FACETS: FacetsResponse = {
  hiringStatus: [
    { value: "ACTIVELY_HIRING", label: "Actively hiring", count: 79 },
    { value: "NOT_HIRING", label: "Not hiring", count: 11 },
  ],
  department: [
    { value: "engineering", label: "Engineering", count: 577 },
    { value: "sales", label: "Sales", count: 100 },
    { value: "operations", label: "Operations", count: 87 },
    { value: "marketing", label: "Marketing", count: 81 },
    { value: "data", label: "Data", count: 74 },
    { value: "product", label: "Product", count: 69 },
    { value: "design", label: "Design", count: 53 },
    { value: "ai-ml", label: "AI/ML", count: 57 },
  ],
  workMode: [
    { value: "ONSITE", label: "On-site", count: 837 },
    { value: "HYBRID", label: "Hybrid", count: 371 },
    { value: "REMOTE", label: "Remote", count: 210 },
  ],
  city: [
    { value: "Bengaluru", label: "Bengaluru", count: 42 },
    { value: "Mumbai", label: "Mumbai", count: 14 },
    { value: "Gurugram", label: "Gurugram", count: 12 },
    { value: "Hyderabad", label: "Hyderabad", count: 9 },
    { value: "Pune", label: "Pune", count: 6 },
    { value: "Chennai", label: "Chennai", count: 6 },
  ],
  country: [
    { value: "India", label: "India", count: 103 },
    { value: "United States", label: "United States", count: 4 },
    { value: "Singapore", label: "Singapore", count: 3 },
  ],
  fundingStage: [
    { value: "SERIES_D_PLUS", label: "Series D+", count: 22 },
    { value: "SERIES_A", label: "Series A", count: 13 },
    { value: "SERIES_C", label: "Series C", count: 12 },
    { value: "SEED", label: "Seed", count: 11 },
    { value: "BOOTSTRAPPED", label: "Bootstrapped", count: 9 },
  ],
  investors: [
    { value: "inv_0005", label: "Blume Ventures", count: 11 },
    { value: "inv_0002", label: "Accel", count: 9 },
    { value: "inv_0001", label: "Peak XV Partners", count: 8 },
    { value: "inv_0004", label: "Tiger Global", count: 7 },
  ],
};

function job(
  id: string,
  title: string,
  departmentName: string,
  city: string | null,
  workMode: JobSummary["workMode"],
  salary: [number, number],
): JobSummary {
  return {
    id,
    title,
    companyId: "demo-co",
    companySlug: "razorpay",
    companyName: "Razorpay",
    companyLogoUrl: null,
    departmentName,
    departmentSlug: departmentName.toLowerCase(),
    city,
    country: city ? "India" : null,
    workMode,
    seniority: "SENIOR",
    skills: ["TypeScript", "Node.js", "Postgres", "AWS"],
    salaryMin: salary[0],
    salaryMax: salary[1],
    currency: "INR",
    status: "OPEN",
    hasExternalApply: true,
    postedAt: "2026-07-28T09:00:00.000Z",
  };
}

export const DEMO_JOBS: JobSummary[] = [
  job(
    "demo-1",
    "Senior Backend Engineer",
    "Engineering",
    "Bengaluru",
    "HYBRID",
    [4_200_000, 7_000_000],
  ),
  job("demo-2", "Product Designer", "Design", "Bengaluru", "ONSITE", [2_800_000, 4_500_000]),
  job("demo-3", "Staff Data Engineer", "Data", null, "REMOTE", [5_000_000, 8_200_000]),
];

export const DEMO_COMPANY: CompanyDetail = {
  id: "demo-co",
  slug: "razorpay",
  name: "Razorpay",
  logoUrl: null,
  tagline: "Payments and banking for Indian businesses",
  description:
    "Razorpay builds the payments stack most Indian internet businesses run on — a payment gateway, a neobanking suite for payroll and vendor payouts, and lending products for merchants.",
  website: "https://razorpay.com",
  linkedinUrl: "https://www.linkedin.com/company/razorpay",
  twitterUrl: "https://x.com/Razorpay",
  industries: ["Fintech", "SaaS", "Enterprise Software"],
  businessModel: ["B2B", "SaaS"],
  isVerified: true,
  foundedYear: 2014,
  employeeCount: 3000,
  hiringStatus: "ACTIVELY_HIRING",
  fundingStage: "SERIES_D_PLUS",
  totalFundingUsd: 741_000_000,
  valuationUsd: 7_500_000_000,
  offices: [
    {
      id: "demo-office-1",
      city: "Bengaluru",
      country: "India",
      addressLine: "Koramangala, Bengaluru",
      lat: 12.9352,
      lng: 77.6245,
      isHq: true,
      openJobCount: 16,
    },
  ],
  founders: [
    {
      id: "demo-f1",
      name: "Harshil Mathur",
      title: "Co-founder & CEO",
      bio: "Built the first version of the payment gateway himself after a Y Combinator batch, and has run the company as CEO since 2014.",
      linkedinUrl: "https://www.linkedin.com/in/harshil-mathur",
      twitterUrl: "https://x.com/harshilmathur",
      githubUrl: null,
      photoUrl: null,
    },
    {
      id: "demo-f2",
      name: "Shashank Kumar",
      title: "Co-founder & Managing Director",
      bio: "Leads the neobanking side of the business, which grew out of the payroll and vendor payout tools merchants kept asking for.",
      linkedinUrl: null,
      twitterUrl: null,
      githubUrl: null,
      photoUrl: null,
    },
  ],
  investors: [
    { id: "inv_0003", name: "Y Combinator", logoUrl: null, website: null, round: "SERIES_D_PLUS" },
    { id: "inv_0023", name: "DST Global", logoUrl: null, website: null, round: "SERIES_D_PLUS" },
    {
      id: "inv_0013",
      name: "General Catalyst",
      logoUrl: null,
      website: null,
      round: "SERIES_D_PLUS",
    },
  ],
  jobs: DEMO_JOBS,
};

function application(
  id: string,
  status: ApplicationDto["status"],
  jobSummary: JobSummary,
  appliedAt: string | null,
): ApplicationDto {
  return {
    id,
    jobId: jobSummary.id,
    status,
    applyMethod: appliedAt ? "SIMPLE_APPLY" : null,
    resumeId: null,
    coverNote: null,
    appliedAt,
    createdAt: "2026-07-20T09:00:00.000Z",
    updatedAt: "2026-07-30T09:00:00.000Z",
    job: jobSummary,
  };
}

export const DEMO_APPLICATIONS: ApplicationDto[] = [
  application("demo-a1", "SAVED", DEMO_JOBS[1], null),
  application("demo-a2", "APPLIED", DEMO_JOBS[0], "2026-07-24T09:00:00.000Z"),
  application(
    "demo-a3",
    "INTERVIEWING",
    { ...DEMO_JOBS[2], companyName: "Postman", title: "Senior Platform Engineer" },
    "2026-07-18T09:00:00.000Z",
  ),
];

/* Names, roles, and quotes are invented. Nothing here is a real person. */
export const DEMO_TESTIMONIALS = [
  {
    name: "Ananya R.",
    role: "Backend engineer, Bengaluru",
    quote:
      "Found three companies within walking distance of my flat. I had never heard of two of them.",
    reaction: "❤️",
    read: "Read 7:06 AM",
  },
  {
    name: "Karthik M.",
    role: "Product designer",
    quote: "The funding and founder info in one place saved me an evening of tab archaeology.",
    reaction: "👏",
  },
  {
    name: "Priya S.",
    role: "Data analyst, Pune",
    quote:
      "Filtered to remote data roles and the map went quiet in the best way. Six real options.",
  },
  {
    name: "Rohan D.",
    role: "New grad",
    quote: "The tracker is the only reason I know which four places still owe me a reply.",
    reaction: "😂",
  },
  {
    name: "Meera N.",
    role: "Engineering manager",
    quote: "I use it to see who is hiring near our office. Competitive intel by accident.",
  },
  {
    name: "Aditya V.",
    role: "Frontend engineer, Hyderabad",
    quote: "Applied to two roles in a lunch break. No account walls, no resume re-typing.",
    reaction: "🔥",
    read: "Read 1:42 PM",
  },
];
