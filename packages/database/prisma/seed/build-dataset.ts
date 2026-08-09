import type { FundingStage, Prisma } from "@prisma/client";
import { ANCHOR_COMPANIES } from "./anchor-companies";
import {
  FOREIGN_LOCALITIES,
  findLocality,
  localitiesInCity,
  OFFICE_JITTER_DEGREES,
} from "./localities";
import {
  DEPARTMENTS,
  FILL_NAME_PREFIXES,
  FILL_NAME_SUFFIXES,
  FOUNDER_FIRST_NAMES,
  FOUNDER_LAST_NAMES,
  FOUNDER_TITLES,
  INDUSTRIES,
  INVESTORS,
  SALARY_BANDS,
  SENIORITY_PREFIXES,
  type Seniority,
} from "./reference-data";
import type { Rng } from "./rng";

/*
  Builds every row in memory before anything touches the database. Keeping
  generation pure means the output depends only on the seeded RNG, not on how
  fast Postgres answered — so two runs really are identical.
*/

export type SeedDataset = {
  users: Prisma.UserCreateManyInput[];
  departments: Prisma.DepartmentCreateManyInput[];
  investors: Prisma.InvestorCreateManyInput[];
  companies: Prisma.CompanyCreateManyInput[];
  offices: Prisma.OfficeCreateManyInput[];
  founders: Prisma.FounderCreateManyInput[];
  companyFounders: Prisma.CompanyFounderCreateManyInput[];
  companyInvestors: Prisma.CompanyInvestorCreateManyInput[];
  jobs: Prisma.JobCreateManyInput[];
};

const FILL_COMPANY_COUNT = 50;

/*
  Explicit stage counts for the 50 fictional companies rather than random
  weights. Combined with the anchors' real stages this lands the whole set on
  the mix the PRD asks for, every single run.
*/
const FILL_STAGE_PLAN: readonly (readonly [FundingStage, number])[] = [
  ["BOOTSTRAPPED", 7],
  ["PRE_SEED", 5],
  ["SEED", 9],
  ["SERIES_A", 12],
  ["SERIES_B", 9],
  ["SERIES_C", 6],
  ["SERIES_D_PLUS", 2],
];

const FUNDING_BY_STAGE: Record<
  FundingStage,
  { funding: [number, number] | null; valuation: [number, number] | null }
> = {
  BOOTSTRAPPED: { funding: null, valuation: null },
  PRE_SEED: { funding: [200_000, 1_500_000], valuation: [3_000_000, 12_000_000] },
  SEED: { funding: [1_000_000, 6_000_000], valuation: [10_000_000, 40_000_000] },
  SERIES_A: { funding: [6_000_000, 20_000_000], valuation: [40_000_000, 120_000_000] },
  SERIES_B: { funding: [20_000_000, 60_000_000], valuation: [120_000_000, 400_000_000] },
  SERIES_C: { funding: [50_000_000, 150_000_000], valuation: [400_000_000, 1_200_000_000] },
  SERIES_D_PLUS: { funding: [150_000_000, 600_000_000], valuation: [1_000_000_000, 4_000_000_000] },
  PUBLIC: { funding: [300_000_000, 2_000_000_000], valuation: [2_000_000_000, 20_000_000_000] },
};

const JOB_COUNT_BY_STAGE: Record<FundingStage, [number, number]> = {
  BOOTSTRAPPED: [4, 10],
  PRE_SEED: [3, 6],
  SEED: [6, 12],
  SERIES_A: [10, 18],
  SERIES_B: [14, 26],
  SERIES_C: [18, 32],
  SERIES_D_PLUS: [22, 40],
  PUBLIC: [24, 42],
};

/* Better-funded companies pay more for the same seniority. */
const SALARY_MULTIPLIER_BY_STAGE: Record<FundingStage, number> = {
  BOOTSTRAPPED: 0.9,
  PRE_SEED: 0.7,
  SEED: 0.85,
  SERIES_A: 1.0,
  SERIES_B: 1.15,
  SERIES_C: 1.3,
  SERIES_D_PLUS: 1.5,
  PUBLIC: 1.6,
};

/* Roughly how a real startup's open roles break down. */
const SENIORITY_WEIGHTS: readonly (readonly [Seniority, number])[] = [
  ["Entry", 20],
  ["Mid", 40],
  ["Senior", 30],
  ["Lead", 10],
];

const WORK_MODE_WEIGHTS = [
  ["ONSITE", 60],
  ["HYBRID", 25],
  ["REMOTE", 15],
] as const;

const FILL_TAGLINES = [
  "Software that gets out of the way",
  "Infrastructure for the next decade of commerce",
  "Tools teams actually keep using",
  "Making a slow industry feel instant",
  "Built for operators, not spreadsheets",
  "The boring layer that makes everything else work",
  "One place for work that used to take five",
  "Data you can act on the same day",
];

const FILL_DESCRIPTION_TEMPLATES = [
  (name: string, industry: string) =>
    `${name} builds ${industry.toLowerCase()} software for Indian businesses, with a focus on teams that have outgrown spreadsheets but do not want a six-month rollout.`,
  (name: string, industry: string) =>
    `${name} is a ${industry.toLowerCase()} company working on the unglamorous parts of the stack — reconciliation, routing, and reporting — so its customers can ship faster.`,
  (name: string, industry: string) =>
    `${name} started as an internal tool and became a ${industry.toLowerCase()} product used by operations teams across the country.`,
  (name: string, industry: string) =>
    `${name} sells ${industry.toLowerCase()} tooling to mid-market companies, and is known for a product that a new user can set up without a call.`,
];

const JOB_DESCRIPTION_TEMPLATES = [
  (title: string, company: string, department: string) =>
    `${company} is hiring a ${title} to join the ${department} team.\n\nYou will own a meaningful slice of the product end to end, work closely with the people who use it, and help set the standard for how the team builds. We care more about how you think through a problem than the list of tools on your CV.\n\nWhat the first six months look like: ship something real in the first month, own a surface by the third, and have a say in where it goes by the sixth.`,
  (title: string, company: string, department: string) =>
    `We are looking for a ${title} to strengthen ${company}'s ${department} function.\n\nThis is a hands-on role. You will scope your own work, make trade-offs in the open, and see the impact of your decisions in production quickly. The team is small enough that ownership is real and large enough that you will not be alone.\n\nWe review every application ourselves and reply either way.`,
  (title: string, company: string, department: string) =>
    `${department} at ${company} is growing, and we need a ${title}.\n\nExpect a short interview loop, a written take on a real problem instead of a puzzle, and a decision within two weeks. Once you are in, you get context, autonomy, and people who will disagree with you carefully.\n\nRemote-friendly for the right person; most of the team sits together three days a week.`,
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pad(index: number, width = 4): string {
  return String(index).padStart(width, "0");
}

/*
  Deterministic shuffle (Fisher-Yates driven by the seeded RNG). Used to spread
  fixed plans — like the funding-stage counts — across companies without
  letting the counts drift.
*/
function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const a = out[i];
    const b = out[j];
    out[i] = b;
    out[j] = a;
  }
  return out;
}

function moneyInRange(rng: Rng, range: [number, number] | null): bigint | null {
  if (!range) return null;
  const [min, max] = range;
  // Round to something a human would read on a funding page.
  const raw = rng.int(min, max);
  const unit = raw > 100_000_000 ? 10_000_000 : raw > 10_000_000 ? 1_000_000 : 100_000;
  return BigInt(Math.round(raw / unit) * unit);
}

type CompanyPlan = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  industries: string[];
  foundedYear: number;
  employeeCount: number;
  fundingStage: FundingStage;
  totalFundingUsd: bigint | null;
  valuationUsd: bigint | null;
  hiringStatus: "ACTIVELY_HIRING" | "NOT_HIRING";
  offices: {
    city: string;
    country: string;
    area: string;
    lat: number;
    lng: number;
    isHq: boolean;
  }[];
  founders: { name: string; title: string }[];
};

function buildFillCompanyNames(rng: Rng, taken: Set<string>): { name: string; slug: string }[] {
  const combos: string[] = [];
  for (const prefix of FILL_NAME_PREFIXES) {
    for (const suffix of FILL_NAME_SUFFIXES) combos.push(`${prefix} ${suffix}`);
  }

  const picked: { name: string; slug: string }[] = [];
  for (const name of shuffle(rng, combos)) {
    if (picked.length === FILL_COMPANY_COUNT) break;
    const slug = slugify(name);
    if (taken.has(slug)) continue;
    taken.add(slug);
    picked.push({ name, slug });
  }

  if (picked.length < FILL_COMPANY_COUNT) {
    throw new Error(`Only generated ${picked.length} fill company names`);
  }
  return picked;
}

function jitterCoordinate(rng: Rng, lat: number, lng: number) {
  return {
    lat: Number((lat + rng.jitter(OFFICE_JITTER_DEGREES)).toFixed(6)),
    lng: Number((lng + rng.jitter(OFFICE_JITTER_DEGREES)).toFixed(6)),
  };
}

export function buildDataset(rng: Rng, now: number): SeedDataset {
  const plans: CompanyPlan[] = [];
  const takenSlugs = new Set<string>(ANCHOR_COMPANIES.map((c) => c.slug));

  // --- anchors: real companies, real coordinates -------------------------
  ANCHOR_COMPANIES.forEach((anchor, index) => {
    const hq = findLocality(anchor.hqCity, anchor.hqArea);
    const offices = [
      {
        city: hq.city,
        country: hq.country,
        area: hq.area,
        ...jitterCoordinate(rng, hq.lat, hq.lng),
        isHq: true,
      },
    ];
    for (const extra of anchor.extraOffices ?? []) {
      const locality = findLocality(extra.city, extra.area);
      offices.push({
        city: locality.city,
        country: locality.country,
        area: locality.area,
        ...jitterCoordinate(rng, locality.lat, locality.lng),
        isHq: false,
      });
    }

    plans.push({
      id: `co_${pad(index + 1)}`,
      slug: anchor.slug,
      name: anchor.name,
      tagline: anchor.tagline,
      description: anchor.description,
      website: anchor.website,
      industries: anchor.industries,
      foundedYear: anchor.foundedYear,
      employeeCount: anchor.employeeCount,
      fundingStage: anchor.fundingStage,
      totalFundingUsd: anchor.totalFundingUsd === null ? null : BigInt(anchor.totalFundingUsd),
      valuationUsd: anchor.valuationUsd === null ? null : BigInt(anchor.valuationUsd),
      hiringStatus: rng.chance(0.85) ? "ACTIVELY_HIRING" : "NOT_HIRING",
      offices,
      founders: anchor.founders,
    });
  });

  // --- fill: plausible fictional companies -------------------------------
  const fillNames = buildFillCompanyNames(rng, takenSlugs);
  const fillStages = shuffle(
    rng,
    FILL_STAGE_PLAN.flatMap(([stage, count]) => Array.from({ length: count }, () => stage)),
  );

  fillNames.forEach((entry, index) => {
    const stage = fillStages[index];
    const money = FUNDING_BY_STAGE[stage];
    const industries = rng.pickSome(INDUSTRIES, rng.int(1, 3));
    const primaryIndustry = industries[0];

    const hq = rng.pick(
      localitiesInCity(
        rng.pick([
          "Bengaluru",
          "Bengaluru",
          "Mumbai",
          "Gurugram",
          "Hyderabad",
          "Pune",
          "Chennai",
          "Noida",
          "New Delhi",
        ]),
      ),
    );
    const offices = [
      {
        city: hq.city,
        country: hq.country,
        area: hq.area,
        ...jitterCoordinate(rng, hq.lat, hq.lng),
        isHq: true,
      },
    ];
    // A few fill companies open a second Indian office so multi-city shows up.
    if (rng.chance(0.18)) {
      const second = rng.pick(
        localitiesInCity(
          rng.pick(["Bengaluru", "Mumbai", "Pune", "Hyderabad", "Chennai", "Gurugram"]),
        ),
      );
      if (second.city !== hq.city) {
        offices.push({
          city: second.city,
          country: second.country,
          area: second.area,
          ...jitterCoordinate(rng, second.lat, second.lng),
          isHq: false,
        });
      }
    }
    // One overseas sales office keeps the country facet interesting.
    if (rng.chance(0.06)) {
      const abroad = rng.pick(FOREIGN_LOCALITIES);
      offices.push({
        city: abroad.city,
        country: abroad.country,
        area: abroad.area,
        ...jitterCoordinate(rng, abroad.lat, abroad.lng),
        isHq: false,
      });
    }

    const founderCount = rng.int(2, 3);
    const founders = Array.from({ length: founderCount }, (_, i) => ({
      name: `${rng.pick(FOUNDER_FIRST_NAMES)} ${rng.pick(FOUNDER_LAST_NAMES)}`,
      title: i === 0 ? "Co-founder & CEO" : rng.pick(FOUNDER_TITLES),
    }));

    plans.push({
      id: `co_${pad(ANCHOR_COMPANIES.length + index + 1)}`,
      slug: entry.slug,
      name: entry.name,
      tagline: rng.pick(FILL_TAGLINES),
      description: rng.pick(FILL_DESCRIPTION_TEMPLATES)(entry.name, primaryIndustry),
      website: `https://www.${entry.slug}.in`,
      industries,
      foundedYear: rng.int(2015, 2024),
      employeeCount: rng.int(8, 900),
      fundingStage: stage,
      totalFundingUsd: moneyInRange(rng, money.funding),
      valuationUsd: moneyInRange(rng, money.valuation),
      hiringStatus: rng.chance(0.85) ? "ACTIVELY_HIRING" : "NOT_HIRING",
      offices,
      founders,
    });
  });

  // --- flatten the plans into rows ---------------------------------------
  const departments: Prisma.DepartmentCreateManyInput[] = DEPARTMENTS.map((d) => ({
    id: `dept_${d.slug}`,
    name: d.name,
    slug: d.slug,
  }));

  const investors: Prisma.InvestorCreateManyInput[] = INVESTORS.map((name, index) => ({
    id: `inv_${pad(index + 1)}`,
    name,
    website: `https://www.${slugify(name)}.com`,
    logoUrl: null,
  }));

  const companies: Prisma.CompanyCreateManyInput[] = [];
  const offices: Prisma.OfficeCreateManyInput[] = [];
  const founders: Prisma.FounderCreateManyInput[] = [];
  const companyFounders: Prisma.CompanyFounderCreateManyInput[] = [];
  const companyInvestors: Prisma.CompanyInvestorCreateManyInput[] = [];
  const jobs: Prisma.JobCreateManyInput[] = [];

  let officeSeq = 0;
  let founderSeq = 0;
  let jobSeq = 0;

  for (const plan of plans) {
    companies.push({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      logoUrl: null,
      tagline: plan.tagline,
      description: plan.description,
      website: plan.website,
      industries: plan.industries,
      foundedYear: plan.foundedYear,
      employeeCount: plan.employeeCount,
      hiringStatus: plan.hiringStatus,
      fundingStage: plan.fundingStage,
      totalFundingUsd: plan.totalFundingUsd,
      valuationUsd: plan.valuationUsd,
      submissionStatus: "APPROVED",
    });

    const companyOfficeIds: string[] = [];
    let hqOfficeId = "";
    for (const office of plan.offices) {
      officeSeq += 1;
      const officeId = `off_${pad(officeSeq)}`;
      companyOfficeIds.push(officeId);
      if (office.isHq) hqOfficeId = officeId;
      offices.push({
        id: officeId,
        companyId: plan.id,
        city: office.city,
        country: office.country,
        addressLine: `${office.area}, ${office.city}`,
        lat: office.lat,
        lng: office.lng,
        isHq: office.isHq,
      });
    }

    /*
      Every founder gets their own row even when two people share a name —
      there is a Harsh Jain at Groww and a different Harsh Jain at Dream11,
      and merging them would invent a person who founded both.
    */
    for (const founder of plan.founders) {
      founderSeq += 1;
      const founderId = `fdr_${pad(founderSeq)}`;
      founders.push({
        id: founderId,
        name: founder.name,
        linkedinUrl: `https://www.linkedin.com/in/${slugify(founder.name)}`,
        photoUrl: null,
      });
      companyFounders.push({ companyId: plan.id, founderId, title: founder.title });
    }

    if (plan.fundingStage !== "BOOTSTRAPPED") {
      for (const investor of rng.pickSome(investors, rng.int(2, 5))) {
        companyInvestors.push({
          companyId: plan.id,
          investorId: investor.id as string,
          round: plan.fundingStage,
        });
      }
    }

    /*
      A quiet company keeps a few roles it has already closed, so it still has
      a history and still shows up as a stone pin — but never an open one. A
      "not hiring" badge sitting next to two live vacancies reads as a bug.
    */
    const isHiring = plan.hiringStatus === "ACTIVELY_HIRING";
    const [minJobs, maxJobs] = JOB_COUNT_BY_STAGE[plan.fundingStage];
    const jobCount = isHiring ? rng.int(minJobs, maxJobs) : rng.int(0, 3);

    for (let i = 0; i < jobCount; i += 1) {
      jobSeq += 1;
      const department = rng.weighted(DEPARTMENTS.map((d) => [d, d.weight] as const));
      const seniority = rng.weighted(SENIORITY_WEIGHTS);
      const title = `${rng.pick(SENIORITY_PREFIXES[seniority])}${rng.pick(department.titles)}`;
      const workMode = rng.weighted(WORK_MODE_WEIGHTS);

      // Remote roles are not pinned to an office; the map surfaces them on the HQ.
      const officeId =
        workMode === "REMOTE"
          ? null
          : rng.pick(companyOfficeIds.length ? companyOfficeIds : [hqOfficeId]);

      /*
        Both ends of the band move. Anchoring the floor to the seniority band
        made every senior role at a company advertise the same minimum, which
        reads like generated data the moment you scan a list of them.
      */
      const band = SALARY_BANDS[seniority];
      const multiplier = SALARY_MULTIPLIER_BY_STAGE[plan.fundingStage];
      const hasSalary = rng.chance(0.85);
      const toLakh = (value: number) => Math.round((value * multiplier) / 100_000) * 100_000;
      const floor = rng.int(band.min, Math.round(band.min + (band.max - band.min) * 0.5));
      const ceiling = rng.int(Math.round(floor * 1.2), Math.round(band.max * 1.15));
      const salaryMin = hasSalary ? toLakh(floor) : null;
      const salaryMax = hasSalary ? toLakh(ceiling) : null;

      const postedAt = new Date(now - rng.int(0, 90) * 24 * 60 * 60 * 1000);
      // Drawn unconditionally so the RNG stream does not depend on hiring status.
      const closedByChance = rng.chance(0.08);

      jobs.push({
        id: `job_${pad(jobSeq, 5)}`,
        companyId: plan.id,
        officeId,
        departmentId: `dept_${department.slug}`,
        title,
        description: rng.pick(JOB_DESCRIPTION_TEMPLATES)(title, plan.name, department.name),
        workMode,
        seniority,
        salaryMin,
        salaryMax,
        currency: "INR",
        applyUrl: rng.chance(0.7) ? `${plan.website}/careers/${pad(jobSeq, 5)}` : null,
        status: isHiring && !closedByChance ? "OPEN" : "CLOSED",
        postedAt,
      });
    }
  }

  /*
    Two accounts so the demo can show both sides of the submission queue.
    The hash is filled in by the seed script, which is where argon2 lives.
  */
  const users: Prisma.UserCreateManyInput[] = [
    {
      id: "usr_admin",
      email: "admin@chowk.dev",
      name: "Admin",
      role: "ADMIN",
      authProvider: "PASSWORD",
      passwordHash: "",
    },
    {
      id: "usr_demo",
      email: "demo@chowk.dev",
      name: "Demo User",
      role: "USER",
      authProvider: "PASSWORD",
      passwordHash: "",
    },
  ];

  return {
    users,
    departments,
    investors,
    companies,
    offices,
    founders,
    companyFounders,
    companyInvestors,
    jobs,
  };
}
