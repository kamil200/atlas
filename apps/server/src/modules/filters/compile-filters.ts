import type { Prisma } from "@chowk/database";
import type { FacetDimension, FilterParams } from "@chowk/schema";

/*
  Every endpoint that takes filters compiles them here. If this logic ever
  forked, the map, the list, and the facet counts would quietly disagree with
  each other and there would be no single place to fix it.

  Which dimension applies where:
    company-level   hiringStatus, fundingStage, investorId
    office-level    country, city
    job-level       workMode, department

  Repeating a param ORs inside a dimension; separate dimensions AND together.
*/

/* Public browsing never shows pending submissions or soft-deleted rows. */
export const VISIBLE_COMPANY: Prisma.CompanyWhereInput = {
  submissionStatus: "APPROVED",
  deletedAt: null,
};

export const VISIBLE_JOB: Prisma.JobWhereInput = {
  status: "OPEN",
  deletedAt: null,
};

export type CompileOptions = {
  /** Leave this dimension out — facet counts need their own filter ignored. */
  omit?: FacetDimension;
};

/* The facet is called "investors"; the query param that drives it is investorId. */
function filterKeyFor(dimension: FacetDimension): keyof FilterParams {
  return dimension === "investors" ? "investorId" : dimension;
}

function withoutDimension(filters: FilterParams, omit?: FacetDimension): FilterParams {
  if (!omit) return filters;
  const { [filterKeyFor(omit)]: _dropped, ...rest } = filters;
  return rest;
}

/*
  A blank value is not a filter. `?city=` arrives as [""], which would otherwise
  compile to `city IN ('')` and zero out the whole result set for anyone on a
  stale or hand-edited URL.
*/
function values<T extends string>(raw: readonly T[] | undefined): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => value.trim() as T).filter((value) => value.length > 0);
}

function hasValues<T extends string>(raw: readonly T[] | undefined): boolean {
  return values(raw).length > 0;
}

/*
  Prisma's `contains` compiles to LIKE without escaping, so a query of "_" or
  "%" would match every row instead of none. Someone searching "50% off" or
  "node_modules" should get an empty state, not the entire dataset.
*/
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/** True when a filter constrains jobs rather than companies or offices. */
export function hasJobLevelFilter(filters: FilterParams): boolean {
  return hasValues(filters.workMode) || hasValues(filters.department);
}

/* workMode and department, without the visibility base. */
function jobLevelClause(filters: FilterParams): Prisma.JobWhereInput | null {
  const clause: Prisma.JobWhereInput = {};
  let active = false;

  if (hasValues(filters.workMode)) {
    clause.workMode = { in: values(filters.workMode) };
    active = true;
  }
  if (hasValues(filters.department)) {
    clause.department = { slug: { in: values(filters.department) } };
    active = true;
  }

  return active ? clause : null;
}

/* country and city, as a constraint on a single office row. */
function officeLocationClause(filters: FilterParams): Prisma.OfficeWhereInput | null {
  const clause: Prisma.OfficeWhereInput = { deletedAt: null };
  let active = false;

  if (hasValues(filters.country)) {
    clause.country = { in: values(filters.country) };
    active = true;
  }
  if (hasValues(filters.city)) {
    clause.city = { in: values(filters.city) };
    active = true;
  }

  return active ? clause : null;
}

export function compileCompanyWhere(
  filters: FilterParams,
  options: CompileOptions = {},
): Prisma.CompanyWhereInput {
  const active = withoutDimension(filters, options.omit);
  const and: Prisma.CompanyWhereInput[] = [VISIBLE_COMPANY];

  if (hasValues(active.hiringStatus)) {
    and.push({ hiringStatus: { in: values(active.hiringStatus) } });
  }
  if (hasValues(active.fundingStage)) {
    and.push({ fundingStage: { in: values(active.fundingStage) } });
  }
  if (hasValues(active.investorId)) {
    and.push({ investors: { some: { investorId: { in: values(active.investorId) } } } });
  }

  const location = officeLocationClause(active);
  if (location) and.push({ offices: { some: location } });

  // A job-level filter keeps a company only if one open job matches all of it.
  const jobLevel = jobLevelClause(active);
  if (jobLevel) and.push({ jobs: { some: { ...VISIBLE_JOB, ...jobLevel } } });

  const q = active.q?.trim();
  if (q) {
    const term = escapeLike(q);
    and.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { tagline: { contains: term, mode: "insensitive" } },
        { jobs: { some: { ...VISIBLE_JOB, title: { contains: term, mode: "insensitive" } } } },
      ],
    });
  }

  return { AND: and };
}

export function compileJobWhere(
  filters: FilterParams,
  options: CompileOptions = {},
): Prisma.JobWhereInput {
  const active = withoutDimension(filters, options.omit);
  const and: Prisma.JobWhereInput[] = [VISIBLE_JOB];

  // Company-level dimensions and visibility ride along on the relation.
  and.push({ company: compileCompanyWhere(filters, options) });

  const jobLevel = jobLevelClause(active);
  if (jobLevel) and.push(jobLevel);

  /*
    A job's location is the office it is pinned to. Remote jobs are pinned
    nowhere, so they count as sitting at the company's head office — the same
    rule the map uses when it shows remote roles on the HQ pin.
  */
  const location = officeLocationClause(active);
  if (location) {
    and.push({
      OR: [
        { office: location },
        { officeId: null, company: { offices: { some: { ...location, isHq: true } } } },
      ],
    });
  }

  const q = active.q?.trim();
  if (q) {
    const term = escapeLike(q);
    and.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { company: { name: { contains: term, mode: "insensitive" } } },
      ],
    });
  }

  return { AND: and };
}

/*
  Offices of matching companies, narrowed to the ones in the selected place.
  Drives both the map pins and the country/city facet counts.

  Once a job-level filter is on, an office only earns a pin if it actually holds
  a matching role. Remote roles are pinned nowhere, so they count toward the head
  office — the same rule the map uses when it draws them on the HQ. Both the pins
  and the counts read this one clause, so a facet can never promise a pin the map
  then refuses to draw.
*/
export function compileOfficeWhere(
  filters: FilterParams,
  options: CompileOptions = {},
): Prisma.OfficeWhereInput {
  const active = withoutDimension(filters, options.omit);
  const location = officeLocationClause(active);
  const jobLevel = jobLevelClause(active);

  return {
    deletedAt: null,
    company: compileCompanyWhere(filters, options),
    ...(location ?? {}),
    ...(jobLevel
      ? {
          OR: [
            { jobs: { some: { ...VISIBLE_JOB, ...jobLevel } } },
            {
              isHq: true,
              company: { jobs: { some: { ...VISIBLE_JOB, ...jobLevel, officeId: null } } },
            },
          ],
        }
      : {}),
  };
}
