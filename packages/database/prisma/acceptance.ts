import "../src/load-env";

import { PrismaClient } from "@prisma/client";
import { CITY_BOUNDS } from "./seed/localities";

/*
  Checks the seeded database against the things the demo depends on. A seed
  that silently produces zero Design jobs, or drops an office in the sea, is
  worse than a seed that fails loudly — every screen downstream would look
  broken for no visible reason.

  Run with `pnpm db:seed:check`.
*/

const prisma = new PrismaClient();

let failures = 0;

function check(label: string, passed: boolean, detail: string) {
  const mark = passed ? "PASS" : "FAIL";
  if (!passed) failures += 1;
  console.log(`  [${mark}] ${label} — ${detail}`);
}

function checkRange(label: string, value: number, min: number, max: number) {
  check(label, value >= min && value <= max, `${value} (expected ${min}–${max})`);
}

const VISIBLE_COMPANY = { submissionStatus: "APPROVED", deletedAt: null } as const;
const OPEN_JOB = { status: "OPEN", deletedAt: null } as const;

async function main() {
  console.log("\nRow counts");
  const [companies, offices, jobs, departments, investors, founders, users] = await Promise.all([
    prisma.company.count(),
    prisma.office.count(),
    prisma.job.count(),
    prisma.department.count(),
    prisma.investor.count(),
    prisma.founder.count(),
    prisma.user.count(),
  ]);
  checkRange("companies", companies, 85, 95);
  checkRange("offices", offices, 95, 145);
  checkRange("jobs", jobs, 1300, 1800);
  check("departments", departments === 15, `${departments} (expected 15)`);
  check("investors", investors === 40, `${investors} (expected 40)`);
  checkRange("founders", founders, 180, 320);
  check("users", users === 2, `${users} (expected 2)`);

  console.log("\nEvery facet dimension has at least 2 non-empty buckets");

  const [byHiring, byStage] = await Promise.all([
    prisma.company.groupBy({
      by: ["hiringStatus"],
      where: VISIBLE_COMPANY,
      _count: { _all: true },
    }),
    prisma.company.groupBy({
      by: ["fundingStage"],
      where: VISIBLE_COMPANY,
      _count: { _all: true },
    }),
  ]);
  check("hiringStatus", byHiring.length >= 2, `${byHiring.length} buckets`);
  check("fundingStage", byStage.length >= 2, `${byStage.length} buckets`);

  const [byCountry, byCity] = await Promise.all([
    prisma.office.groupBy({
      by: ["country"],
      where: { deletedAt: null, company: VISIBLE_COMPANY },
      _count: { _all: true },
    }),
    prisma.office.groupBy({
      by: ["city"],
      where: { deletedAt: null, company: VISIBLE_COMPANY },
      _count: { _all: true },
    }),
  ]);
  check(
    "country",
    byCountry.length >= 2,
    `${byCountry.length} buckets: ${byCountry.map((c) => c.country).join(", ")}`,
  );
  check("city", byCity.length >= 2, `${byCity.length} buckets`);

  const [byWorkMode, byDepartment] = await Promise.all([
    prisma.job.groupBy({
      by: ["workMode"],
      where: { ...OPEN_JOB, company: VISIBLE_COMPANY },
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ["departmentId"],
      where: { ...OPEN_JOB, company: VISIBLE_COMPANY },
      _count: { _all: true },
    }),
  ]);
  check("workMode", byWorkMode.length >= 2, `${byWorkMode.length} buckets`);
  check("department", byDepartment.length >= 2, `${byDepartment.length} buckets`);

  const investorBuckets = await prisma.companyInvestor.groupBy({
    by: ["investorId"],
    _count: { _all: true },
  });
  check("investors", investorBuckets.length >= 2, `${investorBuckets.length} buckets`);

  console.log("\nEvery department has at least one open job");
  const allDepartments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const openByDepartment = new Map(byDepartment.map((row) => [row.departmentId, row._count._all]));
  const emptyDepartments = allDepartments.filter((d) => !openByDepartment.get(d.id));
  check(
    "coverage",
    emptyDepartments.length === 0,
    emptyDepartments.length === 0
      ? `all ${allDepartments.length} departments have open roles`
      : `empty: ${emptyDepartments.map((d) => d.name).join(", ")}`,
  );

  console.log("\nOffices sit inside their own city");
  const sampled = await prisma.office.findMany({ take: 5, orderBy: { id: "asc" } });
  for (const office of sampled) {
    const bounds = CITY_BOUNDS[office.city];
    const inside =
      !!bounds &&
      office.lat >= bounds.minLat &&
      office.lat <= bounds.maxLat &&
      office.lng >= bounds.minLng &&
      office.lng <= bounds.maxLng;
    check(
      `${office.city} (${office.id})`,
      inside,
      `${office.lat.toFixed(4)}, ${office.lng.toFixed(4)}`,
    );
  }

  // The five sampled rows above are the PRD's requirement; this catches the rest.
  const allOffices = await prisma.office.findMany({
    select: { id: true, city: true, lat: true, lng: true },
  });
  const strays = allOffices.filter((office) => {
    const bounds = CITY_BOUNDS[office.city];
    if (!bounds) return true;
    return (
      office.lat < bounds.minLat ||
      office.lat > bounds.maxLat ||
      office.lng < bounds.minLng ||
      office.lng > bounds.maxLng
    );
  });
  check(
    "all offices in bounds",
    strays.length === 0,
    `${strays.length} stray of ${allOffices.length}`,
  );

  console.log("\nData shape the UI relies on");
  const closedJobs = await prisma.job.count({ where: { status: "CLOSED" } });
  const closedShare = (closedJobs / jobs) * 100;
  checkRange("closed jobs %", Math.round(closedShare), 4, 13);

  const remoteJobs = await prisma.job.count({ where: { workMode: "REMOTE" } });
  checkRange("remote jobs %", Math.round((remoteJobs / jobs) * 100), 10, 20);

  const withApplyUrl = await prisma.job.count({ where: { applyUrl: { not: null } } });
  checkRange("external apply %", Math.round((withApplyUrl / jobs) * 100), 62, 78);

  const notHiring = await prisma.company.count({ where: { hiringStatus: "NOT_HIRING" } });
  checkRange("not-hiring companies %", Math.round((notHiring / companies) * 100), 5, 26);

  const multiOffice = await prisma.company.count({ where: { offices: { some: { isHq: false } } } });
  checkRange("companies with 2+ offices", multiOffice, 10, 45);

  const foreignOffices = await prisma.office.count({ where: { country: { not: "India" } } });
  checkRange("overseas offices", foreignOffices, 3, 20);

  const bootstrappedWithInvestors = await prisma.company.count({
    where: { fundingStage: "BOOTSTRAPPED", investors: { some: {} } },
  });
  check(
    "bootstrapped have no investors",
    bootstrappedWithInvestors === 0,
    `${bootstrappedWithInvestors} found`,
  );

  const quietWithOpenRoles = await prisma.company.count({
    where: { hiringStatus: "NOT_HIRING", jobs: { some: { status: "OPEN", deletedAt: null } } },
  });
  check(
    "not-hiring companies have no open roles",
    quietWithOpenRoles === 0,
    `${quietWithOpenRoles} contradicting`,
  );

  const jobsWithoutOffice = await prisma.job.count({ where: { officeId: null } });
  const remoteCount = await prisma.job.count({ where: { workMode: "REMOTE" } });
  check(
    "unpinned jobs are exactly the remote ones",
    jobsWithoutOffice === remoteCount,
    `${jobsWithoutOffice} unpinned vs ${remoteCount} remote`,
  );

  console.log(
    failures === 0
      ? "\nSeed acceptance passed.\n"
      : `\nSeed acceptance FAILED: ${failures} check(s).\n`,
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
