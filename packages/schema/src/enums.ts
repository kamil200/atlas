/*
  These mirror the Prisma enums in @chowk/database. They live here as plain
  objects so the browser bundle never has to import the Prisma client just to
  know that "REMOTE" is a work mode. A test in apps/server asserts the two
  lists stay identical.
*/

export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AuthProvider = {
  PASSWORD: "PASSWORD",
  GOOGLE: "GOOGLE",
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const WorkMode = {
  ONSITE: "ONSITE",
  HYBRID: "HYBRID",
  REMOTE: "REMOTE",
} as const;
export type WorkMode = (typeof WorkMode)[keyof typeof WorkMode];

export const HiringStatus = {
  ACTIVELY_HIRING: "ACTIVELY_HIRING",
  NOT_HIRING: "NOT_HIRING",
} as const;
export type HiringStatus = (typeof HiringStatus)[keyof typeof HiringStatus];

export const FundingStage = {
  BOOTSTRAPPED: "BOOTSTRAPPED",
  PRE_SEED: "PRE_SEED",
  SEED: "SEED",
  SERIES_A: "SERIES_A",
  SERIES_B: "SERIES_B",
  SERIES_C: "SERIES_C",
  SERIES_D_PLUS: "SERIES_D_PLUS",
  PUBLIC: "PUBLIC",
} as const;
export type FundingStage = (typeof FundingStage)[keyof typeof FundingStage];

export const SubmissionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const ApplicationStatus = {
  SAVED: "SAVED",
  APPLIED: "APPLIED",
  INTERVIEWING: "INTERVIEWING",
  OFFER: "OFFER",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const ApplyMethod = {
  SIMPLE_APPLY: "SIMPLE_APPLY",
  EXTERNAL: "EXTERNAL",
} as const;
export type ApplyMethod = (typeof ApplyMethod)[keyof typeof ApplyMethod];

export const JobStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/* Labels shown in filter rows and chips. Kept next to the values they name. */
export const FUNDING_STAGE_LABELS: Record<FundingStage, string> = {
  BOOTSTRAPPED: "Bootstrapped",
  PRE_SEED: "Pre-seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B: "Series B",
  SERIES_C: "Series C",
  SERIES_D_PLUS: "Series D+",
  PUBLIC: "Public",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const HIRING_STATUS_LABELS: Record<HiringStatus, string> = {
  ACTIVELY_HIRING: "Actively hiring",
  NOT_HIRING: "Not hiring",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
