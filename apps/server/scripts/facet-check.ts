import type { FacetsResponse } from "@atlas/schema";
import { buildApp } from "../src/app";

/*
  Proves the facet counts are honest. The trap this catches: if a dimension is
  counted with its own filter applied, ticking one value drops its siblings to
  zero and the panel becomes a dead end you cannot back out of.

  Run with `pnpm --filter @atlas/server facets:check`.
*/

const app = await buildApp();

let failures = 0;

function check(label: string, passed: boolean, detail: string) {
  if (!passed) failures += 1;
  console.log(`  [${passed ? "PASS" : "FAIL"}] ${label} — ${detail}`);
}

async function get<T>(url: string): Promise<T> {
  const response = await app.inject({ method: "GET", url });
  const body = response.json();
  if (!body.success) throw new Error(`${url} failed: ${JSON.stringify(body.error)}`);
  return body.data as T;
}

function sum(buckets: { count: number }[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

async function totals(query: string) {
  const [companies, jobs, map] = await Promise.all([
    get<{ total: number }>(`/api/companies?pageSize=1${query}`),
    get<{ total: number }>(`/api/jobs?pageSize=1${query}`),
    get<{ offices: { openJobCount: number }[] }>(`/api/companies/map${query.replace("&", "?")}`),
  ]);
  return { companies: companies.total, jobs: jobs.total, offices: map.offices };
}

async function run() {
  console.log("\nUnfiltered: every dimension sums to its own population");
  const facets = await get<FacetsResponse>("/api/facets");
  const base = await totals("");

  check(
    "hiringStatus sums to all companies",
    sum(facets.hiringStatus) === base.companies,
    `${sum(facets.hiringStatus)} vs ${base.companies}`,
  );
  check(
    "fundingStage sums to all companies",
    sum(facets.fundingStage) === base.companies,
    `${sum(facets.fundingStage)} vs ${base.companies}`,
  );
  check(
    "workMode sums to all open jobs",
    sum(facets.workMode) === base.jobs,
    `${sum(facets.workMode)} vs ${base.jobs}`,
  );
  check(
    "department sums to all open jobs",
    sum(facets.department) === base.jobs,
    `${sum(facets.department)} vs ${base.jobs}`,
  );
  check(
    "country sums to all offices",
    sum(facets.country) === base.offices.length,
    `${sum(facets.country)} vs ${base.offices.length}`,
  );
  check(
    "city sums to all offices",
    sum(facets.city) === base.offices.length,
    `${sum(facets.city)} vs ${base.offices.length}`,
  );

  // Every open job is counted on exactly one pin: its office, or its company's HQ if remote.
  const pinnedTotal = base.offices.reduce((total, office) => total + office.openJobCount, 0);
  check(
    "map pin counts sum to all open jobs",
    pinnedTotal === base.jobs,
    `${pinnedTotal} vs ${base.jobs}`,
  );

  console.log("\nSelecting a value must not zero out its siblings");
  const remote = await get<FacetsResponse>("/api/facets?workMode=REMOTE");
  const otherModes = remote.workMode.filter((b) => b.value !== "REMOTE");
  check(
    "work modes survive picking Remote",
    otherModes.every((b) => b.count > 0),
    otherModes.map((b) => `${b.value}=${b.count}`).join(" "),
  );
  check(
    "work mode counts are unchanged by the pick",
    JSON.stringify(remote.workMode) === JSON.stringify(facets.workMode),
    "own dimension ignores its own filter",
  );

  const design = await get<FacetsResponse>("/api/facets?department=design");
  const otherDepartments = design.department.filter((b) => b.value !== "design");
  check(
    "departments survive picking Design",
    otherDepartments.every((b) => b.count > 0),
    `${otherDepartments.length} siblings still counted`,
  );

  console.log("\nOther dimensions do narrow when one is selected");
  const remoteJobs = await get<{ total: number }>("/api/jobs?pageSize=1&workMode=REMOTE");
  check(
    "department sums to the remote job count",
    sum(remote.department) === remoteJobs.total,
    `${sum(remote.department)} vs ${remoteJobs.total}`,
  );
  check(
    "remote is a strict subset of everything",
    remoteJobs.total < base.jobs,
    `${remoteJobs.total} < ${base.jobs}`,
  );

  console.log("\nCombining dimensions ANDs them");
  const combined = await get<{ total: number }>(
    "/api/jobs?pageSize=1&workMode=REMOTE&department=design",
  );
  const designTotal = await get<{ total: number }>("/api/jobs?pageSize=1&department=design");
  check(
    "remote+design is no bigger than either alone",
    combined.total <= Math.min(remoteJobs.total, designTotal.total),
    `${combined.total} <= min(${remoteJobs.total}, ${designTotal.total})`,
  );

  const remoteOr = await get<{ total: number }>(
    "/api/jobs?pageSize=1&workMode=REMOTE&workMode=HYBRID",
  );
  const hybridTotal = await get<{ total: number }>("/api/jobs?pageSize=1&workMode=HYBRID");
  check(
    "repeating a param ORs inside the dimension",
    remoteOr.total === remoteJobs.total + hybridTotal.total,
    `${remoteOr.total} = ${remoteJobs.total} + ${hybridTotal.total}`,
  );

  console.log("\nHidden rows never leak");
  const pending = await app.prisma.company.count({
    where: { submissionStatus: { not: "APPROVED" } },
  });
  const listed = await get<{ total: number }>("/api/companies?pageSize=1");
  const allCompanies = await app.prisma.company.count();
  check(
    "pending submissions stay off the public list",
    listed.total === allCompanies - pending,
    `${listed.total} listed, ${pending} pending, ${allCompanies} total`,
  );

  const closedJobs = await app.prisma.job.count({ where: { status: "CLOSED" } });
  const allJobs = await app.prisma.job.count();
  check(
    "closed roles stay out of the job list",
    base.jobs === allJobs - closedJobs,
    `${base.jobs} open of ${allJobs}`,
  );

  console.log(
    failures === 0 ? "\nFacet assertions passed.\n" : `\nFacet assertions FAILED: ${failures}.\n`,
  );
  if (failures > 0) process.exitCode = 1;
}

try {
  await run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
}
