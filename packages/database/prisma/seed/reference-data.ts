/*
  Departments, the job titles each one posts, and the investor pool.
  Weights decide how the ~1,500 jobs are split; Engineering takes about 40%
  the way it does at a real startup.
*/

export type DepartmentSeed = {
  name: string;
  slug: string;
  weight: number;
  titles: readonly string[];
};

export const DEPARTMENTS: readonly DepartmentSeed[] = [
  {
    name: "Engineering",
    slug: "engineering",
    weight: 40,
    titles: [
      "Backend Engineer",
      "Frontend Engineer",
      "Full Stack Engineer",
      "Android Engineer",
      "iOS Engineer",
      "Platform Engineer",
      "Mobile Engineer",
      "Software Engineer",
      "Engineering Manager",
      "Security Engineer",
    ],
  },
  {
    name: "Product",
    slug: "product",
    weight: 6,
    titles: [
      "Product Manager",
      "Technical Product Manager",
      "Group Product Manager",
      "Product Analyst",
      "Growth Product Manager",
    ],
  },
  {
    name: "Design",
    slug: "design",
    weight: 5,
    titles: [
      "Product Designer",
      "UX Designer",
      "UX Researcher",
      "Visual Designer",
      "Design Systems Designer",
      "Brand Designer",
    ],
  },
  {
    name: "Data",
    slug: "data",
    weight: 5,
    titles: [
      "Data Engineer",
      "Data Analyst",
      "Analytics Engineer",
      "Business Intelligence Analyst",
      "Data Scientist",
    ],
  },
  {
    name: "AI/ML",
    slug: "ai-ml",
    weight: 5,
    titles: [
      "Machine Learning Engineer",
      "Applied Scientist",
      "Research Engineer",
      "MLOps Engineer",
      "NLP Engineer",
      "Computer Vision Engineer",
    ],
  },
  {
    name: "Sales",
    slug: "sales",
    weight: 7,
    titles: [
      "Account Executive",
      "Sales Development Representative",
      "Enterprise Sales Manager",
      "Inside Sales Executive",
      "Sales Operations Analyst",
      "Partnerships Manager",
    ],
  },
  {
    name: "Marketing",
    slug: "marketing",
    weight: 5,
    titles: [
      "Performance Marketing Manager",
      "Content Marketer",
      "Brand Marketing Manager",
      "SEO Specialist",
      "Lifecycle Marketing Manager",
      "Social Media Manager",
    ],
  },
  {
    name: "Customer Success",
    slug: "customer-success",
    weight: 4,
    titles: [
      "Customer Success Manager",
      "Onboarding Specialist",
      "Account Manager",
      "Customer Success Operations Analyst",
    ],
  },
  {
    name: "Operations",
    slug: "operations",
    weight: 5,
    titles: [
      "Operations Manager",
      "City Operations Lead",
      "Supply Chain Analyst",
      "Business Operations Manager",
      "Category Manager",
    ],
  },
  {
    name: "Finance",
    slug: "finance",
    weight: 3,
    titles: [
      "Financial Analyst",
      "Accounts Manager",
      "Controller",
      "FP&A Manager",
      "Treasury Analyst",
    ],
  },
  {
    name: "People",
    slug: "people",
    weight: 3,
    titles: [
      "Technical Recruiter",
      "HR Business Partner",
      "People Operations Manager",
      "Talent Acquisition Specialist",
      "Learning and Development Manager",
    ],
  },
  {
    name: "Legal",
    slug: "legal",
    weight: 1,
    titles: ["Legal Counsel", "Compliance Manager", "Contracts Manager"],
  },
  {
    name: "Support",
    slug: "support",
    weight: 4,
    titles: [
      "Customer Support Executive",
      "Technical Support Engineer",
      "Support Operations Analyst",
      "Escalations Specialist",
    ],
  },
  {
    name: "QA",
    slug: "qa",
    weight: 4,
    titles: [
      "QA Engineer",
      "Automation Test Engineer",
      "SDET",
      "Performance Test Engineer",
      "QA Analyst",
    ],
  },
  {
    name: "DevOps",
    slug: "devops",
    weight: 3,
    titles: [
      "DevOps Engineer",
      "Site Reliability Engineer",
      "Infrastructure Engineer",
      "Cloud Engineer",
      "Build and Release Engineer",
    ],
  },
];

export const INVESTORS: readonly string[] = [
  "Peak XV Partners",
  "Accel",
  "Y Combinator",
  "Tiger Global",
  "Blume Ventures",
  "Elevation Capital",
  "Lightspeed India",
  "Z47",
  "Nexus Venture Partners",
  "3one4 Capital",
  "SoftBank Vision Fund",
  "Prosus Ventures",
  "General Catalyst",
  "Kalaari Capital",
  "Chiratae Ventures",
  "Bessemer Venture Partners",
  "Steadview Capital",
  "Sofina",
  "Alpha Wave Global",
  "Ribbit Capital",
  "Insight Partners",
  "Coatue",
  "DST Global",
  "Temasek",
  "GIC",
  "Qatar Investment Authority",
  "Norwest Venture Partners",
  "Jungle Ventures",
  "Info Edge Ventures",
  "Trifecta Capital",
  "Stellaris Venture Partners",
  "Together Fund",
  "Antler India",
  "Better Capital",
  "India Quotient",
  "Fireside Ventures",
  "Avataar Ventures",
  "WestBridge Capital",
  "A91 Partners",
  "Iron Pillar",
];

export const INDUSTRIES: readonly string[] = [
  "Fintech",
  "SaaS",
  "E-commerce",
  "Logistics",
  "Healthtech",
  "Edtech",
  "Consumer",
  "Marketplace",
  "Developer Tools",
  "AI",
  "Mobility",
  "D2C",
  "Enterprise Software",
  "Gaming",
  "Agritech",
  "Insurtech",
  "Cybersecurity",
  "Climate",
];

/* Name parts for the fictional fill companies and their founders. */
export const FILL_NAME_PREFIXES: readonly string[] = [
  "Setu",
  "Vega",
  "Nimbus",
  "Arka",
  "Tarang",
  "Kavach",
  "Prayog",
  "Bindu",
  "Chakra",
  "Dhara",
  "Ekaant",
  "Gati",
  "Hansa",
  "Indra",
  "Jyoti",
  "Kalpa",
  "Lakshya",
  "Mudra",
  "Neel",
  "Ojas",
  "Pravah",
  "Rekha",
  "Saral",
  "Tattva",
  "Udaan",
  "Varsha",
  "Yukti",
  "Zaraa",
  "Anant",
  "Bhoomi",
];

export const FILL_NAME_SUFFIXES: readonly string[] = [
  "Labs",
  "Systems",
  "Works",
  "Technologies",
  "Cloud",
  "Analytics",
  "Networks",
  "Health",
  "Money",
  "Logistics",
  "Commerce",
  "AI",
  "Studio",
  "Stack",
  "Grid",
  "Mobility",
];

export const FOUNDER_FIRST_NAMES: readonly string[] = [
  "Aarav",
  "Ananya",
  "Rohan",
  "Ishita",
  "Karthik",
  "Meera",
  "Siddharth",
  "Divya",
  "Arjun",
  "Nandini",
  "Vikram",
  "Priya",
  "Rahul",
  "Sneha",
  "Aditya",
  "Kavya",
  "Nikhil",
  "Tanvi",
  "Varun",
  "Ritika",
  "Manav",
  "Shruti",
  "Aniket",
  "Pooja",
  "Harsh",
  "Aditi",
  "Rajat",
  "Neha",
  "Gautam",
  "Swara",
];

export const FOUNDER_LAST_NAMES: readonly string[] = [
  "Sharma",
  "Iyer",
  "Reddy",
  "Nair",
  "Gupta",
  "Menon",
  "Rao",
  "Kulkarni",
  "Bhatt",
  "Chatterjee",
  "Desai",
  "Joshi",
  "Malhotra",
  "Pillai",
  "Sinha",
  "Verma",
  "Shetty",
  "Banerjee",
  "Kapoor",
  "Deshpande",
];

export const FOUNDER_TITLES: readonly string[] = [
  "Co-founder & CEO",
  "Co-founder & CTO",
  "Co-founder & COO",
  "Co-founder",
  "Co-founder & CPO",
];

export const SENIORITIES = ["Entry", "Mid", "Senior", "Lead"] as const;
export type Seniority = (typeof SENIORITIES)[number];

/*
  Title prefixes per seniority. Mid-level roles carry no prefix, which is how
  job boards actually read.
*/
export const SENIORITY_PREFIXES: Record<Seniority, readonly string[]> = {
  Entry: ["Associate ", "Junior "],
  Mid: [""],
  Senior: ["Senior "],
  Lead: ["Lead ", "Staff ", "Principal "],
};

/* Annual INR bands before the funding-stage multiplier is applied. */
export const SALARY_BANDS: Record<Seniority, { min: number; max: number }> = {
  Entry: { min: 800_000, max: 1_500_000 },
  Mid: { min: 1_500_000, max: 3_000_000 },
  Senior: { min: 3_000_000, max: 6_000_000 },
  Lead: { min: 6_000_000, max: 9_000_000 },
};
