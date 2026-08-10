import type { Prisma } from "@atlas/database";
import type {
  ApplicationDto,
  CompanyDetail,
  CompanySummary,
  JobDetail,
  JobSummary,
  OfficeDto,
  ResumeDto,
  SubmissionWithCompany,
  UserDto,
} from "@atlas/schema";

/*
  Prisma rows become DTOs here and nowhere else. Two things must happen at this
  boundary: BigInt money becomes a number, because JSON.stringify throws on a
  BigInt, and Date becomes an ISO string.
*/

/* USD amounts are far below 2^53, so a plain number is safe. */
function money(value: bigint | null): number | null {
  return value === null ? null : Number(value);
}

function iso(value: Date): string {
  return value.toISOString();
}

function isoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: iso(user.createdAt),
  };
}

/* The relations every job DTO needs loaded. */
export const jobInclude = {
  company: { select: { id: true, slug: true, name: true, logoUrl: true } },
  department: { select: { name: true, slug: true } },
  office: { select: { city: true, country: true } },
} satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

export function toJobSummary(job: JobWithRelations): JobSummary {
  return {
    id: job.id,
    title: job.title,
    companyId: job.company.id,
    companySlug: job.company.slug,
    companyName: job.company.name,
    companyLogoUrl: job.company.logoUrl,
    departmentName: job.department.name,
    departmentSlug: job.department.slug,
    city: job.office?.city ?? null,
    country: job.office?.country ?? null,
    workMode: job.workMode,
    seniority: job.seniority,
    skills: job.skills,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    status: job.status,
    hasExternalApply: job.applyUrl !== null,
    postedAt: iso(job.postedAt),
  };
}

export function toJobDetail(job: JobWithRelations): JobDetail {
  return {
    ...toJobSummary(job),
    description: job.description,
    applyUrl: job.applyUrl,
  };
}

export const companyDetailInclude = {
  offices: { where: { deletedAt: null }, orderBy: [{ isHq: "desc" }, { city: "asc" }] },
  founders: { include: { founder: true } },
  investors: { include: { investor: true } },
} satisfies Prisma.CompanyInclude;

type CompanyWithRelations = Prisma.CompanyGetPayload<{ include: typeof companyDetailInclude }>;

export function toCompanyDetail(
  company: CompanyWithRelations,
  jobs: JobSummary[],
  officeJobCounts: Map<string, number>,
): CompanyDetail {
  const offices: OfficeDto[] = company.offices.map((office) => ({
    id: office.id,
    city: office.city,
    country: office.country,
    addressLine: office.addressLine,
    lat: office.lat,
    lng: office.lng,
    isHq: office.isHq,
    openJobCount: officeJobCounts.get(office.id) ?? 0,
  }));

  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    tagline: company.tagline,
    description: company.description,
    website: company.website,
    linkedinUrl: company.linkedinUrl,
    twitterUrl: company.twitterUrl,
    industries: company.industries,
    businessModel: company.businessModel,
    foundedYear: company.foundedYear,
    employeeCount: company.employeeCount,
    hiringStatus: company.hiringStatus,
    fundingStage: company.fundingStage,
    totalFundingUsd: money(company.totalFundingUsd),
    valuationUsd: money(company.valuationUsd),
    isVerified: company.isVerified,
    offices,
    founders: company.founders.map((link) => ({
      id: link.founder.id,
      name: link.founder.name,
      // The title belongs to the join row: the same person can be CEO here and an advisor there.
      title: link.title,
      bio: link.founder.bio,
      linkedinUrl: link.founder.linkedinUrl,
      twitterUrl: link.founder.twitterUrl,
      githubUrl: link.founder.githubUrl,
      photoUrl: link.founder.photoUrl,
    })),
    investors: company.investors.map((link) => ({
      id: link.investor.id,
      name: link.investor.name,
      logoUrl: link.investor.logoUrl,
      website: link.investor.website,
      round: link.round,
    })),
    jobs,
  };
}

export const companySummaryInclude = {
  offices: { where: { deletedAt: null }, select: { city: true } },
} satisfies Prisma.CompanyInclude;

type CompanyForSummary = Prisma.CompanyGetPayload<{ include: typeof companySummaryInclude }>;

export function toCompanySummary(company: CompanyForSummary, openJobCount: number): CompanySummary {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    logoUrl: company.logoUrl,
    tagline: company.tagline,
    industries: company.industries,
    businessModel: company.businessModel,
    hiringStatus: company.hiringStatus,
    fundingStage: company.fundingStage,
    employeeCount: company.employeeCount,
    isVerified: company.isVerified,
    cities: [...new Set(company.offices.map((office) => office.city))].sort(),
    openJobCount,
  };
}

export function toResumeDto(resume: {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isDefault: boolean;
  createdAt: Date;
}): ResumeDto {
  return {
    id: resume.id,
    filename: resume.filename,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
    isDefault: resume.isDefault,
    createdAt: iso(resume.createdAt),
  };
}

export const submissionInclude = {
  company: {
    select: {
      name: true,
      slug: true,
      submissionStatus: true,
      _count: { select: { offices: true } },
    },
  },
  submittedBy: { select: { name: true, email: true } },
} satisfies Prisma.CompanySubmissionInclude;

type SubmissionWithRelations = Prisma.CompanySubmissionGetPayload<{
  include: typeof submissionInclude;
}>;

export function toSubmissionDto(submission: SubmissionWithRelations): SubmissionWithCompany {
  return {
    id: submission.id,
    companyId: submission.companyId,
    companyName: submission.company.name,
    companySlug: submission.company.slug,
    submissionStatus: submission.company.submissionStatus,
    submittedByName: submission.submittedBy.name,
    submittedByEmail: submission.submittedBy.email,
    officeCount: submission.company._count.offices,
    adminNote: submission.adminNote,
    createdAt: iso(submission.createdAt),
    reviewedAt: isoOrNull(submission.reviewedAt),
  };
}

export function toApplicationDto(
  application: Prisma.ApplicationGetPayload<{ include: { job: { include: typeof jobInclude } } }>,
): ApplicationDto {
  return {
    id: application.id,
    jobId: application.jobId,
    status: application.status,
    applyMethod: application.applyMethod,
    resumeId: application.resumeId,
    coverNote: application.coverNote,
    appliedAt: isoOrNull(application.appliedAt),
    createdAt: iso(application.createdAt),
    updatedAt: iso(application.updatedAt),
    job: toJobSummary(application.job),
  };
}
